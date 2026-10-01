import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { AUTO_ENABLE_RETRY_MS, autoEnableOn, markOptedOut, maybeAutoEnable, runAutoEnable, waitForSessionEntry } from '../enable.mjs';
import { runHook } from '../hooks.mjs';
import { PROJECT_ROOT } from '../session.mjs';
import { tempClaudeHome } from './helpers.mjs';
import { createMockHub } from './mock-server.mjs';

const WRAPPER = path.join(PROJECT_ROOT, 'scripts', 'agent-hub');
const DEAD_PID = 999999999;
const ON = { AGENT_HUB_AUTO_ENABLE: 'true' };
let home;
const saved = {};

before(() => {
  home = tempClaudeHome();
  for (const k of [...Object.keys(home.env), 'AGENT_HUB_URL', 'AGENT_HUB_DEV_USER', 'AGENT_HUB_CLAUDE_PID']) saved[k] = process.env[k];
  Object.assign(process.env, home.env);
  delete process.env.AGENT_HUB_CLAUDE_PID;
});
after(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  home.cleanup();
});

function registry(sid, fields = {}) {
  const pid = fields.pid ?? DEAD_PID;
  fs.writeFileSync(path.join(home.claude, 'sessions', `${sid}-${pid}.json`), JSON.stringify({ pid, sessionId: sid, cwd: home.root, ...fields }));
}

function spawnStub() {
  const calls = [];
  const spawn = (sid, args, opts) => {
    calls.push({ sid, args, opts });
    return 4242;
  };
  return { calls, spawn };
}

const stateFile = (sid, name) => path.join(home.hub, sid, name);

test('AGENT_HUB_AUTO_ENABLE accepts true, 1 and yes in any case, and nothing else', () => {
  for (const v of ['true', 'TRUE', 'True', '1', 'yes', 'Yes', ' yes ']) assert.ok(autoEnableOn({ AGENT_HUB_AUTO_ENABLE: v }), v);
  for (const v of [undefined, '', 'false', '0', 'no', 'on', 'truthy']) assert.ok(!autoEnableOn({ AGENT_HUB_AUTO_ENABLE: v }), String(v));
});

test('off by default: SessionStart is a no-op and spawns nothing', async () => {
  registry('off-sess', { kind: 'interactive' });
  const { calls, spawn } = spawnStub();
  for (const event of ['SessionStart', 'UserPromptSubmit']) {
    assert.equal(await runHook(event, { session_id: 'off-sess', source: 'startup' }, {}, { spawn }), '');
  }
  assert.equal(calls.length, 0);
  assert.ok(!fs.existsSync(path.join(home.hub, 'off-sess')));
});

test('on and interactive: SessionStart starts a background enable and returns at once with no output', async () => {
  registry('on-sess', { kind: 'interactive' });
  const { calls, spawn } = spawnStub();
  for (const source of ['startup', 'resume', 'clear', 'compact']) {
    const out = await runHook('SessionStart', { session_id: 'on-sess', source, cwd: '/some/dir' }, ON, { spawn });
    assert.equal(out, '', source);
  }
  assert.equal(calls.length, 4);
  assert.deepEqual(calls[0].args, ['auto-enable', '--session', 'on-sess', '--cwd', '/some/dir']);
  assert.equal(calls[0].opts.env, ON);
  assert.ok(fs.existsSync(stateFile('on-sess', 'auto-enable.last')));
  assert.ok(!fs.existsSync(stateFile('on-sess', 'enabled')));
});

test('on but not interactive: skipped, and no state is written', async () => {
  registry('headless-sess', { kind: 'headless' });
  const { calls, spawn } = spawnStub();
  await runHook('SessionStart', { session_id: 'headless-sess', source: 'startup' }, { ...ON, CLAUDE_CODE_SESSION_ATTENDED: '1' }, { spawn });
  await runHook('SessionStart', { session_id: 'no-entry-sess', source: 'startup' }, ON, { spawn });
  await runHook('UserPromptSubmit', { session_id: 'no-entry-sess' }, { ...ON, CLAUDE_CODE_SESSION_ATTENDED: '0' }, { spawn });
  assert.equal(calls.length, 0);
  assert.ok(!fs.existsSync(path.join(home.hub, 'headless-sess')));
  assert.ok(!fs.existsSync(path.join(home.hub, 'no-entry-sess')));
});

