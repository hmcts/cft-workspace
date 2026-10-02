// enable → bridge → mock hub → fake inbox socket → ack, plus the Stop worker and
// SessionEnd, all against in-process fakes and a throwaway HOME. Nothing touches a
// real session socket or ~/.claude.
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { PROJECT_ROOT } from '../session.mjs';
import { tempClaudeHome } from './helpers.mjs';
import { createMockHub } from './mock-server.mjs';

const WRAPPER = path.join(PROJECT_ROOT, 'scripts', 'agent-hub');
const SID = 'integration-sess-0001';
const TOKEN = 'fake-inbox-token';

let home;
let hub;
let url;
let inbox;
let fakeClaude;
let env;
const received = [];
const inboxWaiters = [];

function startInbox(socketPath) {
  const server = net.createServer((conn) => {
    let buf = '';
    const lines = [];
    conn.on('data', (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) !== -1) {
        lines.push(JSON.parse(buf.slice(0, i)));
        buf = buf.slice(i + 1);
      }
    });
    conn.on('end', () => {
      received.push(lines);
      for (const w of inboxWaiters.splice(0)) w();
    });
  });
  return new Promise((resolve) => server.listen(socketPath, () => resolve(server)));
}

async function waitForInbox(count, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (received.length < count) {
    if (Date.now() > deadline) throw new Error(`inbox got ${received.length} connection(s), wanted ${count}`);
    await new Promise((r) => {
      inboxWaiters.push(r);
      setTimeout(r, 200);
    });
  }
  return received[count - 1];
}

function run(args, { input, extraEnv = {} } = {}) {
  return new Promise((resolve) => {
    const child = execFile(WRAPPER, args, { cwd: home.root, env: { ...env, ...extraEnv }, timeout: 20000 }, (err, stdout, stderr) => {
      resolve({ status: err ? (err.code ?? 1) : 0, stdout, stderr });
    });
    child.stdin.end(input ?? '');
  });
}

const stateFile = (name) => path.join(home.hub, SID, name);
const bridgePid = () => Number.parseInt(fs.readFileSync(stateFile('bridge.pid'), 'utf8'), 10);

async function waitUntil(fn, what, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (!fn()) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}

before(async () => {
  home = tempClaudeHome();
  hub = createMockHub({ pingMs: 200 });
  url = await hub.listen();
  const socketPath = path.join(home.root, 'inbox.sock');
  inbox = await startInbox(socketPath);
  fakeClaude = spawn('sleep', ['300'], { stdio: 'ignore' });
  fs.writeFileSync(
    path.join(home.claude, 'sessions', `${fakeClaude.pid}.json`),
    JSON.stringify({ pid: fakeClaude.pid, sessionId: SID, cwd: home.root, name: 'itest-session', messagingSocketPath: socketPath }),
  );

  const haiku = path.join(home.root, 'fake-claude');
  fs.writeFileSync(
    haiku,
    `#!/usr/bin/env node
const fs = require('fs');
fs.writeFileSync(${JSON.stringify(path.join(home.root, 'haiku-call.json'))}, JSON.stringify({ argv: process.argv.slice(2), child: process.env.AGENT_HUB_CHILD, cwd: process.cwd() }));
const result = { publish: { topics: ['pcs-api'], title: 'Claim table renamed', body: 'V030 renames cases to claim.' }, notify: '#' + process.env.ITEST_FEED_ID + ' is about the same table; run scripts/agent-hub read ' + process.env.ITEST_FEED_ID };
process.stdout.write(JSON.stringify({ type: 'result', is_error: false, result: JSON.stringify(result) }));
`,
    { mode: 0o755 },
  );

  env = {
    PATH: process.env.PATH,
    ...home.env,
    AGENT_HUB_URL: url,
    AGENT_HUB_DEV_USER: 'u-me|Me Tester|me@example.com',
    AGENT_HUB_HEARTBEAT_MS: '300',
    AGENT_HUB_TRANSCRIPT_MS: '200',
    AGENT_HUB_CLAUDE_BIN: haiku,
    CLAUDE_CODE_SESSION_ID: SID,
    CLAUDE_CODE_MESSAGING_TOKEN: TOKEN,
  };
});

after(async () => {
  try {
    process.kill(bridgePid(), 'SIGKILL');
  } catch {}
  fakeClaude?.kill('SIGKILL');
  inbox?.close();
  await hub?.close();
  home?.cleanup();
});

