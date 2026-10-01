// runBridge in-process against the mock hub, with a fake inbox, to check how it reconnects.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { createApi } from '../api.mjs';
import { RAPID_CLOSE_MS, RAPID_CLOSES_BEFORE_BACKOFF, reconnectDelay, runBridge } from '../bridge.mjs';
import { ensureStateDir, statePath, writeJson } from '../session.mjs';
import { tempClaudeHome } from './helpers.mjs';
import { createMockHub } from './mock-server.mjs';

const DEV_USER = 'u-me|Me Tester|me@example.com';
let home;
const saved = {};
let nextSession = 0;

before(() => {
  home = tempClaudeHome();
  for (const [k, v] of Object.entries(home.env)) {
    saved[k] = process.env[k];
    process.env[k] = v;
  }
});

after(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  home.cleanup();
});

async function waitUntil(fn, what, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (!fn()) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 20));
  }
}

// Registers an agent on a fresh mock hub and runs a bridge for it until `stop` is called.
async function startBridge(hubOptions) {
  const hub = createMockHub({ pingMs: 5000, ...hubOptions });
  const url = await hub.listen();
  const api = createApi({ baseUrl: url, devUser: DEV_USER });
  const sid = `bridge-test-${++nextSession}`;
  const { agent_id: agentId } = await api.register({ session_id: sid, name: sid });
  ensureStateDir(sid);
  fs.writeFileSync(statePath(sid, 'enabled'), '');
  writeJson(statePath(sid, 'agent.json'), { agent_id: agentId, session_id: sid, name: sid });
  const socketWrites = [];
  const deliver = async (_socketPath, _token, content) => {
    socketWrites.push(content);
  };
  const env = { ...process.env, AGENT_HUB_CLAUDE_PID: String(process.pid), CLAUDE_CODE_MESSAGING_TOKEN: 'tok' };
  const running = runBridge({ sid, env, api, deliver, heartbeatMs: 100 });
  const streamOpens = () => hub.calls.filter((c) => c.method === 'GET' && c.path === `/api/agent/${agentId}/stream`);
  return {
    hub,
    agentId,
    socketWrites,
    streamOpens,
    acks: (id) => hub.calls.filter((c) => c.path === `/api/agent/${agentId}/deliveries/${id}/ack`),
    async stop() {
      fs.rmSync(statePath(sid, 'enabled'));
      await running;
      await hub.close();
    },
  };
}

const gaps = (calls) => calls.slice(1).map((c, i) => c.at - calls[i].at);

test('reconnectDelay reconnects at once after a clean end and resets the backoff', () => {
  assert.deepEqual(reconnectDelay({ backoff: 8000, rapidCloses: 0 }, { clean: true, lastedMs: 25000 }), { delay: 0, backoff: 0, rapidCloses: 0 });
  assert.deepEqual(reconnectDelay({ backoff: 0, rapidCloses: 2 }, { clean: true, lastedMs: RAPID_CLOSE_MS }), { delay: 0, backoff: 0, rapidCloses: 0 });
});

test('reconnectDelay backs off exponentially after errors, as before', () => {
  let state = {};
  const delays = [];
  for (let i = 0; i < 8; i++) {
    state = reconnectDelay(state, { clean: false, lastedMs: 10 });
    delays.push(state.delay);
  }
  assert.deepEqual(delays, [1000, 2000, 4000, 8000, 16000, 32000, 60000, 60000]);
  assert.equal(reconnectDelay({ backoff: 32000 }, { clean: false, lastedMs: 60001 }).delay, 1000, 'a stream that lasted a minute resets it');
});

test('reconnectDelay falls back to backoff when streams keep ending just after they open', () => {
  let state = {};
  const delays = [];
  for (let i = 0; i < RAPID_CLOSES_BEFORE_BACKOFF + 2; i++) {
    state = reconnectDelay(state, { clean: true, lastedMs: RAPID_CLOSE_MS - 1 });
    delays.push(state.delay);
  }
  assert.deepEqual(delays, [0, 0, 1000, 2000, 4000]);
  assert.deepEqual(reconnectDelay(state, { clean: true, lastedMs: 25000 }), { delay: 0, backoff: 0, rapidCloses: 0 });
});

for (const reconnectEvent of [true, false]) {
  test(`a stream the server ends ${reconnectEvent ? 'with a reconnect event' : 'without one'} is reopened at once`, async () => {
    const bridge = await startBridge({ maxLifetimeMs: 2200, reconnectEvent });
    try {
      await waitUntil(() => bridge.streamOpens().length >= 3, 'three streams');
      for (const gap of gaps(bridge.streamOpens())) assert.ok(gap < 2200 + 500, `reopened ${gap - 2200}ms after the end`);
    } finally {
      await bridge.stop();
    }
  });
}

