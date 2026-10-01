import fs from 'node:fs';
import path from 'node:path';
import { autoTopics, ensureBridge, registerAgent } from './agent.mjs';
import { createApi, requireAzureLogin } from './api.mjs';
import {
  acquirePidFile,
  ensureStateDir,
  findSessionEntry,
  hubHome,
  isEnabled,
  log,
  pidAlive,
  readText,
  releasePidFile,
  removeFile,
  sessionInfo,
  spawnDetached,
  statePath,
  writeJson,
} from './session.mjs';

export const AUTO_ENABLE_RETRY_MS = 5 * 60 * 1000;

export function autoEnableOn(env = process.env) {
  return /^(true|1|yes)$/i.test(String(env.AGENT_HUB_AUTO_ENABLE || '').trim());
}

// The registry's `kind` is authoritative; without an entry, only an attended session counts.
export function isInteractive(sid, env = process.env) {
  const entry = findSessionEntry(sid);
  if (typeof entry?.kind === 'string') return entry.kind === 'interactive';
  return env.CLAUDE_CODE_SESSION_ATTENDED === '1';
}

// /clear gives the same Claude process a new session id, so an opt-out is also kept per process.
function optOutPidFile(pid) {
  return path.join(hubHome(), 'opted-out', String(pid));
}

export function isOptedOut(sid) {
  return fs.existsSync(statePath(sid, 'opted-out'));
}

export function markOptedOut(sid, pid = sessionInfo(sid).pid) {
  ensureStateDir(sid);
  fs.writeFileSync(statePath(sid, 'opted-out'), `${new Date().toISOString()}\n`);
  if (!pid) return;
  fs.mkdirSync(path.dirname(optOutPidFile(pid)), { recursive: true, mode: 0o700 });
  fs.writeFileSync(optOutPidFile(pid), `${sid}\n`);
}

export function clearOptOut(sid, pid = sessionInfo(sid).pid) {
  removeFile(statePath(sid, 'opted-out'));
  if (pid) removeFile(optOutPidFile(pid));
}

// A session started by /clear inherits the opt-out of the session it replaced in the same process.
function inheritOptOut(sid) {
  const pid = sessionInfo(sid).pid;
  if (!pid) return false;
  const file = optOutPidFile(pid);
  if (!fs.existsSync(file)) return false;
  if (!pidAlive(pid)) {
    removeFile(file);
    return false;
  }
  markOptedOut(sid, pid);
  return true;
}

export async function enableSession(sid, { cwd, topics = [], env = process.env, proceed = () => true } = {}) {
  if (!env.AGENT_HUB_DEV_USER) await requireAzureLogin();
  const api = createApi();
  const { agent, meta } = await registerAgent(api, sid, { cwd });
  const wanted = [...new Set([...autoTopics(meta), ...topics])];
  let subscribed = wanted;
  if (wanted.length) subscribed = (await api.subscribe(agent.agent_id, wanted))?.topics || wanted;
  agent.topics = [...new Set([...(agent.topics || []), ...wanted])];
  writeJson(statePath(sid, 'agent.json'), agent);
  if (!proceed()) return null;
  fs.writeFileSync(statePath(sid, 'status'), 'busy\n');
  fs.writeFileSync(statePath(sid, 'enabled'), `${new Date().toISOString()}\n`);
  const { pid, started } = ensureBridge(sid);
  log(sid, `enabled as ${agent.name} (${agent.agent_id})`);
  return { agent, subscribed, pid, started, baseUrl: api.baseUrl };
}

/**
 * Starts a background enable for a SessionStart or UserPromptSubmit hook when auto-enable is on.
 * Returns why it did or didn't, for the log and tests; it never throws for the expected cases.
 */
export function maybeAutoEnable(event, sid, input, { env = process.env, spawn = spawnDetached, now = Date.now } = {}) {
  if (!autoEnableOn(env)) return 'off';
  if (event !== 'SessionStart' && event !== 'UserPromptSubmit') return 'not-applicable';
  if (isEnabled(sid)) return 'enabled';
  if (isOptedOut(sid)) return 'opted-out';
  if (!isInteractive(sid, env)) return 'not-interactive';
  if (event === 'SessionStart' && input.source === 'clear' && inheritOptOut(sid)) {
    log(sid, 'auto-enable: skipped, the session before /clear opted out');
    return 'opted-out';
  }
  const lastFile = statePath(sid, 'auto-enable.last');
  if (event === 'UserPromptSubmit') {
    const last = Number.parseInt(readText(lastFile), 10);
    if (Number.isFinite(last) && now() - last < AUTO_ENABLE_RETRY_MS) return 'too-soon';
  }
  ensureStateDir(sid);
  fs.writeFileSync(lastFile, `${now()}\n`);
  const cwd = typeof input.cwd === 'string' && input.cwd ? input.cwd : sessionInfo(sid, env).cwd;
  const args = ['auto-enable', '--session', sid];
  if (cwd) args.push('--cwd', cwd);
  spawn(sid, args, { env });
  return 'spawned';
}

// The detached half of auto-enable: quiet, one log line on failure, never a non-zero exit.
export async function runAutoEnable({ sid, cwd, env = process.env }) {
  ensureStateDir(sid);
  const lock = statePath(sid, 'auto-enable.lock');
  if (!acquirePidFile(lock)) return;
  try {
    if (isEnabled(sid) || isOptedOut(sid)) return;
    const done = await enableSession(sid, { cwd, env, proceed: () => !isOptedOut(sid) && !isEnabled(sid) });
    if (done) removeFile(statePath(sid, 'auto-enable.last'));
  } catch (e) {
    log(sid, `auto-enable failed, retrying on a prompt after ${AUTO_ENABLE_RETRY_MS / 60000} minutes: ${String(e.message).replace(/\s+/g, ' ').trim()}`);
  } finally {
    releasePidFile(lock);
  }
}