let agentId;

test('enable registers, subscribes, and starts a bridge that opens the stream', async () => {
  const r = await run(['enable', 'pcs-api', 'HDPI-1234']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /enabled as @itest-session/);
  assert.match(r.stdout, /subscribed topics: hdpi-1234, pcs-api/);
  const register = await hub.waitFor((c) => c.path === '/api/agent/register');
  assert.equal(register.body.session_id, SID);
  assert.equal(register.body.name, 'itest-session');
  assert.equal(register.headers['x-dev-user'], 'u-me|Me Tester|me@example.com');
  agentId = [...hub.agents.values()][0].id;
  await hub.waitFor((c) => c.method === 'GET' && c.path === `/api/agent/${agentId}/stream`);
  assert.ok(fs.existsSync(stateFile('enabled')));
});

test('a direct message from the UI is written to the inbox socket, then acked', async () => {
  const msg = hub.sendDirectFromUser(agentId, 'Please check the claim migration.');
  const lines = await waitForInbox(1);
  assert.deepEqual(lines[0], { type: 'auth', token: TOKEN });
  assert.equal(lines[1].type, 'user');
  assert.equal(lines[1].message.role, 'user');
  const content = lines[1].message.content;
  assert.match(content, new RegExp(`^\\[agent-hub\\] Direct message #${msg.id} from Alice Smith <alice@example.com> \\(a person`));
  assert.match(content, new RegExp(`scripts/agent-hub reply ${msg.id} "<text>"`));
  assert.ok(content.endsWith('Please check the claim migration.'));
  await hub.waitFor((c) => c.method === 'POST' && c.path === `/api/agent/${agentId}/deliveries/${msg.id}/ack`);
  assert.equal(hub.deliveries.get(`${msg.id}:${agentId}`).state, 'delivered');
});

test('heartbeats carry the status the hooks record and the registry name', async () => {
  let r = await run(['hook', 'UserPromptSubmit'], { input: JSON.stringify({ session_id: SID, hook_event_name: 'UserPromptSubmit' }) });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
  const n = hub.calls.length;
  await hub.waitFor((c) => hub.calls.indexOf(c) >= n && c.path.endsWith('/heartbeat') && c.body.status === 'busy');
  r = await run(['hook', 'Stop'], { input: JSON.stringify({ session_id: SID, transcript_path: '/nonexistent' }) });
  assert.equal(r.status, 0);
  await hub.waitFor((c) => c.path.endsWith('/heartbeat') && c.body.status === 'idle' && c.body.name === 'itest-session');
  await waitUntil(() => !fs.existsSync(stateFile('worker.lock')), 'the first stop worker to finish');
});

test('reply goes to the message author via reply_to_message', async () => {
  const original = hub.sendDirectFromUser(agentId, 'ping');
  await waitForInbox(2);
  const r = await run(['reply', original.id, 'pong', 'from', 'the', 'agent']);
  assert.equal(r.status, 0, r.stderr);
  const call = await hub.waitFor((c) => c.path === `/api/agent/${agentId}/direct`);
  assert.deepEqual(call.body, { reply_to_message: original.id, body: 'pong from the agent' });
});

test('post refuses secret-shaped text and publishes clean text from stdin', async () => {
  const secret = `${'gh'}p_${'Q'.repeat(30)}`;
  let r = await run(['post', '--topics', 'pcs-api', '--title', 'Leak', '--body', `token ${secret}`]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /secret-shaped/);
  r = await run(['post', '--topics', 'pcs-api,Database', '--title', 'Migration done'], { input: 'V030 applied in AAT.' });
  assert.equal(r.status, 0, r.stderr);
  const call = await hub.waitFor((c) => c.path === `/api/agent/${agentId}/posts`);
  assert.deepEqual(call.body, { topics: ['pcs-api', 'database'], title: 'Migration done', body: 'V030 applied in AAT.' });
  r = await run(['post', '--topics', 'Not A Slug', '--title', 'x', '--body', 'y']);
  assert.equal(r.status, 2);
});

