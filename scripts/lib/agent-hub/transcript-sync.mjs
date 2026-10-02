import fs from 'node:fs';
import { ApiError } from './api.mjs';
import { findSecret } from './secret-scan.mjs';
import { log, readJson, removeFile, statePath, transcriptPath, writeJson } from './session.mjs';

export const MAX_CONTENT_BYTES = 16384;
export const MAX_BATCH_ENTRIES = 100;
// The service refuses requests over 256 KiB; this leaves room for the envelope and headers.
export const MAX_BATCH_BYTES = 200 * 1000;
export const BACKFILL_BYTES = 2 * 1024 * 1024;
const READ_BYTES = 1024 * 1024;
const SCAN_BYTES = 64 * 1024;
const KEY_RE = /^[A-Za-z0-9:_-]{1,200}$/;
const DIRECT_RE = /^\[agent-hub\] Direct message #(\d+) /;
const STATE_FILE = 'transcript-sync.json';
const OFF_FILE = 'transcript-off';
export const UNAVAILABLE_PAUSE_MS = 10 * 60 * 1000;

const bytes = (value) => Buffer.byteLength(typeof value === 'string' ? value : JSON.stringify(value), 'utf8');

export function transcriptOffByEnv(env = process.env) {
  return /^(off|false|0|no)$/i.test(String(env.AGENT_HUB_TRANSCRIPT || '').trim());
}

export function transcriptOffBySession(sid) {
  return fs.existsSync(statePath(sid, OFF_FILE));
}

export function transcriptOff(sid, env = process.env) {
  return transcriptOffByEnv(env) || transcriptOffBySession(sid);
}

function textParts(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((part) => (part?.type === 'text' ? String(part.text ?? '') : part?.type === 'image' ? '[image]' : `[${part?.type ?? 'unknown'}]`))
    .join('\n');
}

/** The entries one transcript line maps to, before secret scanning and truncation. */
export function toEntries(line) {
  if (!line || typeof line !== 'object' || line.isSidechain) return [];
  if (typeof line.uuid !== 'string' || typeof line.timestamp !== 'string') return [];
  if (line.type !== 'user' && line.type !== 'assistant') return [];
  const content = line.message?.content;
  const entry = (index, role, body, messageId = null) => ({
    key: `${line.uuid}:${index}`,
    role,
    content: body,
    truncated: false,
    redacted: false,
    message_id: messageId,
    occurred_at: line.timestamp,
  });
  const userText = (index, text) => entry(index, 'user', { text }, DIRECT_RE.exec(text)?.[1] ?? null);

  if (line.type === 'user' && line.isCompactSummary) {
    const text = typeof content === 'string' ? content : textParts(content);
    return text.trim() ? [entry(0, 'system', { text })] : [];
  }
  if (line.isMeta) return [];
  if (typeof content === 'string') {
    if (!content.trim()) return [];
    return [line.type === 'user' ? userText(0, content) : entry(0, 'assistant', { text: content })];
  }
  if (!Array.isArray(content)) return [];

  const out = [];
  content.forEach((part, index) => {
    if (part?.type === 'text' && typeof part.text === 'string' && part.text.trim()) {
      out.push(line.type === 'user' ? userText(index, part.text) : entry(index, 'assistant', { text: part.text }));
    } else if (line.type === 'user' && part?.type === 'tool_result') {
      out.push(entry(index, 'tool_result', { tool_use_id: String(part.tool_use_id ?? ''), output: textParts(part.content), is_error: part.is_error === true }));
    } else if (line.type === 'assistant' && part?.type === 'tool_use') {
      out.push(entry(index, 'tool_use', { id: String(part.id ?? ''), name: String(part.name ?? ''), input: part.input ?? {} }));
    }
  });
  return out.filter((e) => KEY_RE.test(e.key));
}

function stringLeaves(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const v of value) stringLeaves(v, out);
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      out.push(k);
      stringLeaves(v, out);
    }
  }
  return out;
}

// JSON escaping hides some secret shapes (a quote becomes \"), so the raw strings are scanned too.
function secretIn(content, patterns) {
  return findSecret(stringLeaves(content).join('\n'), patterns) || findSecret(JSON.stringify(content), patterns);
}

function cut(text, length) {
  const out = text.slice(0, length);
  return /[\uD800-\uDBFF]$/.test(out) ? out.slice(0, -1) : out;
}

// The longest prefix of `text` whose content, as built by `build`, fits the byte limit.
function fit(text, build, limit) {
  let lo = 0;
  let hi = Math.min(text.length, limit);
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (bytes(build(cut(text, mid))) <= limit) lo = mid;
    else hi = mid - 1;
  }
  return build(cut(text, lo));
}

