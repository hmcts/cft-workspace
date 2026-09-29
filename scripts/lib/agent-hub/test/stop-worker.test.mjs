import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, beforeEach, test } from 'node:test';
import { DEFAULT_CONFIG, readJson, statePath, writeJson } from '../session.mjs';
import {
  buildPrompt,
  candidateTopics,
  decide,
  bashPaths,
  extractTouches,
  extractTranscriptText,
  haikuCommand,
  parseHaikuResult,
  readTranscriptSlice,
  runStopWorker,
  validateHaikuOutput,
} from '../stop-worker.mjs';
import { fakeSecrets, tempClaudeHome } from './helpers.mjs';

const SID = 'sess-stop-worker';
const MIN = 60000;
let home;
const saved = {};

before(() => {
  home = tempClaudeHome();
  for (const [k, v] of Object.entries(home.env)) {
    saved[k] = process.env[k];
    process.env[k] = v;
  }
  process.env.CLAUDE_CODE_MESSAGING_TOKEN = 'tok';
});
after(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  home.cleanup();
});

const line = (type, content, extra = {}) => `${JSON.stringify({ type, message: { role: type, content }, ...extra })}\n`;

test('extractTranscriptText keeps only user and assistant text', () => {
  const jsonl = [
    line('user', 'fix the bug'),
    line('assistant', [{ type: 'thinking', thinking: 'hmm' }, { type: 'text', text: 'Fixed it.' }, { type: 'tool_use', name: 'Bash' }]),
    line('user', [{ type: 'tool_result', content: 'ok' }]),
    line('assistant', 'sidechain', { isSidechain: true }),
    '{not json\n',
    `${JSON.stringify({ type: 'attachment' })}\n`,
  ].join('');
  assert.equal(extractTranscriptText(jsonl), 'User: fix the bug\n\nAssistant: Fixed it.');
});

test('readTranscriptSlice reads from the offset to the last full line and resets on truncation', () => {
  const file = path.join(home.root, 't.jsonl');
  fs.writeFileSync(file, line('user', 'one') + line('assistant', 'two'));
  const first = readTranscriptSlice(file, 0);
  assert.equal(first.text, 'User: one\n\nAssistant: two');
  assert.equal(first.end, fs.statSync(file).size);
  fs.appendFileSync(file, `${line('user', 'three')}{"type":"assist`);
  const second = readTranscriptSlice(file, first.end);
  assert.equal(second.text, 'User: three');
  assert.equal(second.end, fs.statSync(file).size - '{"type":"assist'.length);
  fs.writeFileSync(file, line('user', 'fresh'));
  assert.equal(readTranscriptSlice(file, second.end).text, 'User: fresh');
});

test('readTranscriptSlice keeps only the last 20 KB', () => {
  const file = path.join(home.root, 'big.jsonl');
  fs.writeFileSync(file, line('user', `START ${'x'.repeat(30000)}`) + line('assistant', 'END'));
  const { text } = readTranscriptSlice(file, 0);
  assert.ok(Buffer.byteLength(text) <= 20 * 1024);
  assert.ok(text.endsWith('Assistant: END'));
  assert.ok(!text.includes('START'));
});

const cfg = { ...DEFAULT_CONFIG };
test('decide: rate limits publish at 10 minutes and notify at 5 by default', () => {
  const base = { config: cfg, sliceText: 'work', secretInSlice: false, feedCount: 2 };
  let d = decide({ ...base, now: 20 * MIN, cursors: {} });
  assert.deepEqual(d, { offerPublish: true, offerNotify: true, callHaiku: true, advanceTranscript: true, advanceFeed: true });
  d = decide({ ...base, now: 20 * MIN, cursors: { last_publish_at: 11 * MIN, last_notify_at: 16 * MIN } });
  assert.equal(d.offerPublish, false);
  assert.equal(d.offerNotify, false);
  assert.equal(d.callHaiku, false);
  assert.equal(d.advanceTranscript, false, 'held for the next allowed publish');
  assert.equal(d.advanceFeed, false, 'held for the next allowed notify');
  d = decide({ ...base, now: 20 * MIN, cursors: { last_publish_at: 10 * MIN, last_notify_at: 15 * MIN } });
  assert.equal(d.offerPublish, true);
  assert.equal(d.offerNotify, true);
});

test('decide: a secret blocks publishing but not reading, and the slice is dropped', () => {
  const d = decide({ now: MIN * 100, cursors: {}, config: cfg, sliceText: 'x', secretInSlice: true, feedCount: 1 });
  assert.equal(d.offerPublish, false);
  assert.equal(d.offerNotify, true);
  assert.equal(d.advanceTranscript, true);
});

test('decide: nothing new means no Haiku call', () => {
  const d = decide({ now: MIN * 100, cursors: {}, config: cfg, sliceText: '', secretInSlice: false, feedCount: 0 });
  assert.equal(d.callHaiku, false);
  assert.equal(d.advanceTranscript, true);
});