test('without a registry entry, an attended session counts as interactive', async () => {
  const { calls, spawn } = spawnStub();
  await runHook('SessionStart', { session_id: 'attended-sess', source: 'startup' }, { ...ON, CLAUDE_CODE_SESSION_ATTENDED: '1' }, { spawn });
  assert.equal(calls.length, 1);
});

test('the nested Haiku session (AGENT_HUB_CHILD) is never auto-enabled', async () => {
  registry('child-auto', { kind: 'interactive' });
  const { calls, spawn } = spawnStub();
  await runHook('SessionStart', { session_id: 'child-auto', source: 'startup' }, { ...ON, AGENT_HUB_CHILD: '1' }, { spawn });
  assert.equal(calls.length, 0);
});

test('Stop and SessionEnd never auto-enable', async () => {
  registry('stop-auto', { kind: 'interactive' });
  const { calls, spawn } = spawnStub();
  await runHook('Stop', { session_id: 'stop-auto' }, ON, { spawn });
  await runHook('SessionEnd', { session_id: 'stop-auto', reason: 'logout' }, ON, { spawn });
  assert.equal(calls.length, 0);
});

test('a failed attempt is retried on UserPromptSubmit no more than once every 5 minutes', () => {
  registry('retry-sess', { kind: 'interactive' });
  const { calls, spawn } = spawnStub();
  let t = 1_000_000;
  const now = () => t;
  const go = (event) => maybeAutoEnable(event, 'retry-sess', { session_id: 'retry-sess', source: 'startup' }, { env: ON, spawn, now });
  assert.equal(go('SessionStart'), 'spawned');
  t += 60_000;
  assert.equal(go('UserPromptSubmit'), 'too-soon');
  t += AUTO_ENABLE_RETRY_MS - 60_000 - 1;
  assert.equal(go('UserPromptSubmit'), 'too-soon');
  t += 1;
  assert.equal(go('UserPromptSubmit'), 'spawned');
  t += 1000;
  assert.equal(go('UserPromptSubmit'), 'too-soon');
  assert.equal(calls.length, 2);
});

test('UserPromptSubmit attempts at once when there is no earlier attempt', () => {
  registry('late-sess', { kind: 'interactive' });
  const { calls, spawn } = spawnStub();
  assert.equal(maybeAutoEnable('UserPromptSubmit', 'late-sess', { session_id: 'late-sess' }, { env: ON, spawn }), 'spawned');
  assert.equal(calls.length, 1);
});

test('an opted-out session is skipped, and /clear in the same process inherits the opt-out', async () => {
  registry('opt-sess', { kind: 'interactive', pid: process.pid });
  markOptedOut('opt-sess');
  const { calls, spawn } = spawnStub();
  await runHook('SessionStart', { session_id: 'opt-sess', source: 'resume' }, ON, { spawn });
  await runHook('UserPromptSubmit', { session_id: 'opt-sess' }, ON, { spawn });

  fs.rmSync(path.join(home.claude, 'sessions', `opt-sess-${process.pid}.json`));
  registry('after-clear', { kind: 'interactive', pid: process.pid });
  await runHook('SessionStart', { session_id: 'after-clear', source: 'clear' }, ON, { spawn });
  assert.equal(calls.length, 0);
  assert.ok(fs.existsSync(stateFile('after-clear', 'opted-out')));
});

test('a failed background enable logs one line, writes no enabled flag and does not throw', async () => {
  registry('fail-sess', { kind: 'interactive' });
  process.env.AGENT_HUB_URL = 'http://127.0.0.1:9';
  process.env.AGENT_HUB_DEV_USER = 'u|n|e';
  try {
    await runAutoEnable({ sid: 'fail-sess', cwd: home.root });
  } finally {
    delete process.env.AGENT_HUB_URL;
    delete process.env.AGENT_HUB_DEV_USER;
  }
  const lines = fs.readFileSync(stateFile('fail-sess', 'log'), 'utf8').trim().split('\n');
  assert.equal(lines.length, 1);
  assert.match(lines[0], /auto-enable failed/);
  assert.ok(!fs.existsSync(stateFile('fail-sess', 'enabled')));
  assert.ok(!fs.existsSync(stateFile('fail-sess', 'auto-enable.lock')));
});

test('without an Azure login the background enable fails quietly', async () => {
  registry('noaz-sess', { kind: 'interactive' });
  const savedPath = process.env.PATH;
  process.env.PATH = path.join(home.root, 'empty-bin');
  try {
    await runAutoEnable({ sid: 'noaz-sess', cwd: home.root });
  } finally {
    process.env.PATH = savedPath;
  }
  assert.match(fs.readFileSync(stateFile('noaz-sess', 'log'), 'utf8'), /auto-enable failed.*not logged in to Azure/);
  assert.ok(!fs.existsSync(stateFile('noaz-sess', 'enabled')));
});

