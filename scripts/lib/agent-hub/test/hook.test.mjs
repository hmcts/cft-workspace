import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { PROJECT_ROOT } from '../session.mjs';
import { tempClaudeHome } from './helpers.mjs';

const WRAPPER = path.join(PROJECT_ROOT, 'scripts', 'agent-hub');
const DEAD_PID = '999999999';
let home;

before(() => {
  home = tempClaudeHome();
});
after(() => home.cleanup());

function hook(event, input, extraEnv = {}) {
  return spawnSync(WRAPPER, ['hook', event], {
    input: typeof input === 'string' ? input : JSON.stringify(input),
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      ...home.env,
      AGENT_HUB_URL: 'http://127.0.0.1:9',
      AGENT_HUB_DEV_USER: 'u|n|e',
      AGENT_HUB_CLAUDE_PID: DEAD_PID,
      ...extraEnv,
    },
    timeout: 10000,
  });
}

function enable(sid) {
  const dir = path.join(home.hub, sid);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'enabled'), 'x');
  return dir;
}

test('not enabled: every hook exits 0 silently, writes nothing and never starts node', () => {
  const bin = path.join(home.root, 'bin');
  fs.mkdirSync(bin, { recursive: true });
  const marker = path.join(home.root, 'node-was-run');
  fs.writeFileSync(path.join(bin, 'node'), `#!/bin/sh\ntouch "${marker}"\n`, { mode: 0o755 });
  for (const event of ['SessionStart', 'UserPromptSubmit', 'Stop', 'SessionEnd']) {
    const r = hook(event, { session_id: 'never-enabled', hook_event_name: event, source: 'startup' }, { PATH: `${bin}:${process.env.PATH}` });
    assert.equal(r.status, 0, event);
    assert.equal(r.stdout, '', event);
    assert.equal(r.stderr, '', event);
  }
  assert.ok(!fs.existsSync(marker), 'node was started on the no-op path');
  assert.ok(!fs.existsSync(home.hub), 'state was written for a session that never enabled comms');
});

test('garbage or empty input exits 0 silently', () => {
  for (const input of ['', 'not json', '{"session_id": "../../etc"}', '{"session_id": 5}']) {
    const r = hook('Stop', input);
    assert.equal(r.status, 0);
    assert.equal(r.stdout, '');
  }
  assert.ok(!fs.existsSync(home.hub));
});

test('the nested Haiku session (AGENT_HUB_CHILD) never runs hooks', () => {
  const dir = enable('child-sess');
  const r = hook('UserPromptSubmit', { session_id: 'child-sess' }, { AGENT_HUB_CHILD: '1' });
  assert.equal(r.status, 0);
  assert.ok(!fs.existsSync(path.join(dir, 'status')));
});

test('enabled: UserPromptSubmit marks busy, Stop marks idle and records the dirty flag while a worker runs', () => {
  const dir = enable('busy-sess');
  fs.writeFileSync(path.join(dir, 'bridge.pid'), `${process.pid}\n`);
  let r = hook('UserPromptSubmit', { session_id: 'busy-sess' });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
  assert.equal(fs.readFileSync(path.join(dir, 'status'), 'utf8'), 'busy\n');
  fs.writeFileSync(path.join(dir, 'worker.lock'), `${process.pid}\n`);
  r = hook('Stop', { session_id: 'busy-sess', transcript_path: '/nonexistent' });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
  assert.equal(fs.readFileSync(path.join(dir, 'status'), 'utf8'), 'idle\n');
  assert.ok(fs.existsSync(path.join(dir, 'dirty')));
});

test('enabled: SessionStart adds one line of context', () => {
  const dir = enable('start-sess');
  fs.writeFileSync(path.join(dir, 'bridge.pid'), `${process.pid}\n`);
  const r = hook('SessionStart', { session_id: 'start-sess', source: 'resume' });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /^agent-hub: comms are enabled for this session as @start-se\./);
  assert.equal(r.stdout.trim().split('\n').length, 1);
});