test('validateHaikuOutput accepts the exact schema', () => {
  assert.ok(validateHaikuOutput({ publish: null, notify: null }).ok);
  assert.ok(validateHaikuOutput({ publish: { topics: ['pcs-api'], title: 'T', body: 'B' }, notify: 'see #12' }).ok);
});

test('validateHaikuOutput accepts ten topics', () => {
  const topics = Array.from({ length: 10 }, (_, i) => `t${i}`);
  assert.ok(validateHaikuOutput({ publish: { topics, title: 'T', body: 'B' }, notify: null }).ok);
});

test('validateHaikuOutput rejects anything else', () => {
  const bad = [
    null,
    [],
    'text',
    { publish: null },
    { publish: null, notify: null, extra: 1 },
    { publish: { topics: [], title: 'T', body: 'B' }, notify: null },
    { publish: { topics: Array.from({ length: 11 }, (_, i) => `t${i}`), title: 'T', body: 'B' }, notify: null },
    { publish: { topics: ['Bad Slug'], title: 'T', body: 'B' }, notify: null },
    { publish: { topics: ['-lead'], title: 'T', body: 'B' }, notify: null },
    { publish: { topics: ['a', 'a'], title: 'T', body: 'B' }, notify: null },
    { publish: { topics: ['a'], title: ' ', body: 'B' }, notify: null },
    { publish: { topics: ['a'], title: 'T', body: 'B', in_reply_to: '1' }, notify: null },
    { publish: { topics: ['a'], title: 'T'.repeat(201), body: 'B' }, notify: null },
    { publish: null, notify: '' },
    { publish: null, notify: 42 },
  ];
  for (const value of bad) assert.equal(validateHaikuOutput(value).ok, false, JSON.stringify(value));
});

test('parseHaikuResult unwraps claude -p json output, fenced or not', () => {
  const inner = { publish: null, notify: 'x' };
  assert.deepEqual(parseHaikuResult(JSON.stringify({ type: 'result', result: JSON.stringify(inner) })), inner);
  assert.deepEqual(parseHaikuResult(JSON.stringify({ type: 'result', result: `\`\`\`json\n${JSON.stringify(inner)}\n\`\`\`` })), inner);
  assert.throws(() => parseHaikuResult(JSON.stringify({ type: 'result', is_error: true, result: 'boom' })));
  assert.throws(() => parseHaikuResult(JSON.stringify({ type: 'result', result: 'Sure! here you go' })));
});

test('buildPrompt states what is allowed and lists topics', () => {
  const p = buildPrompt({ agentName: 'me', subscriptions: ['pcs-api'], activeTopics: ['ccd'], sliceText: 'S', feedText: 'F', offerPublish: false, offerNotify: true });
  assert.match(p, /PUBLISH is NOT allowed/);
  assert.match(p, /NOTIFY is allowed/);
  assert.match(p, /Subscribed topics: pcs-api/);
  assert.match(p, /Most active topics: ccd/);
  assert.match(p, /scripts\/agent-hub read <id>/);
});