test('a message replayed after it was acked is written to the inbox once and acked again', async () => {
  const bridge = await startBridge({ maxLifetimeMs: 2200, replayAcked: true });
  try {
    await waitUntil(() => bridge.streamOpens().length >= 1, 'the first stream');
    const msg = bridge.hub.sendDirectFromUser(bridge.agentId, 'only once please');
    await waitUntil(() => bridge.streamOpens().length >= 3 && bridge.acks(msg.id).length >= 3, 'two replays and their acks');
    assert.equal(bridge.socketWrites.filter((w) => w.includes('only once please')).length, 1);
  } finally {
    await bridge.stop();
  }
});

test('a message whose ack failed is replayed on the next stream, acked, and written to the inbox once', async () => {
  const bridge = await startBridge({ maxLifetimeMs: 2200 });
  try {
    await waitUntil(() => bridge.streamOpens().length >= 1, 'the first stream');
    bridge.hub.failNextAcks(1);
    const msg = bridge.hub.sendDirectFromUser(bridge.agentId, 'ack me eventually');
    await waitUntil(() => bridge.hub.deliveries.get(`${msg.id}:${bridge.agentId}`).state === 'delivered', 'the ack to succeed');
    assert.equal(bridge.acks(msg.id).length, 2);
    assert.ok(bridge.streamOpens().length >= 2);
    assert.equal(bridge.socketWrites.filter((w) => w.includes('ack me eventually')).length, 1);
  } finally {
    await bridge.stop();
  }
});

test('a refused stream is retried with backoff', async () => {
  const bridge = await startBridge({});
  bridge.hub.failNextStreams(2);
  try {
    await waitUntil(() => bridge.streamOpens().length >= 3, 'three stream requests');
    const [first, second] = gaps(bridge.streamOpens());
    assert.ok(first >= 1000 && first < 1800, `first retry after ${first}ms`);
    assert.ok(second >= 2000 && second < 2800, `second retry after ${second}ms`);
  } finally {
    await bridge.stop();
  }
});

test('streams that end just after opening fall back to backoff', async () => {
  const bridge = await startBridge({ maxLifetimeMs: 20 });
  try {
    await waitUntil(() => bridge.streamOpens().length >= RAPID_CLOSES_BEFORE_BACKOFF + 1, 'the stream after the rapid closes');
    const delays = gaps(bridge.streamOpens());
    for (const gap of delays.slice(0, RAPID_CLOSES_BEFORE_BACKOFF - 1)) assert.ok(gap < 500, `rapid reconnect after ${gap}ms`);
    assert.ok(delays[RAPID_CLOSES_BEFORE_BACKOFF - 1] >= 1000, `backed off ${delays[RAPID_CLOSES_BEFORE_BACKOFF - 1]}ms`);
  } finally {
    await bridge.stop();
  }
});

test('a bridge that starts before the registry entry finds the Claude pid later and stops when it exits', async () => {
  const hub = createMockHub({ pingMs: 5000 });
  const url = await hub.listen();
  const api = createApi({ baseUrl: url, devUser: DEV_USER });
  const sid = `bridge-test-${++nextSession}`;
  const { agent_id: agentId } = await api.register({ session_id: sid, name: sid });
  ensureStateDir(sid);
  fs.writeFileSync(statePath(sid, 'enabled'), '');
  writeJson(statePath(sid, 'agent.json'), { agent_id: agentId, session_id: sid, name: sid });
  const env = { ...process.env, CLAUDE_CODE_MESSAGING_TOKEN: 'tok' };
  delete env.AGENT_HUB_CLAUDE_PID;
  const running = runBridge({ sid, env, api, deliver: async () => {}, heartbeatMs: 100 });
  try {
    await waitUntil(() => fs.readFileSync(statePath(sid, 'log'), 'utf8').includes('no Claude pid found yet'), 'the missing pid to be logged');
    const exited = execFileSync(process.execPath, ['-e', 'process.stdout.write(String(process.pid))'], { encoding: 'utf8' });
    writeJson(path.join(home.claude, 'sessions', `${exited}.json`), { pid: Number(exited), sessionId: sid, name: 'late-entry', kind: 'interactive' });
    await running;
    const log = fs.readFileSync(statePath(sid, 'log'), 'utf8');
    assert.match(log, new RegExp(`found claude pid ${exited}`));
    assert.match(log, new RegExp(`claude pid ${exited} exited`));
  } finally {
    fs.rmSync(statePath(sid, 'enabled'), { force: true });
    await hub.close();
  }
});