test('post accepts ten topics and refuses eleven', async () => {
  const ten = Array.from({ length: 10 }, (_, i) => `t${i + 1}`);
  let r = await run(['post', '--topics', ten.join(','), '--title', 'Ten topics', '--body', 'y']);
  assert.equal(r.status, 0, r.stderr);
  const call = await hub.waitFor((c) => c.path === `/api/agent/${agentId}/posts` && c.body.title === 'Ten topics');
  assert.deepEqual(call.body.topics, ten);
  r = await run(['post', '--topics', [...ten, 't11'].join(','), '--title', 'Eleven topics', '--body', 'y']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /at most 10 topics/);
});

test('read by id and by topic', async () => {
  const other = hub.addPost({ topics: ['pcs-api'], title: 'Heads up', bodyText: 'cases table is going away', fromAgent: 'bob-pcs' });
  let r = await run(['read', other.id]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Heads up\ncases table is going away/);
  r = await run(['read', 'pcs-api']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, new RegExp(`#${other.id} \\[pcs-api\\]`));
  assert.match(r.stdout, /Migration done/, 'a topic read includes the session\'s own posts');
  r = await run(['read']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, new RegExp(`#${other.id} \\[pcs-api\\]`));
  assert.doesNotMatch(r.stdout, /Migration done/, 'own posts are not in the feed');
});

test('read <topic> reads unsubscribed topics and returns the newest posts', async () => {
  const posts = [];
  for (let i = 0; i < 25; i++) posts.push(hub.addPost({ topics: ['zz-unsubscribed'], title: `Busy ${i}`, bodyText: 'x', fromAgent: 'dave-other' }));
  const r = await run(['read', 'zz-unsubscribed', '--limit', '5']);
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stderr, /subscribe first/);
  assert.deepEqual([...r.stdout.matchAll(/Busy (\d+)/g)].map((m) => Number(m[1])), [20, 21, 22, 23, 24]);
  const since = await run(['read', 'zz-unsubscribed', '--since', posts[21].id, '--limit', '100']);
  assert.equal(since.status, 0, since.stderr);
  assert.deepEqual([...since.stdout.matchAll(/Busy (\d+)/g)].map((m) => Number(m[1])), [22, 23, 24]);
});

test('the Stop hook runs a detached worker that publishes and notifies through the inbox', async () => {
  const feed = hub.addPost({ topics: ['pcs-api'], title: 'Claim rename planned', bodyText: 'We are renaming cases.', fromAgent: 'carol-pcs' });
  const transcript = path.join(home.root, 'transcript.jsonl');
  const entry = (type, content) => `${JSON.stringify({ type, message: { role: type, content } })}\n`;
  const edit = [{ type: 'tool_use', name: 'Edit', input: { file_path: path.join(PROJECT_ROOT, 'apps', 'zz-itest', 'zz-itest-repo', 'src', 'a.ts') } }];
  fs.writeFileSync(transcript, entry('user', 'rename the cases table') + entry('assistant', edit) + entry('assistant', 'Done: V030 renames cases to claim.'));
  const before = received.length;
  const registers = hub.calls.filter((c) => c.path === '/api/agent/register').length;
  const r = await run(['hook', 'Stop'], {
    input: JSON.stringify({ session_id: SID, transcript_path: transcript, hook_event_name: 'Stop' }),
    extraEnv: { ITEST_FEED_ID: feed.id },
  });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');

  const post = await hub.waitFor((c) => c.path === `/api/agent/${agentId}/posts` && c.body.title === 'Claim table renamed', 10000);
  assert.deepEqual(post.body.topics, ['pcs-api']);
  const lines = await waitForInbox(before + 1, 10000);
  assert.deepEqual(lines[0], { type: 'auth', token: TOKEN });
  assert.match(lines[1].message.content, /^\[agent-hub\] Feed notification/);
  assert.match(lines[1].message.content, new RegExp(`#${feed.id} is about the same table`));

  const call = JSON.parse(fs.readFileSync(path.join(home.root, 'haiku-call.json'), 'utf8'));
  assert.deepEqual(call.argv.slice(0, 4), ['-p', '--model', 'haiku', '--bare']);
  assert.ok(call.argv.includes('--output-format'));
  assert.equal(call.child, '1');
  assert.equal(fs.realpathSync(call.cwd), fs.realpathSync(PROJECT_ROOT));
  assert.match(call.argv.at(-1), /rename the cases table/);

  await waitUntil(() => !fs.existsSync(stateFile('worker.lock')), 'the worker to release its lock');
  const cursors = JSON.parse(fs.readFileSync(stateFile('cursors.json'), 'utf8'));
  assert.equal(cursors.transcript_offset, fs.statSync(transcript).size);
  assert.equal(cursors.feed_cursor, feed.id);
  assert.equal(hub.agents.get(agentId).read_cursor, Number(feed.id));

  assert.equal(hub.calls.filter((c) => c.path === '/api/agent/register').length, registers + 1);
  assert.equal(hub.agents.get(agentId).repo, 'zz-itest-repo');
  assert.equal(hub.agents.get(agentId).branch, null);
  assert.ok(['zz-itest-repo', 'zz-itest'].every((t) => hub.subscriptions.get(agentId).has(t)));
  assert.equal(JSON.parse(fs.readFileSync(stateFile('agent.json'), 'utf8')).repo, 'zz-itest-repo');
});