test('buildPrompt explains the topic categories and vocabulary and passes the candidates', () => {
  const p = buildPrompt({
    agentName: 'me',
    subscriptions: [],
    activeTopics: [],
    candidates: { repos: ['pcs-api', 'ccd-data-store-api'], products: ['pcs', 'ccd'], tickets: ['hdpi-8713', 'pcs-api-pr-52'], workedIn: { repos: ['pcs-api'], products: ['pcs'] } },
    sliceText: 'S',
    feedText: '',
    offerPublish: true,
    offerNotify: false,
  });
  assert.match(p, /1 to 10 lowercase slugs/);
  assert.match(p, /At most 10 in total/);
  assert.match(p, /repos worked on: bare repo names without "hmcts\/"/);
  assert.match(p, /"libs" or "platops"/);
  assert.match(p, /<repo>-issue-<n> and <repo>-pr-<n>/);
  assert.match(p, /only from: infrastructure, feature, bugfix, frontend, backend, database, architecture, documentation, testing, ci, security, performance, dependencies, refactor\./);
  assert.match(p, /keep repos and tickets first, then products, then the one or two most relevant work types/);
  assert.match(p, /working directory therefore says nothing about which repo/);
  assert.match(p, /Tag cft-workspace only when the workspace's own files changed/);
  assert.match(p, /Prefer the ones worked in/);
  assert.match(p, /use its spelling/);
  assert.match(p, /Candidate repos worked in: pcs-api\n/);
  assert.match(p, /Candidate repos only read or mentioned: ccd-data-store-api\n/);
  assert.match(p, /Candidate products worked in: pcs\n/);
  assert.match(p, /Candidate products only read or mentioned: ccd\n/);
  assert.match(p, /Candidate tickets: hdpi-8713, pcs-api-pr-52\n/);
  assert.match(buildPrompt({ agentName: 'me', subscriptions: [], activeTopics: [], sliceText: '', feedText: '' }), /Candidate repos worked in: \(none\)\nCandidate repos only read or mentioned: \(none\)/);
});

const ROOT = '/work/hmcts';
const WS = 'cft-workspace';
const NONE_WORKED = { repos: [], products: [] };

test('candidateTopics finds repos and products in relative and absolute workspace paths', () => {
  const text = [
    'Edited apps/pcs/pcs-api/src/main/Foo.java and ./apps/ccd/ccd-data-store-api/build.gradle.',
    'Also /work/hmcts/libs/ccd-config-generator/README.md and `platops/cnp-flux-config`.',
    'Docs in apps/wa/docs/how-to.md, apps/xui/CLAUDE.md and apps/em/.claude/skills.',
    'Not these: /elsewhere/apps/foo/bar, src/apps/web/x, /work/other/libs/nope.',
  ].join('\n');
  assert.deepEqual(candidateTopics({ text, root: ROOT, workspaceRepo: WS }), {
    repos: ['pcs-api', 'ccd-data-store-api', 'ccd-config-generator', 'cnp-flux-config'],
    products: ['pcs', 'ccd', 'libs', 'platops', 'wa', 'xui', 'em'],
    tickets: [],
    workedIn: NONE_WORKED,
  });
});

test('candidateTopics puts the session repo, cwd and branch before mentions, and drops the workspace registration', () => {
  const found = candidateTopics({
    workspaceRepo: WS,
    text: 'see apps/ccd/ccd-data-store-api/x',
    cwd: '/work/hmcts/apps/dtsse/dtsse-agent-hub/src',
    repo: 'dtsse-agent-hub',
    branch: 'feature/VIBE-607-web-ui',
    root: ROOT,
  });
  assert.deepEqual(found, { repos: ['dtsse-agent-hub', 'ccd-data-store-api'], products: ['dtsse', 'ccd'], tickets: ['vibe-607'], workedIn: NONE_WORKED });
  assert.deepEqual(candidateTopics({ cwd: ROOT, repo: 'cft-workspace', branch: 'hdpi-77_retry', root: ROOT, workspaceRepo: WS }), {
    repos: [],
    products: [],
    tickets: ['hdpi-77'],
    workedIn: NONE_WORKED,
  });
  assert.deepEqual(candidateTopics({ cwd: `${ROOT}/apps/ccd/docs`, root: ROOT, workspaceRepo: WS }).products, []);
});

test('candidateTopics reads hmcts/ and github.com/hmcts/ references, with issue and PR numbers', () => {
  const text = [
    'Cloned hmcts/cnp-api-docs and https://github.com/hmcts/pcs-frontend.git earlier.',
    'Fixes https://github.com/hmcts/cft-workspace/pull/52 and github.com/hmcts/pcs-api/issues/7; see hmcts/ccd-data-store-api#2114.',
    'Ignore /home/me/hmcts/apps/pcs, hmctsprod.azurecr.io/hmcts/pcs-api:1 and hmcts/apps.',
  ].join('\n');
  assert.deepEqual(candidateTopics({ text, root: ROOT, workspaceRepo: WS }), {
    repos: ['cnp-api-docs', 'pcs-frontend', 'pcs-api', 'ccd-data-store-api'],
    products: [],
    tickets: ['cft-workspace-pr-52', 'pcs-api-issue-7', 'ccd-data-store-api-pr-2114'],
    workedIn: NONE_WORKED,
  });
});

test('candidateTopics lowercases Jira keys and skips standards and algorithms', () => {
  const text = 'HDPI-8713 is fixed; VIBE-607 next. Uses UTF-8, SHA-256, ISO-8601, AES-256, HTTP-2, TLS-1 and RFC-7231. HDPI-8713 again. lower-case-1 no.';
  assert.deepEqual(candidateTopics({ text, root: ROOT }).tickets, ['hdpi-8713', 'vibe-607']);
  assert.deepEqual(candidateTopics({ branch: 'feat/SHA-256-hash', root: ROOT }).tickets, []);
});

test('candidateTopics dedupes across sources and drops anything that is not a slug', () => {
  const long = 'a'.repeat(60);
  const text = `apps/pcs/pcs-api/x hmcts/pcs-api apps/pcs/pcs-api/y hmcts/${long}#12345 apps/Weird_Name/Repo_X/z`;
  const found = candidateTopics({ text, repo: 'pcs-api', root: ROOT });
  assert.deepEqual(found.repos, ['pcs-api', 'repo-x', long]);
  assert.deepEqual(found.products, ['pcs', 'weird-name']);
  assert.deepEqual(found.tickets, []);
  for (const slug of [...found.repos, ...found.products, ...found.tickets]) assert.match(slug, /^[a-z0-9][a-z0-9-]{0,63}$/);
});

test('haikuCommand honours overrides and only adds settings when present', () => {
  const none = haikuCommand({}, home.root);
  assert.deepEqual(none, { bin: 'claude', args: ['-p', '--model', 'haiku', '--bare', '--output-format', 'json'] });
  const over = haikuCommand({ AGENT_HUB_CLAUDE_BIN: '/x/claude', AGENT_HUB_CLAUDE_SETTINGS: 's.json' }, home.root);
  assert.deepEqual(over.args.slice(4, 6), ['--settings', 's.json']);
  assert.equal(over.bin, '/x/claude');
});

// ---- runStopWorker with mocked API, Haiku and socket ----

function fakeApi(feedMessages = []) {
  const calls = [];
  return {
    calls,
    async feed(id, q) {
      calls.push(['feed', q]);
      const since = Number(q.since ?? 0);
      const out = feedMessages.filter((m) => Number(m.id) > since);
      return { messages: out, cursor: out.length ? out[out.length - 1].id : String(since) };
    },
    async subscriptions() {
      return { topics: ['pcs-api'] };
    },
    async topics() {
      return { topics: [{ slug: 'pcs-api' }, { slug: 'ccd' }] };
    },
    async post(id, body) {
      calls.push(['post', body]);
      return { message: { id: '900' } };
    },
    async setCursor(id, cursor) {
      calls.push(['cursor', cursor]);
    },
  };
}

const feedItem = { id: '50', kind: 'post', title: 'Schema change', body: 'cases table renamed', topics: ['pcs-api'], author: { agent_name: 'bob' } };
let transcript;

function enable() {
  fs.mkdirSync(statePath(SID, ''), { recursive: true });
  fs.writeFileSync(statePath(SID, 'enabled'), 'x');
  writeJson(statePath(SID, 'agent.json'), { agent_id: 'agent-1', name: 'me' });
}

beforeEach(() => {
  fs.rmSync(home.hub, { recursive: true, force: true });
  enable();
  transcript = path.join(home.root, `${Math.random()}.jsonl`);
  fs.writeFileSync(transcript, line('user', 'rename the cases table') + line('assistant', 'Renamed cases to claim; migration V030 added.'));
});

function haikuReturning(value, prompts = []) {
  return async (prompt) => {
    prompts.push(prompt);
    return JSON.stringify({ type: 'result', result: JSON.stringify(value) });
  };
}

test('a pass publishes, notifies, and advances both cursors', async () => {
  const api = fakeApi([feedItem]);
  const delivered = [];
  const prompts = [];
  await runStopWorker({
    sid: SID,
    transcriptPath: transcript,
    api,
    haiku: haikuReturning({ publish: { topics: ['pcs-api'], title: 'Renamed cases table', body: 'V030 renames cases to claim.' }, notify: '#50 touches the same table.' }, prompts),
    deliver: async (sock, token, text) => delivered.push({ token, text }),
    now: () => 100 * MIN,
    config: cfg,
  });
  assert.deepEqual(api.calls.find((c) => c[0] === 'post')[1], { topics: ['pcs-api'], title: 'Renamed cases table', body: 'V030 renames cases to claim.' });
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0].token, 'tok');
  assert.match(delivered[0].text, /^\[agent-hub\] Feed notification/);
  assert.match(prompts[0], /Renamed cases to claim/);
  assert.match(prompts[0], /#50 \[pcs-api\] @bob: Schema change/);
  const cursors = readJson(statePath(SID, 'cursors.json'));
  assert.equal(cursors.transcript_offset, fs.statSync(transcript).size);
  assert.equal(cursors.feed_cursor, '50');
  assert.equal(cursors.last_publish_at, 100 * MIN);
  assert.equal(cursors.last_notify_at, 100 * MIN);
  assert.deepEqual(api.calls.find((c) => c[0] === 'cursor'), ['cursor', '50']);
});

