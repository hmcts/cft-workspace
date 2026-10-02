import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { ApiError, createApi } from '../api.mjs';
import { directEnvelope } from '../envelope.mjs';
import { ensureStateDir, readJson, statePath } from '../session.mjs';
import {
  BACKFILL_BYTES,
  MAX_BATCH_BYTES,
  MAX_BATCH_ENTRIES,
  MAX_CONTENT_BYTES,
  batchItems,
  createTranscriptSync,
  parseEntries,
  parseLines,
  scrub,
  setTranscriptOff,
  syncStatePath,
  toEntries,
} from '../transcript-sync.mjs';
import { fakeSecrets, tempClaudeHome } from './helpers.mjs';
import { createMockHub } from './mock-server.mjs';

let home;
const saved = {};
let nextSession = 0;

before(() => {
  home = tempClaudeHome();
  for (const [k, v] of Object.entries(home.env)) {
    saved[k] = process.env[k];
    process.env[k] = v;
  }
  delete process.env.AGENT_HUB_TRANSCRIPT;
});
after(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  home.cleanup();
});

let nextUuid = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++nextUuid).padStart(12, '0')}`;
const SESSION = '7b2adff5-dd59-41b6-ad25-1c9d2a1962dd';
const base = (extra) => ({
  parentUuid: null,
  isSidechain: false,
  userType: 'external',
  entrypoint: 'cli',
  cwd: '/workspace',
  sessionId: SESSION,
  version: '2.1.270',
  gitBranch: 'master',
  uuid: uuid(),
  timestamp: '2026-10-01T15:32:38.112Z',
  ...extra,
});
const userLine = (content, extra = {}) => base({ type: 'user', promptId: 'p1', message: { role: 'user', content }, permissionMode: 'default', ...extra });
const assistantLine = (content, extra = {}) =>
  base({
    type: 'assistant',
    requestId: 'req_1',
    message: { model: 'claude-opus-5-5', id: 'msg_1', type: 'message', role: 'assistant', content, stop_reason: 'tool_use', usage: { input_tokens: 2, output_tokens: 112 } },
    ...extra,
  });
const jsonl = (...lines) => lines.map((l) => `${JSON.stringify(l)}\n`).join('');

test('toEntries maps a realistic transcript, line type by line type', () => {
  const prompt = userLine('why does run.sh fail?');
  const thinking = assistantLine([{ type: 'thinking', thinking: 'private reasoning', signature: 'sig' }, { type: 'redacted_thinking', data: 'x' }]);
  const call = assistantLine([
    { type: 'text', text: 'Let me look.' },
    { type: 'tool_use', id: 'toolu_01', name: 'Bash', input: { command: 'cat .claude/run.sh', description: 'Show run.sh' } },
  ]);
  const result = userLine([{ tool_use_id: 'toolu_01', type: 'tool_result', content: '#!/usr/bin/env bash\nset -euo pipefail' }], { sourceToolAssistantUUID: call.uuid });
  const arrayResult = userLine([
    { type: 'tool_result', tool_use_id: 'toolu_02', is_error: true, content: [{ type: 'text', text: 'Exit code 127' }, { type: 'image', source: { type: 'base64', data: 'AAAA' } }, { type: 'text', text: 'not found' }] },
  ]);
  const mixedUser = userLine([{ type: 'text', text: 'look at this' }, { type: 'image', source: { type: 'base64', data: 'AAAA' } }]);
  const answer = assistantLine([{ type: 'text', text: 'The failure is in `az` itself.' }]);
  const compact = userLine('This session is being continued from a previous conversation.\n\nSummary: …', { isCompactSummary: true, isVisibleInTranscriptOnly: true });

  assert.deepEqual(toEntries(prompt), [
    { key: `${prompt.uuid}:0`, role: 'user', content: { text: 'why does run.sh fail?' }, truncated: false, redacted: false, message_id: null, occurred_at: prompt.timestamp },
  ]);
  assert.deepEqual(toEntries(thinking), []);
  assert.deepEqual(
    toEntries(call).map((e) => [e.key, e.role, e.content]),
    [
      [`${call.uuid}:0`, 'assistant', { text: 'Let me look.' }],
      [`${call.uuid}:1`, 'tool_use', { id: 'toolu_01', name: 'Bash', input: { command: 'cat .claude/run.sh', description: 'Show run.sh' } }],
    ],
  );
  assert.deepEqual(toEntries(result)[0].content, { tool_use_id: 'toolu_01', output: '#!/usr/bin/env bash\nset -euo pipefail', is_error: false });
  assert.deepEqual(toEntries(arrayResult)[0], {
    key: `${arrayResult.uuid}:0`,
    role: 'tool_result',
    content: { tool_use_id: 'toolu_02', output: 'Exit code 127\n[image]\nnot found', is_error: true },
    truncated: false,
    redacted: false,
    message_id: null,
    occurred_at: arrayResult.timestamp,
  });
  assert.deepEqual(toEntries(mixedUser).map((e) => [e.key, e.role, e.content]), [[`${mixedUser.uuid}:0`, 'user', { text: 'look at this' }]]);
  assert.deepEqual(toEntries(answer)[0].content, { text: 'The failure is in `az` itself.' });
  assert.deepEqual(toEntries(compact).map((e) => [e.role, e.content.text.slice(0, 12)]), [['system', 'This session']]);
});

test('toEntries skips sidechains, meta lines, bookkeeping lines and thinking', () => {
  const skipped = [
    userLine('subagent prompt', { isSidechain: true }),
    assistantLine([{ type: 'text', text: 'subagent answer' }], { isSidechain: true }),
    userLine('<local-command-caveat>…</local-command-caveat>', { isMeta: true }),
    userLine([{ type: 'text', text: 'Base directory for this skill: …' }], { isMeta: true }),
    base({ type: 'system', subtype: 'stop_hook_summary', hookCount: 2 }),
    base({ type: 'attachment', attachment: { type: 'hook_success', content: 'hello' } }),
    { type: 'file-history-snapshot', messageId: 'm', snapshot: { trackedFileBackups: {} } },
    { type: 'ai-title', aiTitle: 'run.sh illegal instruction error', sessionId: SESSION },
    { type: 'custom-title', customTitle: 'x', sessionId: SESSION },
    { type: 'last-prompt', leafUuid: 'u', sessionId: SESSION },
    { type: 'mode', mode: 'normal' },
    { type: 'permission-mode', permissionMode: 'bypassPermissions' },
    { type: 'cost-state', totalCostUSD: 0.2 },
    assistantLine([{ type: 'thinking', thinking: 'secret thoughts' }]),
    userLine('   '),
  ];
  for (const line of skipped) assert.deepEqual(toEntries(line), [], JSON.stringify(line).slice(0, 80));
  const text = jsonl(...skipped);
  assert.deepEqual(parseEntries(text), []);
  assert.ok(!JSON.stringify(parseEntries(jsonl(assistantLine([{ type: 'thinking', thinking: 'secret thoughts' }, { type: 'text', text: 'ok' }])))).includes('secret thoughts'));
});

test('keys are <uuid>:<part index>, counting skipped parts', () => {
  const line = assistantLine([{ type: 'thinking', thinking: 'x' }, { type: 'text', text: 'a' }, { type: 'tool_use', id: 't', name: 'Read', input: {} }]);
  assert.deepEqual(toEntries(line).map((e) => e.key), [`${line.uuid}:1`, `${line.uuid}:2`]);
  for (const e of toEntries(line)) assert.match(e.key, /^[A-Za-z0-9:_-]+$/);
  assert.deepEqual(toEntries({ ...line, uuid: 'not a key!' }), []);
});

test('a direct message delivered by the bridge links to its agent-hub message id', () => {
  const envelope = directEnvelope({ id: '1234', body: 'can you check the build?', author: { type: 'user', owner_name: 'Alice' } });
  assert.equal(toEntries(userLine(envelope))[0].message_id, '1234');
  assert.equal(toEntries(userLine([{ type: 'text', text: envelope }]))[0].message_id, '1234');
  assert.equal(toEntries(userLine(`quoted: ${envelope}`))[0].message_id, null);
});

test('scrub redacts content with a secret-shaped string, keeping the tool call identity', () => {
  const [user] = parseEntries(jsonl(userLine(`my token is ${fakeSecrets.githubToken}`)));
  assert.equal(user.redacted, true);
  assert.deepEqual(Object.keys(user.content), ['redacted']);
  assert.match(user.content.redacted, /gh/);
  assert.ok(!JSON.stringify(user).includes(fakeSecrets.githubToken));

  const [call] = parseEntries(jsonl(assistantLine([{ type: 'tool_use', id: 'toolu_9', name: 'Bash', input: { command: `curl -H "x: ${fakeSecrets.jwt}"` } }])));
  assert.deepEqual({ id: call.content.id, name: call.content.name, redacted: call.redacted }, { id: 'toolu_9', name: 'Bash', redacted: true });
  assert.equal(call.content.input, undefined);

  // JSON escaping would hide the quote before the value; the raw text is scanned too.
  const [result] = parseEntries(jsonl(userLine([{ type: 'tool_result', tool_use_id: 't', content: `config:\n${fakeSecrets.password}` }])));
  assert.equal(result.redacted, true);
  assert.deepEqual(Object.keys(result.content), ['redacted']);

  const [clean] = parseEntries(jsonl(userLine('nothing to see')));
  assert.equal(clean.redacted, false);
});

test('scrub truncates content to the byte limit and marks it', () => {
  const bytes = (c) => Buffer.byteLength(JSON.stringify(c));
  const long = `START ${'é"\\😀x'.repeat(20000)}`;
  const text = scrub(toEntries(userLine(long))[0]);
  assert.equal(text.truncated, true);
  assert.ok(bytes(text.content) <= MAX_CONTENT_BYTES);
  assert.ok(bytes(text.content) > MAX_CONTENT_BYTES - 16, 'uses nearly all of the limit');
  assert.ok(long.startsWith(text.content.text));
  assert.ok(!/[\uD800-\uDBFF]$/.test(text.content.text), 'no half surrogate pair');

  const output = scrub(toEntries(userLine([{ type: 'tool_result', tool_use_id: 't', content: 'y'.repeat(40000) }]))[0]);
  assert.equal(output.truncated, true);
  assert.ok(bytes(output.content) <= MAX_CONTENT_BYTES);
  assert.equal(output.content.tool_use_id, 't');

  const input = { file_path: '/x', content: 'z'.repeat(40000) };
  const call = scrub(toEntries(assistantLine([{ type: 'tool_use', id: 'toolu_1', name: 'Write', input }]))[0]);
  assert.equal(call.truncated, true);
  assert.equal(typeof call.content.input, 'string');
  assert.ok(JSON.stringify(input).startsWith(call.content.input));
  assert.ok(bytes(call.content) <= MAX_CONTENT_BYTES);

  const small = scrub(toEntries(userLine('short'))[0]);
  assert.equal(small.truncated, false);
});

test('batchItems keeps each request under the entry and byte caps', () => {
  const lines = [];
  for (let i = 0; i < 150; i++) lines.push(assistantLine([{ type: 'text', text: `${i} ${'w'.repeat(12000)}` }]));
  for (let i = 0; i < 150; i++) lines.push(userLine(`small ${i}`));
  const { items } = parseLines(jsonl(...lines));
  const batches = batchItems(items, { sid: SESSION });
  assert.equal(batches.flat().length, 300);
  for (const batch of batches) {
    assert.ok(batch.length <= MAX_BATCH_ENTRIES);
    const size = Buffer.byteLength(JSON.stringify({ session_id: SESSION, entries: batch.map((i) => i.entry) }));
    assert.ok(size <= MAX_BATCH_BYTES, `batch of ${size} bytes`);
  }
  assert.ok(batches.length >= 10);
});

// A sync for a fresh session over a fake api that records, or fails, each upload.
function fixture({ backfillBytes, env = {} } = {}) {
  const sid = `sync-test-${++nextSession}`;
  ensureStateDir(sid);
  const file = path.join(home.root, `${sid}.jsonl`);
  fs.writeFileSync(file, '');
  fs.writeFileSync(statePath(sid, 'transcript'), `${file}\n`);
  const calls = [];
  const failures = [];
  const api = {
    async transcript(agentId, body) {
      calls.push({ agentId, body });
      const status = failures.shift();
      if (status) throw new ApiError(status, { error: 'nope' }, 'POST', `/api/agent/${agentId}/transcript`);
      return { accepted: body.entries.length };
    },
  };
  const ctx = { sid, file, calls, failures, agentId: 'agent-1', env: { ...env } };
  ctx.sync = createTranscriptSync({ sid, api, agentId: () => ctx.agentId, env: ctx.env, ...(backfillBytes ? { backfillBytes } : {}) });
  ctx.keys = () => calls.flatMap((c) => c.body.entries.map((e) => e.key));
  ctx.state = () => readJson(syncStatePath(sid));
  ctx.log = () => fs.readFileSync(statePath(sid, 'log'), 'utf8');
  return ctx;
}

test('tick uploads complete lines, persists the offset, and leaves a partial last line for later', async () => {
  const t = fixture();
  const a = userLine('one');
  const b = assistantLine([{ type: 'text', text: 'two' }]);
  const c = userLine('three');
  const cText = JSON.stringify(c);
  fs.writeFileSync(t.file, jsonl(a, b) + cText.slice(0, 20));
  assert.equal((await t.sync.tick()).status, 'ok');
  assert.deepEqual(t.keys(), [`${a.uuid}:0`, `${b.uuid}:0`]);
  assert.equal(t.calls[0].body.session_id, t.sid);
  assert.deepEqual(t.state(), { agent_id: 'agent-1', path: t.file, offset: Buffer.byteLength(jsonl(a, b)), floor: 0 });

  await t.sync.tick();
  assert.equal(t.calls.length, 1, 'nothing new, nothing sent');

  fs.appendFileSync(t.file, `${cText.slice(20)}\n`);
  await t.sync.tick();
  assert.deepEqual(t.calls[1].body.entries.map((e) => e.key), [`${c.uuid}:0`]);
  assert.equal(t.state().offset, fs.statSync(t.file).size);
});

test('a new agent id restarts the upload and a shrunk transcript starts again from its beginning', async () => {
  const t = fixture();
  const a = userLine('one');
  fs.writeFileSync(t.file, jsonl(a));
  await t.sync.tick();
  t.agentId = 'agent-2';
  await t.sync.tick();
  assert.deepEqual(t.calls.map((c) => [c.agentId, c.body.entries[0].key]), [['agent-1', `${a.uuid}:0`], ['agent-2', `${a.uuid}:0`]]);
  assert.match(t.log(), /transcript sync reset \(new agent\)/);

  const fresh = userLine('x');
  fs.writeFileSync(t.file, jsonl(fresh));
  await t.sync.tick();
  assert.equal(t.calls.at(-1).body.entries[0].key, `${fresh.uuid}:0`);
  assert.match(t.log(), /transcript shrank/);
});

test('the first upload for an agent backfills at most the last 2 MB, from a line boundary', async () => {
  const t = fixture({ backfillBytes: 4096 });
  const lines = [];
  for (let i = 0; i < 40; i++) lines.push(userLine(`line ${i} ${'p'.repeat(200)}`));
  fs.writeFileSync(t.file, jsonl(...lines));
  const size = fs.statSync(t.file).size;
  await t.sync.tick();
  const { items } = parseLines(fs.readFileSync(t.file));
  const expected = items.filter((i) => i.start >= size - 4096).map((i) => i.entry.key);
  assert.deepEqual(t.keys(), expected);
  assert.ok(expected.length > 5 && expected.length < 40);
  assert.equal(BACKFILL_BYTES, 2 * 1024 * 1024);
});

test('a 400 batch is logged and skipped; a 5xx is retried on the next tick and logged once', async () => {
  const t = fixture();
  const a = userLine('bad batch');
  fs.writeFileSync(t.file, jsonl(a));
  t.failures.push(400);
  assert.equal((await t.sync.tick()).status, 'ok');
  assert.equal(t.state().offset, fs.statSync(t.file).size);
  assert.match(t.log(), /transcript batch refused, skipping 1 entries/);

  const b = userLine('retry me');
  fs.appendFileSync(t.file, jsonl(b));
  const before = t.state().offset;
  t.failures.push(503, 503);
  assert.equal((await t.sync.tick()).status, 'error');
  assert.equal((await t.sync.tick()).status, 'error');
  assert.equal(t.state().offset, before);
  assert.equal(t.log().match(/transcript sync failed/g).length, 1);
  assert.equal((await t.sync.tick()).status, 'ok');
  assert.deepEqual(t.calls.slice(-3).map((c) => c.body.entries[0].key), Array(3).fill(`${b.uuid}:0`));
  assert.match(t.log(), /transcript sync recovered/);
  assert.equal(t.state().offset, fs.statSync(t.file).size);
});

test('a line split across two batches is resent whole when the second batch fails', async () => {
  const t = fixture();
  const filler = [];
  for (let i = 0; i < 99; i++) filler.push(userLine(`f${i}`));
  const split = assistantLine([{ type: 'text', text: 'part a' }, { type: 'text', text: 'part b' }]);
  fs.writeFileSync(t.file, jsonl(...filler, split));
  t.failures.push(0, 500);
  await t.sync.tick();
  assert.equal(t.calls[0].body.entries.length, 100);
  assert.equal(t.state().offset, Buffer.byteLength(jsonl(...filler)));
  await t.sync.tick();
  assert.deepEqual(t.calls.at(-1).body.entries.map((e) => e.key), [`${split.uuid}:0`, `${split.uuid}:1`]);
});

test('a 404 pauses uploads for a while without moving the offset', async () => {
  const t = fixture();
  fs.writeFileSync(t.file, jsonl(userLine('hello')));
  t.failures.push(404);
  assert.equal((await t.sync.tick()).status, 'unavailable');
  assert.equal(t.state().offset, 0);
  assert.equal((await t.sync.tick()).status, 'paused');
  assert.equal(t.calls.length, 1);
});

test('with the opt-out file or AGENT_HUB_TRANSCRIPT=off nothing is uploaded, and turning it back on skips that stretch', async () => {
  const t = fixture();
  const before = userLine('before');
  fs.writeFileSync(t.file, jsonl(before));
  await t.sync.tick();
  setTranscriptOff(t.sid, true);
  const during = userLine('while off');
  fs.appendFileSync(t.file, jsonl(during));
  assert.equal((await t.sync.tick()).status, 'off');
  setTranscriptOff(t.sid, false);
  t.agentId = 'agent-2';
  const later = userLine('after');
  fs.appendFileSync(t.file, jsonl(later));
  await t.sync.tick();
  assert.deepEqual(t.keys(), [`${before.uuid}:0`, `${later.uuid}:0`], 'a new agent does not backfill below the opt-out');

  t.env.AGENT_HUB_TRANSCRIPT = 'off';
  fs.appendFileSync(t.file, jsonl(userLine('env off')));
  assert.equal((await t.sync.tick()).status, 'off');
  assert.equal(t.calls.length, 2);
});

test('tick against the mock hub: every batch passes the service validation and duplicates are ignored', async () => {
  const hub = createMockHub();
  const url = await hub.listen();
  try {
    const api = createApi({ baseUrl: url, devUser: 'u-me|Me|me@example.com' });
    const sid = `sync-test-${++nextSession}`;
    const { agent_id: agentId } = await api.register({ session_id: sid, name: sid });
    ensureStateDir(sid);
    const file = path.join(home.root, `${sid}.jsonl`);
    const lines = [];
    for (let i = 0; i < 30; i++) {
      lines.push(assistantLine([{ type: 'text', text: 'big '.repeat(5000) }, { type: 'tool_use', id: `t${i}`, name: 'Write', input: { content: 'q'.repeat(30000) } }]));
      lines.push(userLine([{ type: 'tool_result', tool_use_id: `t${i}`, content: 'ok' }]));
    }
    fs.writeFileSync(file, jsonl(...lines));
    const sync = createTranscriptSync({ sid, api, agentId, env: {}, resolvePath: () => file });
    assert.deepEqual(await sync.tick(), { status: 'ok', uploaded: 90 });
    assert.equal(hub.transcripts.get(agentId).size, 90);
    const posts = hub.calls.filter((c) => c.path === `/api/agent/${agentId}/transcript`);
    assert.ok(posts.length > 1);

    fs.rmSync(syncStatePath(sid));
    await sync.tick();
    assert.equal(hub.transcripts.get(agentId).size, 90);
  } finally {
    await hub.close();
  }
});