/** Redacts content holding a secret-shaped string, else truncates it to the service's size limit. */
export function scrub(entry, { patterns, limit = MAX_CONTENT_BYTES } = {}) {
  const { content } = entry;
  const pattern = secretIn(content, patterns);
  if (pattern) {
    const redacted = entry.role === 'tool_use' ? { id: content.id, name: content.name, redacted: pattern } : { redacted: pattern };
    return { ...entry, content: redacted, redacted: true, truncated: false };
  }
  if (bytes(content) <= limit) return entry;
  let fitted;
  if (entry.role === 'tool_use') {
    const input = typeof content.input === 'string' ? content.input : JSON.stringify(content.input);
    fitted = fit(input, (s) => ({ ...content, input: s }), limit);
  } else if (entry.role === 'tool_result') {
    fitted = fit(content.output, (s) => ({ ...content, output: s }), limit);
  } else {
    fitted = fit(content.text, (s) => ({ text: s }), limit);
  }
  return { ...entry, content: fitted, truncated: true };
}

/**
 * Splits complete JSONL lines into scrubbed entries, each with the byte offset of the line it came
 * from (`base` is the offset of the first byte of `text`). A trailing partial line is ignored.
 */
export function parseLines(text, { base = 0, patterns } = {}) {
  const buf = Buffer.isBuffer(text) ? text : Buffer.from(text, 'utf8');
  const items = [];
  let start = 0;
  for (let nl = buf.indexOf(0x0a, start); nl !== -1; start = nl + 1, nl = buf.indexOf(0x0a, start)) {
    const raw = buf.toString('utf8', start, nl);
    if (!raw.trim()) continue;
    let line;
    try {
      line = JSON.parse(raw);
    } catch {
      continue;
    }
    for (const entry of toEntries(line)) items.push({ start: base + start, entry: scrub(entry, { patterns }) });
  }
  return { items, end: base + start };
}

export function parseEntries(text, opts = {}) {
  return parseLines(text, opts).items.map((item) => item.entry);
}

/** Groups items into requests of at most `maxEntries` entries and about `maxBytes` of JSON each. */
export function batchItems(items, { sid = '', maxEntries = MAX_BATCH_ENTRIES, maxBytes = MAX_BATCH_BYTES } = {}) {
  const overhead = bytes({ session_id: sid, entries: [] });
  const batches = [];
  let current = [];
  let size = overhead;
  for (const item of items) {
    const n = bytes(item.entry) + 1;
    if (current.length && (current.length >= maxEntries || size + n > maxBytes)) {
      batches.push(current);
      current = [];
      size = overhead;
    }
    current.push(item);
    size += n;
  }
  if (current.length) batches.push(current);
  return batches;
}

function readAt(file, position, length) {
  const buf = Buffer.alloc(length);
  const fd = fs.openSync(file, 'r');
  try {
    const n = fs.readSync(fd, buf, 0, length, position);
    return n === length ? buf : buf.subarray(0, n);
  } finally {
    fs.closeSync(fd);
  }
}

// The start of the first line beginning at or after `position`.
function lineStartFrom(file, position, size) {
  if (position <= 0) return 0;
  for (let at = position - 1; at < size; at += SCAN_BYTES) {
    const nl = readAt(file, at, Math.min(SCAN_BYTES, size - at)).indexOf(0x0a);
    if (nl !== -1) return at + nl + 1;
  }
  return size;
}

// The end of the last complete line.
function lastLineEnd(file, size) {
  for (let end = size; end > 0; end -= SCAN_BYTES) {
    const at = Math.max(0, end - SCAN_BYTES);
    const nl = readAt(file, at, end - at).lastIndexOf(0x0a);
    if (nl !== -1) return at + nl + 1;
  }
  return 0;
}

export function backfillStart(file, size, maxBytes = BACKFILL_BYTES) {
  return size <= maxBytes ? 0 : lineStartFrom(file, size - maxBytes, size);
}

// From `offset` to the end of the last complete line, reading further when one line outgrows a read.
function readCompleteLines(file, offset, size) {
  for (let length = READ_BYTES; ; length *= 2) {
    const buf = readAt(file, offset, Math.min(length, size - offset));
    const nl = buf.lastIndexOf(0x0a);
    if (nl !== -1) return buf.subarray(0, nl + 1);
    if (offset + buf.length >= size) return null;
  }
}

export function syncStatePath(sid) {
  return statePath(sid, STATE_FILE);
}

/**
 * Moves the upload offset to the end of the transcript without uploading, and records it as a floor
 * that a later reset (a new agent id) never backfills below. Used while uploads are off.
 */