test('a turn started by a notify does not trigger another notify or publish', async () => {
  const api = fakeApi([feedItem]);
  const opts = { sid: SID, transcriptPath: transcript, api, deliver: async () => {}, config: cfg };
  await runStopWorker({
    ...opts,
    haiku: haikuReturning({ publish: { topics: ['pcs-api'], title: 'T', body: 'B' }, notify: '#50' }),
    now: () => 100 * MIN,
  });
  fs.appendFileSync(transcript, line('user', '[agent-hub] Feed notification ...') + line('assistant', 'Noted #50.'));
  let called = false;
  await runStopWorker({ ...opts, haiku: async () => { called = true; return ''; }, now: () => 101 * MIN });
  assert.equal(called, false);
  assert.equal(api.calls.filter((c) => c[0] === 'post').length, 1);
});

test('within the notify window, a pass with only feed items skips Haiku; the feed cursor holds', async () => {
  const api = fakeApi([feedItem]);
  const opts = { sid: SID, transcriptPath: transcript, api, deliver: async () => {}, config: cfg };
  writeJson(statePath(SID, 'cursors.json'), { transcript_path: transcript, transcript_offset: fs.statSync(transcript).size, last_notify_at: 98 * MIN });
  let called = false;
  await runStopWorker({ ...opts, haiku: async () => { called = true; return ''; }, now: () => 100 * MIN });
  assert.equal(called, false);
  assert.equal(readJson(statePath(SID, 'cursors.json')).feed_cursor, undefined);
  await runStopWorker({ ...opts, haiku: haikuReturning({ publish: null, notify: null }), now: () => 104 * MIN });
  assert.equal(readJson(statePath(SID, 'cursors.json')).feed_cursor, '50');
});