function run(args, { input = '', env }) {
  return new Promise((resolve) => {
    const child = execFile(WRAPPER, args, { cwd: home.root, env, timeout: 20000 }, (err, stdout, stderr) => {
      resolve({ status: err ? (err.code ?? 1) : 0, stdout, stderr });
    });
    child.stdin.end(input);
  });
}

function exited(pid) {
  try {
    process.kill(pid, 0);
    return false;
  } catch {
    return true;
  }
}

async function waitUntil(fn, what, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (!fn()) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}

test('end to end through the wrapper: auto-enable, opt out with disable, opt back in with enable', async () => {
  const hub = createMockHub({ pingMs: 200 });
  const url = await hub.listen();
  const SID = 'e2e-auto-sess';
  registry(SID, { kind: 'interactive', name: 'e2e-auto' });
  const env = {
    PATH: process.env.PATH,
    ...home.env,
    AGENT_HUB_URL: url,
    AGENT_HUB_DEV_USER: 'u-me|Me Tester|me@example.com',
    AGENT_HUB_CLAUDE_PID: String(DEAD_PID),
    AGENT_HUB_AUTO_ENABLE: 'true',
  };
  const registers = () => hub.calls.filter((c) => c.path === '/api/agent/register').length;
  try {
    const r = await run(['hook', 'SessionStart'], { input: JSON.stringify({ session_id: SID, source: 'startup', cwd: home.root }), env });
    assert.equal(r.status, 0);
    assert.equal(r.stdout, '');
    assert.equal(r.stderr, '');
    await hub.waitFor((c) => c.path === '/api/agent/register' && c.body.session_id === SID, 8000);
    await waitUntil(() => fs.existsSync(stateFile(SID, 'enabled')), 'the session to be enabled');
    await waitUntil(() => !fs.existsSync(stateFile(SID, 'auto-enable.lock')), 'the auto-enable worker to finish');
    const spawned = /spawned bridge pid (\d+)/.exec(fs.readFileSync(stateFile(SID, 'log'), 'utf8'));
    assert.ok(spawned, 'the auto-enable worker started a bridge');
    await waitUntil(() => exited(Number(spawned[1])), 'the bridge to exit (its Claude pid is dead)');

    const d = await run(['disable'], { env: { ...env, CLAUDE_CODE_SESSION_ID: SID } });
    assert.equal(d.status, 0, d.stderr);
    assert.ok(fs.existsSync(stateFile(SID, 'opted-out')));
    const before = registers();
    for (const source of ['resume', 'startup']) {
      const s = await run(['hook', 'SessionStart'], { input: JSON.stringify({ session_id: SID, source }), env });
      assert.equal(s.stdout, '');
    }
    await run(['hook', 'UserPromptSubmit'], { input: JSON.stringify({ session_id: SID }), env });
    await new Promise((r) => setTimeout(r, 300));
    assert.equal(registers(), before);
    assert.ok(!fs.existsSync(stateFile(SID, 'enabled')));

    const e = await run(['enable'], { env: { ...env, CLAUDE_CODE_SESSION_ID: SID } });
    assert.equal(e.status, 0, e.stderr);
    assert.match(e.stdout, /enabled as @/);
    assert.ok(!fs.existsSync(stateFile(SID, 'opted-out')));
    assert.ok(fs.existsSync(stateFile(SID, 'enabled')));
    await waitUntil(() => exited(Number(/\(pid (\d+)\)/.exec(e.stdout)[1])), 'the bridge to exit');
  } finally {
    await hub.close();
  }
});

test('waitForSessionEntry returns the registry entry once Claude Code writes it, and gives up after the timeout', async () => {
  const sid = 'sess-registry-wait';
  const started = Date.now();
  assert.equal(await waitForSessionEntry(sid, { timeoutMs: 200, intervalMs: 20 }), null);
  assert.ok(Date.now() - started >= 200);

  setTimeout(() => {
    fs.writeFileSync(path.join(home.claude, 'sessions', '424242.json'), JSON.stringify({ pid: 424242, sessionId: sid, name: 'agent-hub', nameSource: 'user' }));
  }, 100);
  const entry = await waitForSessionEntry(sid, { timeoutMs: 2000, intervalMs: 20 });
  assert.equal(entry?.name, 'agent-hub');
});