export function fastForward(sid, { agentId, file = transcriptPath(sid) } = {}) {
  if (!file) return null;
  let size;
  try {
    size = fs.statSync(file).size;
  } catch {
    return null;
  }
  const previous = readJson(syncStatePath(sid)) || {};
  const end = lastLineEnd(file, size);
  const state = { agent_id: agentId ?? previous.agent_id ?? null, path: file, offset: end, floor: end };
  writeJson(syncStatePath(sid), state);
  return state;
}

export function setTranscriptOff(sid, off) {
  if (off) fs.writeFileSync(statePath(sid, OFF_FILE), `${new Date().toISOString()}\n`);
  else removeFile(statePath(sid, OFF_FILE));
}

/**
 * Uploads the session's transcript to agent-hub incrementally. `tick()` sends every complete line
 * added since the saved offset and advances the offset only past batches the service accepted
 * (or refused with 400, so one bad batch cannot stop the sync).
 */
export function createTranscriptSync({
  sid,
  api,
  agentId,
  env = process.env,
  patterns,
  resolvePath = () => transcriptPath(sid, null) || transcriptPath(sid),
  backfillBytes = BACKFILL_BYTES,
  now = Date.now,
}) {
  const getAgentId = typeof agentId === 'function' ? agentId : () => agentId;
  const stateFile = syncStatePath(sid);
  let lastError = null;
  let pausedUntil = 0;

  function noteError(message) {
    if (message === lastError) return;
    lastError = message;
    log(sid, `transcript sync failed (retrying): ${message}`);
  }

  function currentState(id, file, size) {
    const saved = readJson(stateFile);
    const shrank = saved?.path === file && !(Number.isInteger(saved.offset) && saved.offset <= size);
    if (saved && saved.agent_id === id && saved.path === file && !shrank) return saved;
    const floor = saved?.path === file && !shrank && Number.isInteger(saved.floor) ? saved.floor : 0;
    const state = { agent_id: id, path: file, offset: Math.max(backfillStart(file, size, backfillBytes), floor), floor };
    writeJson(stateFile, state);
    if (saved) log(sid, `transcript sync reset (${saved.path !== file ? 'new transcript' : shrank ? 'transcript shrank' : 'new agent'}); starting at byte ${state.offset}`);
    return state;
  }

  async function tick({ deadline = Infinity, timeoutMs } = {}) {
    const id = getAgentId();
    if (!id) return { status: 'no-agent', uploaded: 0 };
    if (now() < pausedUntil) return { status: 'paused', uploaded: 0 };
    const file = resolvePath();
    let size;
    try {
      size = file ? fs.statSync(file).size : null;
    } catch {
      size = null;
    }
    if (size === null) return { status: 'no-transcript', uploaded: 0 };
    if (transcriptOff(sid, env)) {
      fastForward(sid, { agentId: id, file });
      return { status: 'off', uploaded: 0 };
    }

    const state = currentState(id, file, size);
    const save = () => writeJson(stateFile, state);
    let uploaded = 0;
    while (state.offset < size && Date.now() < deadline) {
      const chunk = readCompleteLines(file, state.offset, size);
      if (!chunk) break;
      const { items, end } = parseLines(chunk, { base: state.offset, patterns });
      const batches = batchItems(items, { sid });
      for (let i = 0; i < batches.length; i++) {
        if (Date.now() >= deadline || transcriptOff(sid, env)) return { status: 'ok', uploaded };
        const entries = batches[i].map((item) => item.entry);
        const remaining = Number.isFinite(deadline) ? Math.max(500, deadline - Date.now()) : undefined;
        try {
          await api.transcript(id, { session_id: sid, entries }, { timeoutMs: timeoutMs ?? remaining });
          uploaded += entries.length;
        } catch (e) {
          if (e instanceof ApiError && e.status === 400) {
            log(sid, `transcript batch refused, skipping ${entries.length} entries (${entries[0].key} … ${entries[entries.length - 1].key}): ${e.message}`);
          } else if (e instanceof ApiError && e.status === 404) {
            // A service without the transcript endpoint answers 404 too, so this pauses rather than
            // re-registering; the heartbeat and stream already catch an agent the service has forgotten.
            pausedUntil = now() + UNAVAILABLE_PAUSE_MS;
            log(sid, `transcript upload answered 404; pausing uploads for ${UNAVAILABLE_PAUSE_MS / 60000} minutes`);
            return { status: 'unavailable', uploaded };
          } else {
            noteError(e.message);
            return { status: 'error', uploaded, error: e };
          }
        }
        // A line whose entries straddle two batches is resent whole; the service ignores the duplicates.
        state.offset = batches[i + 1]?.[0].start ?? end;
        save();
      }
      if (state.offset < end) {
        state.offset = end;
        save();
      }
    }
    if (lastError) {
      log(sid, 'transcript sync recovered');
      lastError = null;
    }
    return { status: 'ok', uploaded };
  }

  return { tick };
}