test('a secret in the transcript is never sent to Haiku and nothing is published', async () => {
  fs.appendFileSync(transcript, line('assistant', `token is ${fakeSecrets.githubToken}`));
  const api = fakeApi([feedItem]);
  const prompts = [];
  await runStopWorker({
    sid: SID,
    transcriptPath: transcript,
    api,
    haiku: haikuReturning({ publish: { topics: ['pcs-api'], title: 'T', body: 'B' }, notify: null }, prompts),
    deliver: async () => {},
    now: () => 100 * MIN,
    config: cfg,
  });
  assert.equal(prompts.length, 1, 'still reads the feed');
  assert.ok(!prompts[0].includes(fakeSecrets.githubToken));
  assert.match(prompts[0], /PUBLISH is NOT allowed/);
  assert.equal(api.calls.filter((c) => c[0] === 'post').length, 0);
  assert.equal(readJson(statePath(SID, 'cursors.json')).transcript_offset, fs.statSync(transcript).size);
});

test('a secret in Haiku output is dropped', async () => {
  const api = fakeApi([feedItem]);
  const delivered = [];
  await runStopWorker({
    sid: SID,
    transcriptPath: transcript,
    api,
    haiku: haikuReturning({ publish: { topics: ['pcs-api'], title: 'T', body: `use ${fakeSecrets.password}` }, notify: `see ${fakeSecrets.jwt}` }),
    deliver: async (s, t, text) => delivered.push(text),
    now: () => 100 * MIN,
    config: cfg,
  });
  assert.equal(api.calls.filter((c) => c[0] === 'post').length, 0);
  assert.equal(delivered.length, 0);
});

test('invalid Haiku output publishes nothing but advances; a Haiku failure advances nothing', async () => {
  const api = fakeApi([feedItem]);
  const opts = { sid: SID, transcriptPath: transcript, api, deliver: async () => {}, now: () => 100 * MIN, config: cfg };
  await runStopWorker({ ...opts, haiku: async () => { throw new Error('no auth'); } });
  assert.equal(readJson(statePath(SID, 'cursors.json')), null);
  await runStopWorker({ ...opts, haiku: haikuReturning({ publish: { topics: ['NOPE'], title: 'T', body: 'B' }, notify: null }) });
  assert.equal(api.calls.filter((c) => c[0] === 'post').length, 0);
  assert.equal(readJson(statePath(SID, 'cursors.json')).feed_cursor, '50');
});

test('single flight: a held lock marks dirty; the holder reruns once for it', async () => {
  const lock = statePath(SID, 'worker.lock');
  fs.writeFileSync(lock, `${process.ppid}\n`);
  await runStopWorker({ sid: SID, api: fakeApi(), haiku: async () => '', deliver: async () => {}, config: cfg });
  assert.ok(fs.existsSync(statePath(SID, 'dirty')), 'second worker set dirty');
  fs.unlinkSync(lock);

  let passes = 0;
  const api = fakeApi();
  const origFeed = api.feed;
  api.feed = async (...a) => {
    passes++;
    if (passes === 1) fs.writeFileSync(statePath(SID, 'dirty'), 'x');
    return origFeed(...a);
  };
  await runStopWorker({ sid: SID, transcriptPath: transcript, api, haiku: haikuReturning({ publish: null, notify: null }), deliver: async () => {}, now: () => 100 * MIN, config: cfg });
  assert.equal(passes, 2);
  assert.ok(!fs.existsSync(lock), 'lock released');
  assert.ok(!fs.existsSync(statePath(SID, 'dirty')));
});

test('a stale lock from a dead process is reclaimed', async () => {
  fs.writeFileSync(statePath(SID, 'worker.lock'), '999999999\n');
  let ran = false;
  const api = fakeApi();
  api.feed = async () => {
    ran = true;
    return { messages: [], cursor: '0' };
  };
  await runStopWorker({ sid: SID, api, haiku: async () => '', deliver: async () => {}, config: cfg });
  assert.ok(ran);
});

