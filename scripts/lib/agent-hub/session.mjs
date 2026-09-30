import fs from 'node:fs';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const CLI_PATH = path.join(PROJECT_ROOT, 'scripts', 'lib', 'agent-hub', 'cli.mjs');

const SESSION_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

export const DEFAULT_CONFIG = {
  publish_interval_minutes: 10,
  notify_interval_minutes: 5,
};

export function claudeHome() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

export function hubHome() {
  return path.join(claudeHome(), 'agent-hub');
}

export function projectDir() {
  return process.env.CLAUDE_PROJECT_DIR || PROJECT_ROOT;
}

export function validSessionId(sid) {
  return typeof sid === 'string' && SESSION_ID_RE.test(sid);
}

export function stateDir(sid) {
  if (!validSessionId(sid)) throw new Error(`invalid session id: ${JSON.stringify(sid)}`);
  return path.join(hubHome(), sid);
}

export function statePath(sid, name) {
  return path.join(stateDir(sid), name);
}

export function ensureStateDir(sid) {
  const dir = stateDir(sid);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}

export function isEnabled(sid) {
  return validSessionId(sid) && fs.existsSync(statePath(sid, 'enabled'));
}

export function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export function writeJson(file, value) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, file);
}

export function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8').trim();
  } catch {
    return '';
  }
}

export function removeFile(file) {
  try {
    fs.unlinkSync(file);
  } catch {}
}

const LOG_MAX_BYTES = 1024 * 1024;

export function logPath(sid) {
  return statePath(sid, 'log');
}

export function rotateLog(sid) {
  const file = logPath(sid);
  try {
    if (fs.statSync(file).size > LOG_MAX_BYTES) fs.renameSync(file, `${file}.1`);
  } catch {}
}

export function log(sid, message) {
  try {
    ensureStateDir(sid);
    fs.appendFileSync(logPath(sid), `${new Date().toISOString()} [${process.pid}] ${message}\n`);
  } catch {}
}

// ~/.claude/sessions/<pid>.json is undocumented (peerProtocol 1); treat every field as optional.
export function findSessionEntry(sid) {
  const dir = path.join(claudeHome(), 'sessions');
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch {
    return null;
  }
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    const entry = readJson(path.join(dir, name));
    if (entry && entry.sessionId === sid) return entry;
  }
  return null;
}

// The token in the environment belongs to the socket in the environment, so that pair
// wins; the registry path is the fallback for processes started without it.
// Title entries are re-appended throughout a transcript, so the tail holds the current ones.
const TITLE_TAIL_BYTES = 256 * 1024;

export function transcriptPath(sid, entry = findSessionEntry(sid)) {
  const recorded = readText(statePath(sid, 'transcript')).trim();
  if (recorded) return recorded;
  const fromWorker = readJson(statePath(sid, 'cursors.json'), {})?.transcript_path;
  if (typeof fromWorker === 'string' && fromWorker) return fromWorker;
  if (!entry?.cwd) return null;
  return path.join(claudeHome(), 'projects', entry.cwd.replace(/[^A-Za-z0-9]/g, '-'), `${sid}.jsonl`);
}

// The latest `custom-title` and `ai-title` entries in the transcript, the title /resume shows.
export function conversationTitles(file) {
  let text;
  try {
    const size = fs.statSync(file).size;
    const start = Math.max(0, size - TITLE_TAIL_BYTES);
    const buf = Buffer.alloc(size - start);
    const fd = fs.openSync(file, 'r');
    try {
      fs.readSync(fd, buf, 0, buf.length, start);
    } finally {
      fs.closeSync(fd);
    }
    text = buf.toString('utf8');
  } catch {
    return {};
  }
  const titles = {};
  const lines = text.split('\n');
  for (let i = lines.length - 1; i >= 0 && !(titles.custom && titles.ai); i--) {
    const line = lines[i];
    if (!line.includes('-title"')) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry.type === 'custom-title' && !titles.custom && typeof entry.customTitle === 'string') titles.custom = entry.customTitle;
    if (entry.type === 'ai-title' && !titles.ai && typeof entry.aiTitle === 'string') titles.ai = entry.aiTitle;
  }
  return titles;
}

export function nameSlug(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/, '');
}

// A /rename wins, then the conversation's title, then the handle Claude Code derived for the session.
export function agentName(sid, entry = findSessionEntry(sid)) {
  if (entry?.nameSource === 'user' && entry.name) return entry.name;
  const file = transcriptPath(sid, entry);
  const titles = file ? conversationTitles(file) : {};
  return nameSlug(titles.custom) || nameSlug(titles.ai) || entry?.name || sid.slice(0, 8);
}

export function sessionInfo(sid, env = process.env) {
  const entry = findSessionEntry(sid);
  const envPid = Number.parseInt(env.AGENT_HUB_CLAUDE_PID || '', 10);
  return {
    pid: Number.isInteger(envPid) ? envPid : Number.isInteger(entry?.pid) ? entry.pid : null,
    name: agentName(sid, entry),
    cwd: entry?.cwd || null,
    socketPath: env.CLAUDE_CODE_MESSAGING_SOCKET || entry?.messagingSocketPath || null,
  };
}

export function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
}

export function readPidFile(file) {
  const pid = Number.parseInt(readText(file), 10);
  return Number.isInteger(pid) ? pid : null;
}

// Exclusive-create pidfile. A file left by a dead process is reclaimed once.
export function acquirePidFile(file) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      fs.writeFileSync(file, `${process.pid}\n`, { flag: 'wx', mode: 0o600 });
      return true;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      const owner = readPidFile(file);
      if (owner === process.pid) return true;
      if (owner && pidAlive(owner)) return false;
      removeFile(file);
    }
  }
  return false;
}

export function releasePidFile(file) {
  if (readPidFile(file) === process.pid) removeFile(file);
}

export function requireSessionId(env = process.env) {
  const sid = env.CLAUDE_CODE_SESSION_ID;
  if (!validSessionId(sid)) {
    throw new Error(
      'CLAUDE_CODE_SESSION_ID is not set. Run this from inside a Claude Code session (the Bash tool exports it).',
    );
  }
  return sid;
}

export function spawnDetached(sid, args, { env = process.env } = {}) {
  ensureStateDir(sid);
  rotateLog(sid);
  const fd = fs.openSync(logPath(sid), 'a', 0o600);
  try {
    const child = spawn(process.execPath, [CLI_PATH, ...args], {
      detached: true,
      stdio: ['ignore', fd, fd],
      cwd: projectDir(),
      env,
    });
    child.unref();
    return child.pid;
  } finally {
    fs.closeSync(fd);
  }
}