test('the bridge uploads the hook-recorded transcript, and transcript off|on|status control it', async () => {
  const transcript = fs.readFileSync(stateFile('transcript'), 'utf8').trim();
  const line = (id, text) => `${JSON.stringify({ type: 'user', uuid: id, timestamp: new Date().toISOString(), message: { role: 'user', content: text } })}\n`;
  const uploaded = () => [...(hub.transcripts.get(agentId)?.keys() ?? [])];
  fs.appendFileSync(transcript, line('itest-a', 'first upload'));
  await waitUntil(() => uploaded().includes('itest-a:0'), 'the upload');

  let r = await run(['transcript', 'status']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /transcript: uploaded while comms are enabled/);
  assert.match(r.stdout, new RegExp(`uploaded:   to byte \\d+ of ${fs.statSync(transcript).size}`));

  r = await run(['transcript', 'off']);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(stateFile('transcript-off')));
  fs.appendFileSync(transcript, line('itest-b', 'private'));
  r = await run(['transcript', 'status']);
  assert.match(r.stdout, /transcript: off for this session/);

  r = await run(['transcript', 'on']);
  assert.equal(r.status, 0, r.stderr);
  fs.appendFileSync(transcript, line('itest-c', 'public again'));
  await waitUntil(() => uploaded().includes('itest-c:0'), 'the upload after on');
  assert.ok(!uploaded().includes('itest-b:0'));

  r = await run(['transcript', 'sideways']);
  assert.equal(r.status, 2);
});

test('SessionEnd stops the bridge and marks the agent offline', async () => {
  const pid = bridgePid();
  const r = await run(['hook', 'SessionEnd'], { input: JSON.stringify({ session_id: SID, reason: 'logout' }) });
  assert.equal(r.status, 0);
  await hub.waitFor((c) => c.path === `/api/agent/${agentId}/offline`);
  await waitUntil(() => !fs.existsSync(stateFile('bridge.pid')), 'the pidfile to go');
  assert.throws(() => process.kill(pid, 0));
});

test('SessionStart restarts the bridge, which redelivers unacked messages and exits when Claude dies', async () => {
  const queued = hub.sendDirectFromUser(agentId, 'sent while offline');
  const before = received.length;
  const n = hub.calls.length;
  const r = await run(['hook', 'SessionStart'], { input: JSON.stringify({ session_id: SID, source: 'resume' }) });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /comms are enabled for this session as @itest-session/);
  const lines = await waitForInbox(before + 1);
  assert.match(lines[1].message.content, new RegExp(`#${queued.id} `));
  await hub.waitFor((c) => c.path.endsWith(`/deliveries/${queued.id}/ack`));

  const pid = bridgePid();
  fakeClaude.kill('SIGKILL');
  await hub.waitFor((c) => hub.calls.indexOf(c) >= n && c.path === `/api/agent/${agentId}/offline`);
  await waitUntil(() => !fs.existsSync(stateFile('bridge.pid')), 'the bridge to exit');
  await waitUntil(() => {
    try {
      process.kill(pid, 0);
      return false;
    } catch {
      return true;
    }
  }, 'the bridge process to exit');
});

test('disable removes the enabled flag so hooks go quiet', async () => {
  const r = await run(['disable']);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!fs.existsSync(stateFile('enabled')));
  const logBefore = fs.readFileSync(stateFile('log'), 'utf8');
  await run(['hook', 'Stop'], { input: JSON.stringify({ session_id: SID }) });
  await run(['hook', 'UserPromptSubmit'], { input: JSON.stringify({ session_id: SID }) });
  assert.equal(fs.readFileSync(stateFile('log'), 'utf8'), logBefore, 'log is silent after disable');
});