test('a disabled session does nothing', async () => {
  fs.unlinkSync(statePath(SID, 'enabled'));
  let ran = false;
  const api = fakeApi();
  api.feed = async () => {
    ran = true;
    return { messages: [], cursor: '0' };
  };
  await runStopWorker({ sid: SID, api, haiku: async () => '', deliver: async () => {}, config: cfg });
  assert.equal(ran, false);
});

// ---- what the session touched ----

const W = '/work/cft-workspace';
const toolUse = (name, input, extra = {}) => ({ type: 'assistant', ...extra, message: { content: [{ type: 'tool_use', name, input }] } });
const jsonlOf = (entries) => `${entries.map((e) => JSON.stringify(e)).join('\n')}\n`;
const touchesOf = (entries, root = W) => extractTouches(jsonlOf(entries), { root, workspaceRepo: WS });
const slugs = (list) => list.map((e) => e.slug);

test('bashPaths follows cd, pushd and git -C, and picks up absolute and workspace paths', () => {
  assert.deepEqual(bashPaths('cd apps/dtsse/dtsse-agent-hub && yarn test', W), ['/work/cft-workspace/apps/dtsse/dtsse-agent-hub']);
  assert.deepEqual(bashPaths('git -C platops/cnp-flux-config status', W), ['/work/cft-workspace/platops/cnp-flux-config', '/work/cft-workspace/platops/cnp-flux-config']);
  assert.deepEqual(bashPaths('pushd /work/cft-workspace/libs/rse-cft-lib >/dev/null; ls src', W), ['/work/cft-workspace/libs/rse-cft-lib']);
  assert.deepEqual(bashPaths('cd apps/pcs && cd pcs-api && ls', W), ['/work/cft-workspace/apps/pcs', '/work/cft-workspace/apps/pcs/pcs-api']);
  assert.deepEqual(bashPaths('grep -r x apps/ccd/ccd-data-store-api "/work/cft-workspace/scripts/grep" --file=/work/cft-workspace/libs/a/b', W), [
    '/work/cft-workspace/apps/ccd/ccd-data-store-api',
    '/work/cft-workspace/scripts/grep',
    '/work/cft-workspace/libs/a/b',
  ]);
  assert.deepEqual(bashPaths('cd "$(git rev-parse --show-toplevel)" && ls apps/pcs/pcs-api; cat ~/.claude/x $HOME/y', W), []);
});

test('extractTouches weighs edits, Bash and reads and ranks repos and products', () => {
  const t = touchesOf([
    toolUse('Read', { file_path: '/work/cft-workspace/apps/ccd/ccd-data-store-api/README.md' }),
    toolUse('Grep', { pattern: 'x', path: 'apps/ccd/ccd-data-store-api/src' }),
    toolUse('Glob', { pattern: '**/*.ts', path: '/work/cft-workspace/apps/ccd/ccd-data-store-api' }),
    toolUse('Read', { file_path: '/work/cft-workspace/apps/ccd/ccd-data-store-api/b' }),
    toolUse('Bash', { command: 'git -C platops/cnp-flux-config status' }),
    toolUse('Edit', { file_path: '/work/cft-workspace/apps/dtsse/dtsse-agent-hub/src/a.ts', old_string: 'a', new_string: 'b' }),
    toolUse('Write', { file_path: '/work/cft-workspace/apps/dtsse/dtsse-agent-hub/src/b.ts', content: 'x' }),
    toolUse('Bash', { command: 'cd apps/dtsse/dtsse-agent-hub && yarn test' }),
  ]);
  assert.deepEqual(t.repos, [
    { slug: 'dtsse-agent-hub', weight: 8, workedIn: true, edited: true, dir: '/work/cft-workspace/apps/dtsse/dtsse-agent-hub', products: ['dtsse'] },
    { slug: 'ccd-data-store-api', weight: 4, workedIn: false, edited: false, dir: '/work/cft-workspace/apps/ccd/ccd-data-store-api', products: [] },
    { slug: 'cnp-flux-config', weight: 2, workedIn: true, edited: false, dir: '/work/cft-workspace/platops/cnp-flux-config', products: ['platops'] },
  ]);
  assert.deepEqual(t.products, [
    { slug: 'dtsse', weight: 8, workedIn: true, edited: true },
    { slug: 'ccd', weight: 4, workedIn: false, edited: false },
    { slug: 'platops', weight: 2, workedIn: true, edited: false },
  ]);
});