test('/clear hands comms over to the new session id in the same Claude process', () => {
  const dir = enable('old-sess');
  fs.writeFileSync(path.join(dir, 'agent.json'), JSON.stringify({ agent_id: 'a-old', claude_pid: Number(DEAD_PID), topics: ['pcs-api'] }));
  let r = hook('SessionEnd', { session_id: 'old-sess', reason: 'clear' });
  assert.equal(r.status, 0);
  assert.ok(fs.existsSync(path.join(home.hub, 'handoff', 'old-sess.json')));

  r = hook('SessionStart', { session_id: 'new-sess', source: 'clear' });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /comms are enabled/);
  const agent = JSON.parse(fs.readFileSync(path.join(home.hub, 'new-sess', 'agent.json'), 'utf8'));
  assert.deepEqual(agent.pending_subscribe, ['pcs-api']);
  assert.equal(agent.handed_off_from, 'old-sess');
  assert.ok(fs.existsSync(path.join(home.hub, 'new-sess', 'enabled')));
  assert.ok(!fs.existsSync(path.join(home.hub, 'handoff', 'old-sess.json')));
});

test('a handoff from a different Claude process is not adopted', () => {
  fs.mkdirSync(path.join(home.hub, 'handoff'), { recursive: true });
  fs.writeFileSync(path.join(home.hub, 'handoff', 'other.json'), JSON.stringify({ from: 'other', claude_pid: 12345, topics: [], at: Date.now() }));
  const r = hook('SessionStart', { session_id: 'unrelated-sess', source: 'clear' });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
  assert.ok(!fs.existsSync(path.join(home.hub, 'unrelated-sess', 'enabled')));
});

function fakeNode() {
  const bin = path.join(home.root, 'fake-node-bin');
  const marker = path.join(home.root, 'fake-node-ran');
  fs.mkdirSync(bin, { recursive: true });
  fs.writeFileSync(path.join(bin, 'node'), `#!/bin/sh\necho "$@" >> "${marker}"\n`, { mode: 0o755 });
  fs.rmSync(marker, { force: true });
  fs.rmSync(path.join(home.hub, 'handoff'), { recursive: true, force: true });
  return { PATH: `${bin}:${process.env.PATH}`, ran: () => (fs.existsSync(marker) ? fs.readFileSync(marker, 'utf8') : '') };
}

test('auto-enable unset, false or junk: the wrapper never starts node for a session that is not enabled', () => {
  const node = fakeNode();
  for (const value of [undefined, 'false', '0', 'no', 'on']) {
    for (const event of ['SessionStart', 'UserPromptSubmit', 'Stop', 'SessionEnd']) {
      const extra = { PATH: node.PATH };
      if (value !== undefined) extra.AGENT_HUB_AUTO_ENABLE = value;
      const r = hook(event, { session_id: 'auto-off', source: 'startup' }, extra);
      assert.equal(r.status, 0);
      assert.equal(r.stdout, '');
    }
  }
  assert.equal(node.ran(), '');
});

test('auto-enable on: only SessionStart and UserPromptSubmit start node, and not for an opted-out session', () => {
  const node = fakeNode();
  for (const value of ['true', 'TRUE', '1', 'Yes']) {
    for (const event of ['Stop', 'SessionEnd']) {
      hook(event, { session_id: 'auto-on' }, { PATH: node.PATH, AGENT_HUB_AUTO_ENABLE: value });
    }
  }
  assert.equal(node.ran(), '');
  for (const event of ['SessionStart', 'UserPromptSubmit']) {
    const r = hook(event, { session_id: 'auto-on', source: 'startup' }, { PATH: node.PATH, AGENT_HUB_AUTO_ENABLE: 'Yes' });
    assert.equal(r.status, 0);
  }
  assert.equal(node.ran().trim().split('\n').length, 2);
  assert.match(node.ran(), /hook SessionStart\n.*hook UserPromptSubmit/);

  const dir = path.join(home.hub, 'auto-opted-out');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'opted-out'), 'x');
  const before = node.ran();
  for (const event of ['SessionStart', 'UserPromptSubmit']) {
    hook(event, { session_id: 'auto-opted-out', source: 'resume' }, { PATH: node.PATH, AGENT_HUB_AUTO_ENABLE: 'true' });
  }
  assert.equal(node.ran(), before);
});

test('the wrapper parses under bash 3.2', { skip: spawnSync('docker', ['info'], { stdio: 'ignore', timeout: 10000 }).status !== 0 && 'docker is not available' }, () => {
  const r = spawnSync('docker', ['run', '--rm', '-v', `${PROJECT_ROOT}:/w`, '-w', '/w', 'bash:3.2', 'bash', '-n', 'scripts/agent-hub'], { encoding: 'utf8', timeout: 120000 });
  assert.equal(r.status, 0, r.stderr);
});
