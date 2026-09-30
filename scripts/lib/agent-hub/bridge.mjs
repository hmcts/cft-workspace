import fs from 'node:fs';
import { loadAgent, registerAgent } from './agent.mjs';
import { ApiError, createApi } from './api.mjs';
import { directEnvelope } from './envelope.mjs';
import {
  acquirePidFile,
  isEnabled,
  log,
  pidAlive,
  readText,
  releasePidFile,
  sessionInfo,
  statePath,
} from './session.mjs';
import { deliverToSocket } from './socket.mjs';
import { createSseParser } from './sse.mjs';

const MIN_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 60000;
// The service ends every stream within about 25s and the client reconnects at once. A stream that
// ends this soon after opening, this many times running, is a server that cannot hold one, so back off.
export const RAPID_CLOSE_MS = 2000;
export const RAPID_CLOSES_BEFORE_BACKOFF = 3;
// Acked ids are remembered so a replay that races the ack is not written to the inbox twice.
const DELIVERED_MEMORY = 1000;

export function nextBackoff(current) {
  return Math.min(MAX_BACKOFF_MS, current ? current * 2 : MIN_BACKOFF_MS);
}

// How long to wait before the next connection. `clean` is a stream that ended without an error,
// with or without a `reconnect` event; `lastedMs` is how long it was open.
export function reconnectDelay({ backoff = 0, rapidCloses = 0 } = {}, { clean, lastedMs }) {
  if (!clean) {
    const next = nextBackoff(lastedMs > 60000 ? 0 : backoff);
    return { delay: next, backoff: next, rapidCloses: 0 };
  }
  if (lastedMs >= RAPID_CLOSE_MS) return { delay: 0, backoff: 0, rapidCloses: 0 };
  const rapid = rapidCloses + 1;
  if (rapid < RAPID_CLOSES_BEFORE_BACKOFF) return { delay: 0, backoff: 0, rapidCloses: rapid };
  const next = nextBackoff(backoff);
  return { delay: next, backoff: next, rapidCloses: rapid };
}

export function readStatus(sid) {
  return readText(statePath(sid, 'status')) === 'busy' ? 'busy' : 'idle';
}