test('extractTouches maps workspace-owned paths to the workspace repo and ignores the rest', () => {
  const t = touchesOf([
    toolUse('Edit', { file_path: '/work/cft-workspace/apps/ccd/docs/x.md' }),
    toolUse('NotebookEdit', { notebook_path: '/work/cft-workspace/docs/n.ipynb' }),
    toolUse('MultiEdit', { file_path: '/work/cft-workspace/scripts/lib/agent-hub/agent.mjs' }),
    toolUse('Edit', { file_path: '/tmp/scratch.txt' }),
    toolUse('Write', { file_path: '/home/me/.claude/agent-hub/x' }),
    toolUse('Read', { file_path: W }),
    toolUse('Bash', { command: 'cd /work/cft-workspace && ls /tmp' }),
    toolUse('Edit', { file_path: '/work/cft-workspace/apps/pcs/pcs-api/src/X.java' }, { isSidechain: true }),
    toolUse('TodoWrite', { todos: [] }),
    { type: 'user', message: { content: [{ type: 'tool_result', content: '/work/cft-workspace/apps/xui/rpx-xui-webapp' }] } },
  ]);
  assert.deepEqual(t.repos, [{ slug: 'cft-workspace', weight: 9, workedIn: true, edited: true, dir: W, products: ['ccd'] }]);
  assert.deepEqual(slugs(t.products), ['ccd']);
});

test('candidateTopics ranks touched repos worked in first and keeps cft-workspace out of clone-only work', () => {
  const touches = touchesOf([
    toolUse('Read', { file_path: '/work/cft-workspace/apps/ccd/ccd-data-store-api/a' }),
    toolUse('Read', { file_path: '/work/cft-workspace/apps/ccd/ccd-data-store-api/b' }),
    toolUse('Read', { file_path: '/work/cft-workspace/apps/ccd/ccd-data-store-api/c' }),
    toolUse('Read', { file_path: '/work/cft-workspace/DOCS.md' }),
    toolUse('Bash', { command: 'cd apps/dtsse/dtsse-agent-hub && yarn test' }),
  ]);
  const found = candidateTopics({
    text: 'Fixed hmcts/cft-workspace#52 while in apps/pcs/pcs-api',
    touches,
    cwd: W,
    repo: 'cft-workspace',
    branch: 'feat/agent-hub',
    root: W,
    workspaceRepo: WS,
  });
  assert.deepEqual(found.repos, ['dtsse-agent-hub', 'ccd-data-store-api', 'cft-workspace', 'pcs-api']);
  assert.deepEqual(found.workedIn, { repos: ['dtsse-agent-hub'], products: ['dtsse'] });
  assert.deepEqual(found.products, ['dtsse', 'ccd', 'pcs']);

  const withScript = touchesOf([
    toolUse('Edit', { file_path: '/work/cft-workspace/apps/dtsse/dtsse-agent-hub/a' }),
    toolUse('Bash', { command: '/work/cft-workspace/scripts/agent-hub status' }),
  ]);
  const cloneOnly = touchesOf([toolUse('Edit', { file_path: '/work/cft-workspace/apps/dtsse/dtsse-agent-hub/a' })]);
  const clean = candidateTopics({ text: 'see hmcts/cft-workspace', touches: cloneOnly, cwd: W, repo: 'cft-workspace', root: W, workspaceRepo: WS });
  assert.deepEqual(clean.repos, ['dtsse-agent-hub']);
  assert.ok(candidateTopics({ touches: withScript, root: W, workspaceRepo: WS }).repos.includes('cft-workspace'), 'running a workspace script is a touch');
});

// ---- the registration follows the work ----

function followApi({ subscribed = [] } = {}) {
  const api = fakeApi();
  const subs = new Set(subscribed);
  api.subscriptions = async () => ({ topics: [...subs].sort() });
  api.register = async (body) => {
    api.calls.push(['register', body]);
    return { agent_id: 'agent-1', name: body.name };
  };
  api.subscribe = async (id, topics) => {
    api.calls.push(['subscribe', topics]);
    for (const t of topics) subs.add(t);
    return { topics: [...subs].sort() };
  };
  return api;
}

function followRun(api, entries, extra = {}) {
  fs.writeFileSync(transcript, jsonlOf([{ type: 'user', message: { content: 'go' } }, ...entries]));
  return runStopWorker({
    sid: SID,
    transcriptPath: transcript,
    api,
    haiku: haikuReturning({ publish: null, notify: null }),
    deliver: async () => {},
    now: () => 100 * MIN,
    config: cfg,
    root: W,
    branchOf: (dir) => (dir === '/work/cft-workspace/apps/dtsse/dtsse-agent-hub' ? 'VIBE-607-web-ui' : 'main'),
    ...extra,
  });
}

const logText = () => fs.readFileSync(statePath(SID, 'log'), 'utf8');

