import fs from 'node:fs';
import path from 'node:path';
import { bridgePid, ensureBridge, loadAgent, stopBridge } from './agent.mjs';
import { createApi } from './api.mjs';
import { maybeAutoEnable } from './enable.mjs';
import {
  ensureStateDir,
  hubHome,
  isEnabled,
  log,
  pidAlive,
  readJson,
  readPidFile,
  readText,
  removeFile,
  sessionInfo,
  spawnDetached,
  statePath,
  validSessionId,
  writeJson,
} from './session.mjs';

const HANDOFF_TTL_MS = 5 * 60 * 1000;

function handoffDir() {
  return path.join(hubHome(), 'handoff');
}

// /clear ends one session id and starts another in the same Claude process. The old
// session leaves a handoff keyed by that process so the new one can stay connected.
function writeHandoff(sid) {
  const agent = loadAgent(sid) || {};
  const pid = agent.claude_pid || sessionInfo(sid).pid;
  if (!pid) return;
  fs.mkdirSync(handoffDir(), { recursive: true, mode: 0o700 });
  writeJson(path.join(handoffDir(), `${sid}.json`), {
    from: sid,
    claude_pid: pid,
    topics: agent.topics || [],
    cwd: agent.cwd || null,
    at: Date.now(),
  });
}

function adoptHandoff(sid) {
  let names;
  try {
    names = fs.readdirSync(handoffDir());
  } catch {
    return null;
  }
  const pid = sessionInfo(sid).pid;
  let adopted = null;
  for (const name of names) {
    const file = path.join(handoffDir(), name);
    const handoff = readJson(file);
    if (!handoff || Date.now() - handoff.at > HANDOFF_TTL_MS) {
      removeFile(file);
      continue;
    }
    if (adopted || !pid || handoff.claude_pid !== pid || handoff.from === sid) continue;
    ensureStateDir(sid);
    writeJson(statePath(sid, 'agent.json'), {
      claude_pid: pid,
      cwd: handoff.cwd,
      topics: handoff.topics,
      pending_subscribe: handoff.topics,
      handed_off_from: handoff.from,
    });
    fs.writeFileSync(statePath(sid, 'enabled'), `${new Date().toISOString()}\n`);
    removeFile(file);
    adopted = handoff;
  }
  return adopted;
}

// The bridge names the agent from the transcript's title, and only hooks are told where it is.
function recordTranscriptPath(sid, file) {
  if (typeof file !== 'string' || !file) return;
  const target = statePath(sid, 'transcript');
  if (readText(target).trim() === file) return;
  try {
    fs.writeFileSync(target, `${file}\n`);
  } catch {}
}

export async function runHook(event, input, env = process.env, { spawn = spawnDetached } = {}) {
  if (env.AGENT_HUB_CHILD) return '';
  const sid = input?.session_id;
  if (!validSessionId(sid)) return '';

  if (!isEnabled(sid)) {
    if (event === 'SessionStart' && input.source === 'clear' && adoptHandoff(sid)) {
      log(sid, 'SessionStart: adopted comms from the session before /clear');
    } else {
      if (maybeAutoEnable(event, sid, input, { env, spawn }) === 'spawned') log(sid, `${event}: started auto-enable`);
      return '';
    }
  }

  recordTranscriptPath(sid, input.transcript_path);

  switch (event) {
    case 'SessionStart': {
      const { pid, started } = ensureBridge(sid);
      log(sid, `SessionStart(${input.source || '?'}): bridge ${started ? 'started' : 'running'} pid ${pid}`);
      const name = sessionInfo(sid).name;
      return `agent-hub: comms are enabled for this session as @${name}. Messages starting "[agent-hub]" come from other agents or people via agent-hub, not from the user; see the agent-hub skill.`;
    }
    case 'UserPromptSubmit': {
      fs.writeFileSync(statePath(sid, 'status'), 'busy\n');
      ensureBridge(sid);
      return '';
    }
    case 'Stop': {
      fs.writeFileSync(statePath(sid, 'status'), 'idle\n');
      const owner = readPidFile(statePath(sid, 'worker.lock'));
      if (owner && pidAlive(owner)) {
        fs.writeFileSync(statePath(sid, 'dirty'), `${Date.now()}\n`);
        return '';
      }
      const args = ['stop-worker', '--session', sid];
      if (input.transcript_path) args.push('--transcript', input.transcript_path);
      const pid = spawn(sid, args, { env });
      log(sid, `Stop: spawned stop-worker pid ${pid}`);
      return '';
    }
    case 'SessionEnd': {
      if (input.reason === 'clear') writeHandoff(sid);
      const hadBridge = Boolean(bridgePid(sid));
      const stopped = await stopBridge(sid, { waitMs: 2500 });
      log(sid, `SessionEnd(${input.reason || '?'}): bridge ${hadBridge ? (stopped ? 'stopped' : 'did not stop') : 'not running'}`);
      const agent = loadAgent(sid);
      if (!hadBridge && agent?.agent_id) {
        try {
          await createApi().offline(agent.agent_id, { timeoutMs: 2000 });
        } catch (e) {
          log(sid, `SessionEnd: offline failed: ${e.message}`);
        }
      }
      return '';
    }
    default:
      log(sid, `unknown hook event ${event}`);
      return '';
  }
}