export async function runBridge({
  sid,
  env = process.env,
  api = createApi(),
  deliver = deliverToSocket,
  heartbeatMs = Number(env.AGENT_HUB_HEARTBEAT_MS) || 30000,
  idleTimeoutMs = Number(env.AGENT_HUB_STREAM_IDLE_MS) || 45000,
}) {
  const pidFile = statePath(sid, 'bridge.pid');
  if (!acquirePidFile(pidFile)) {
    log(sid, 'bridge already running; exiting');
    return;
  }

  let agent = loadAgent(sid);
  let stopping = false;
  let stopped = null;
  let controller = null;
  let heartbeatTimer = null;
  let wake = null;
  const delivered = new Set();
  const remember = (id) => {
    delivered.add(id);
    if (delivered.size > DELIVERED_MEMORY) delivered.delete(delivered.values().next().value);
  };
  const claudePid = sessionInfo(sid, env).pid;
  if (!claudePid) log(sid, 'no Claude pid found; relying on SessionEnd to stop the bridge');

  const sleep = (ms) =>
    new Promise((resolve) => {
      const t = setTimeout(resolve, ms);
      wake = () => {
        clearTimeout(t);
        resolve();
      };
    });

  function shutdown(reason) {
    if (!stopped) stopped = doShutdown(reason);
    return stopped;
  }

  async function doShutdown(reason) {
    stopping = true;
    log(sid, `bridge stopping: ${reason}`);
    clearInterval(heartbeatTimer);
    controller?.abort();
    wake?.();
    if (agent?.agent_id) {
      try {
        await api.offline(agent.agent_id, { timeoutMs: 5000 });
      } catch (e) {
        log(sid, `offline failed: ${e.message}`);
      }
    }
    releasePidFile(pidFile);
  }

  function shouldStop() {
    if (fs.existsSync(statePath(sid, 'bridge.stop'))) return 'stop file';
    if (!isEnabled(sid)) return 'comms disabled';
    if (claudePid && !pidAlive(claudePid)) return `claude pid ${claudePid} exited`;
    return null;
  }

  async function heartbeat() {
    const reason = shouldStop();
    if (reason) return shutdown(reason);
    if (!agent?.agent_id) return;
    try {
      await api.heartbeat(agent.agent_id, { status: readStatus(sid), name: sessionInfo(sid, env).name });
    } catch (e) {
      log(sid, `heartbeat failed: ${e.message}`);
    }
  }

  async function handleDirect(event) {
    let message;
    try {
      message = JSON.parse(event.data).message;
    } catch {
      log(sid, `unparseable direct event id=${event.id}`);
      return;
    }
    if (!message?.id) return;
    if (!delivered.has(message.id)) {
      const info = sessionInfo(sid, env);
      try {
        await deliver(info.socketPath, env.CLAUDE_CODE_MESSAGING_TOKEN, directEnvelope(message));
        remember(message.id);
        log(sid, `delivered direct #${message.id}`);
      } catch (e) {
        // Unacked, so the service resends it on the next connection.
        log(sid, `socket delivery of #${message.id} failed: ${e.message}`);
        return;
      }
    }
    try {
      await api.ack(agent.agent_id, message.id);
    } catch (e) {
      log(sid, `ack of #${message.id} failed: ${e.message}`);
    }
  }

  async function consume(res) {
    const decoder = new TextDecoder();
    let chain = Promise.resolve();
    let idleTimer = null;
    let reconnect = false;
    const resetIdle = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        log(sid, `no stream traffic for ${idleTimeoutMs}ms; reconnecting`);
        controller?.abort();
      }, idleTimeoutMs);
    };
    const parser = createSseParser({
      onEvent: (event) => {
        if (event.event === 'direct') chain = chain.then(() => handleDirect(event));
        else if (event.event === 'reconnect') reconnect = true;
      },
    });
    resetIdle();
    try {
      for await (const chunk of res.body) {
        resetIdle();
        parser.push(decoder.decode(chunk, { stream: true }));
        if (reconnect) break;
      }
    } finally {
      clearTimeout(idleTimer);
      await chain;
    }
    return { lastEventId: parser.lastEventId, reconnect };
  }

  process.on('SIGTERM', () => shutdown('SIGTERM').then(() => process.exit(0)));
  process.on('SIGINT', () => shutdown('SIGINT').then(() => process.exit(0)));

  log(sid, `bridge started (claude pid ${claudePid ?? 'unknown'})`);
  heartbeatTimer = setInterval(() => {
    heartbeat().catch((e) => log(sid, `heartbeat error: ${e.message}`));
  }, heartbeatMs);

  let retry = {};
  let lastEventId = '';
  let clean = false;
  while (!stopping) {
    const reason = shouldStop();
    if (reason) {
      await shutdown(reason);
      break;
    }
    let opened = Date.now();
    const afterClean = clean;
    clean = false;
    try {
      if (!agent?.agent_id) agent = (await registerAgent(api, sid, { cwd: agent?.cwd })).agent;
      controller = new AbortController();
      const res = await api.stream(agent.agent_id, { signal: controller.signal, lastEventId });
      opened = Date.now();
      if (!afterClean) {
        log(sid, 'stream connected');
        await heartbeat();
      }
      const ended = await consume(res);
      lastEventId = ended.lastEventId || lastEventId;
      clean = true;
      if (!ended.reconnect) log(sid, 'stream ended without a reconnect event');
    } catch (e) {
      if (stopping) break;
      if (e instanceof ApiError && e.status === 404) {
        log(sid, 'agent unknown to the service; re-registering');
        agent = { ...agent, agent_id: null };
      } else if (e.name !== 'AbortError') {
        log(sid, `stream error: ${e.message}`);
      }
    }
    if (stopping) break;
    retry = reconnectDelay(retry, { clean, lastedMs: Date.now() - opened });
    if (clean && retry.delay > 0) log(sid, `streams keep ending within ${RAPID_CLOSE_MS}ms; backing off ${retry.delay}ms`);
    if (retry.delay > 0) await sleep(retry.delay);
  }
  clearInterval(heartbeatTimer);
  await stopped;
}