test('the stop worker re-registers on the repo worked in and subscribes to it and its product', async () => {
  writeJson(statePath(SID, 'agent.json'), { agent_id: 'agent-1', name: 'me', cwd: W, repo: null, branch: null, topics: ['pcs-api'] });
  const api = followApi({ subscribed: ['pcs-api'] });
  await followRun(api, [
    toolUse('Read', { file_path: '/work/cft-workspace/apps/ccd/ccd-data-store-api/a' }),
    toolUse('Edit', { file_path: '/work/cft-workspace/apps/dtsse/dtsse-agent-hub/src/a.ts' }),
    toolUse('Bash', { command: 'git -C platops/cnp-flux-config log' }),
  ]);
  const register = api.calls.find((c) => c[0] === 'register')[1];
  assert.equal(register.session_id, SID);
  assert.equal(register.repo, 'dtsse-agent-hub');
  assert.equal(register.branch, 'VIBE-607-web-ui');
  assert.equal(register.cwd, W);
  assert.equal(register.name, 'me');
  assert.ok(register.host);
  assert.deepEqual(api.calls.find((c) => c[0] === 'subscribe')[1], ['dtsse-agent-hub', 'dtsse', 'cnp-flux-config', 'platops']);
  const agent = readJson(statePath(SID, 'agent.json'));
  assert.equal(agent.repo, 'dtsse-agent-hub');
  assert.equal(agent.branch, 'VIBE-607-web-ui');
  assert.deepEqual(agent.topics, ['pcs-api', 'dtsse-agent-hub', 'dtsse', 'cnp-flux-config', 'platops']);
  assert.match(logText(), /stop-worker: now working in dtsse-agent-hub \(VIBE-607-web-ui\)/);
  assert.match(logText(), /stop-worker: subscribed to dtsse-agent-hub, dtsse, cnp-flux-config, platops/);

  api.calls.length = 0;
  await followRun(api, [toolUse('Edit', { file_path: '/work/cft-workspace/apps/dtsse/dtsse-agent-hub/src/b.ts' })]);
  assert.equal(api.calls.filter((c) => c[0] === 'register' || c[0] === 'subscribe').length, 0, 'nothing changed');
});

test('the stop worker does not follow reads, and follows the workspace only for its own edits', async () => {
  writeJson(statePath(SID, 'agent.json'), { agent_id: 'agent-1', name: 'me', cwd: W, repo: null, branch: null });
  const api = followApi();
  await followRun(api, [
    toolUse('Read', { file_path: '/work/cft-workspace/apps/ccd/ccd-data-store-api/a' }),
    toolUse('Grep', { pattern: 'x', path: '/work/cft-workspace/apps/pcs/pcs-api' }),
    toolUse('Bash', { command: '/work/cft-workspace/scripts/agent-hub status' }),
  ]);
  assert.equal(api.calls.filter((c) => c[0] === 'register' || c[0] === 'subscribe').length, 0);
  assert.equal(readJson(statePath(SID, 'agent.json')).repo, null);

  await followRun(api, [toolUse('Edit', { file_path: '/work/cft-workspace/scripts/lib/agent-hub/agent.mjs' })]);
  assert.equal(api.calls.find((c) => c[0] === 'register')[1].repo, 'cft-workspace');
  assert.deepEqual(api.calls.find((c) => c[0] === 'subscribe')[1], ['cft-workspace']);
});

test('a failing re-register or subscribe is logged and the pass still completes', async () => {
  writeJson(statePath(SID, 'agent.json'), { agent_id: 'agent-1', name: 'me', cwd: W, repo: null, branch: null });
  const api = followApi();
  api.register = async () => {
    throw new Error('boom');
  };
  api.subscribe = async () => {
    throw new Error('bang');
  };
  await followRun(api, [toolUse('Edit', { file_path: '/work/cft-workspace/apps/dtsse/dtsse-agent-hub/a' })]);
  assert.match(logText(), /stop-worker: re-register failed: boom/);
  assert.match(logText(), /stop-worker: subscribe failed: bang/);
  assert.equal(readJson(statePath(SID, 'cursors.json')).transcript_offset, fs.statSync(transcript).size);
});

test('the prompt lists the session touches as worked in and only read', async () => {
  writeJson(statePath(SID, 'agent.json'), { agent_id: 'agent-1', name: 'me', cwd: W, repo: 'cft-workspace', branch: 'feat/agent-hub' });
  const prompts = [];
  await followRun(followApi(), [
    toolUse('Read', { file_path: '/work/cft-workspace/apps/ccd/ccd-data-store-api/a' }),
    toolUse('Bash', { command: 'cd apps/dtsse/dtsse-agent-hub && yarn test' }),
  ], { haiku: haikuReturning({ publish: null, notify: null }, prompts) });
  assert.match(prompts[0], /Candidate repos worked in: dtsse-agent-hub\n/);
  assert.match(prompts[0], /Candidate repos only read or mentioned: ccd-data-store-api\n/);
  assert.ok(!prompts[0].includes('Candidate repos only read or mentioned: ccd-data-store-api, cft-workspace'));
});
