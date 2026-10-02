// In-memory implementation of apps/dtsse/dtsse-agent-hub/docs/agent-api.md for tests.
// Auth is X-Dev-User only (`<oid>|<name>|<email>`), as the service's AGENT_AUTH_DISABLED mode.
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { MAX_POST_TOPICS } from '../agent.mjs';

const TOPIC_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const TRANSCRIPT_KEY_RE = /^[A-Za-z0-9:_-]{1,200}$/;
const TRANSCRIPT_ROLES = new Set(['user', 'assistant', 'tool_use', 'tool_result', 'system']);
const TRANSCRIPT_MAX_REQUEST = 256 * 1024;
const TRANSCRIPT_MAX_CONTENT = 16384;

// Why the service would refuse a transcript batch with 400, or null.
function transcriptProblem(body, rawBytes) {
  if (rawBytes > TRANSCRIPT_MAX_REQUEST) return 'request too large';
  if (typeof body.session_id !== 'string' || !body.session_id) return 'session_id required';
  if (!Array.isArray(body.entries) || body.entries.length < 1 || body.entries.length > 100) return 'entries must hold 1-100 items';
  for (const e of body.entries) {
    if (typeof e.key !== 'string' || !TRANSCRIPT_KEY_RE.test(e.key)) return 'bad key';
    if (!TRANSCRIPT_ROLES.has(e.role)) return 'bad role';
    if (!e.content || typeof e.content !== 'object') return 'content required';
    if (Buffer.byteLength(JSON.stringify(e.content)) > TRANSCRIPT_MAX_CONTENT) return 'content too large';
    if (typeof e.truncated !== 'boolean' || typeof e.redacted !== 'boolean') return 'flags must be booleans';
    if (e.message_id !== null && typeof e.message_id !== 'string') return 'bad message_id';
    if (typeof e.occurred_at !== 'string' || Number.isNaN(Date.parse(e.occurred_at))) return 'bad occurred_at';
  }
  return null;
}

// `maxLifetimeMs` ends each stream like the service does, with `event: reconnect` unless
// `reconnectEvent` is false. `replayAcked` replays delivered messages too, as a replay that raced
// the ack would.
export function createMockHub({ pingMs = 15000, maxLifetimeMs = 0, reconnectEvent = true, replayAcked = false } = {}) {
  const options = { maxLifetimeMs, reconnectEvent, replayAcked };
  const failures = { stream: [], ack: [], transcript: [] };
  const transcripts = new Map();
  const users = new Map();
  const agents = new Map();
  const messages = [];
  const subscriptions = new Map();
  const deliveries = new Map();
  const streams = new Map();
  const calls = [];
  const waiters = [];
  let nextId = 1000;

  function record(call) {
    call.at = Date.now();
    calls.push(call);
    for (const w of [...waiters]) {
      if (w.match(call)) {
        waiters.splice(waiters.indexOf(w), 1);
        clearTimeout(w.timer);
        w.resolve(call);
      }
    }
  }

  function waitFor(match, timeoutMs = 5000) {
    const existing = calls.find(match);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve, reject) => {
      const w = { match, resolve };
      waiters.push(w);
      w.timer = setTimeout(() => {
        const i = waiters.indexOf(w);
        if (i !== -1) {
          waiters.splice(i, 1);
          reject(new Error('timed out waiting for mock call'));
        }
      }, timeoutMs);
    });
  }

  function authorOf(msg) {
    const owner = users.get(msg.author_oid) || {};
    const agent = msg.author_agent_id ? agents.get(msg.author_agent_id) : null;
    return {
      type: agent ? 'agent' : 'user',
      agent_id: agent?.id ?? null,
      agent_name: agent?.name ?? null,
      owner_name: owner.name ?? 'unknown',
      owner_email: owner.email ?? null,
    };
  }

  function view(msg) {
    return {
      id: String(msg.id),
      kind: msg.kind,
      title: msg.title ?? null,
      body: msg.body,
      topics: msg.topics,
      in_reply_to: msg.in_reply_to ?? null,
      target_agent_id: msg.target_agent_id ?? null,
      created_at: msg.created_at,
      author: authorOf(msg),
    };
  }

  function sendEvent(agentId, msg) {
    const res = streams.get(agentId);
    if (res) res.write(`id: ${msg.id}\nevent: direct\ndata: ${JSON.stringify({ message: view(msg) })}\n\n`);
  }

  function addMessage(fields) {
    const msg = { id: nextId++, created_at: new Date().toISOString(), topics: [], ...fields };
    messages.push(msg);
    if (msg.kind === 'direct' && msg.target_agent_id) {
      deliveries.set(`${msg.id}:${msg.target_agent_id}`, { message_id: msg.id, agent_id: msg.target_agent_id, state: 'queued' });
      sendEvent(msg.target_agent_id, msg);
    }
    return msg;
  }

  function send(res, status, body) {
    res.writeHead(status, body === undefined ? {} : { 'Content-Type': 'application/json' });
    res.end(body === undefined ? '' : JSON.stringify(body));
  }

  async function readBody(req) {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    req.rawBytes = Buffer.byteLength(raw);
    return raw ? JSON.parse(raw) : {};
  }

  function checkTopics(list, min, max) {
    if (!Array.isArray(list)) return null;
    const out = list.map((t) => String(t).toLowerCase());
    if (out.length < min || out.length > max || !out.every((t) => TOPIC_RE.test(t))) return null;
    return [...new Set(out)];
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://mock');
    const dev = req.headers['x-dev-user'];
    let body = {};
    try {
      body = req.method === 'GET' ? {} : await readBody(req);
    } catch {
      return send(res, 400, { error: 'bad json' });
    }
    record({ method: req.method, path: url.pathname, query: Object.fromEntries(url.searchParams), body, headers: req.headers });
    if (!dev) return send(res, 401, { error: 'unauthenticated' });
    const [oid, name, email] = String(dev).split('|');
    users.set(oid, { oid, name, email });

    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] !== 'api' || parts[1] !== 'agent') return send(res, 404, { error: 'not found' });

    if (req.method === 'POST' && parts[2] === 'register') {
      let agent = [...agents.values()].find((a) => a.session_id === body.session_id);
      if (!agent) {
        agent = { id: randomUUID(), owner_oid: oid };
        agents.set(agent.id, agent);
        subscriptions.set(agent.id, new Set());
      }
      Object.assign(agent, { session_id: body.session_id, name: body.name, cwd: body.cwd, repo: body.repo, branch: body.branch, host: body.host, status: 'idle' });
      return send(res, 200, { agent_id: agent.id, name: agent.name });
    }
    if (req.method === 'GET' && parts[2] === 'topics' && parts[4] === 'messages') {
      const posts = messages.filter((m) => m.kind === 'post' && m.topics.includes(parts[3]));
      const limit = Math.min(100, Number(url.searchParams.get('limit') || 100));
      const since = url.searchParams.get('since');
      const out = since === null ? posts.slice(-limit) : posts.filter((m) => m.id > Number(since)).slice(0, limit);
      return send(res, 200, { messages: out.map(view) });
    }
    if (req.method === 'GET' && parts[2] === 'topics') {
      const counts = new Map();
      for (const m of messages) for (const t of m.topics) counts.set(t, { slug: t, message_count: (counts.get(t)?.message_count || 0) + 1, last_message_at: m.created_at });
      return send(res, 200, { topics: [...counts.values()].filter((t) => t.slug.startsWith(url.searchParams.get('prefix') || '')).reverse() });
    }
    if (req.method === 'GET' && parts[2] === 'agents') {
      return send(res, 200, {
        agents: [...agents.values()].filter((a) => a.owner_oid === oid).map((a) => ({ id: a.id, name: a.name, status: a.status, repo: a.repo, branch: a.branch, last_heartbeat_at: a.last_heartbeat_at ?? null, owner: users.get(a.owner_oid) })),
      });
    }
    if (req.method === 'GET' && parts[2] === 'messages') {
      const msg = messages.find((m) => String(m.id) === parts[3]);
      return msg ? send(res, 200, { message: view(msg) }) : send(res, 404, { error: 'no such message' });
    }

    const agent = agents.get(parts[2]);
    if (!agent) return send(res, 404, { error: 'no such agent' });
    if (agent.owner_oid !== oid) return send(res, 403, { error: 'forbidden' });
    const action = parts[3];

    if (req.method === 'POST' && action === 'heartbeat') {
      Object.assign(agent, { status: body.status, name: body.name || agent.name, last_heartbeat_at: new Date().toISOString() });
      return send(res, 204);
    }
    if (req.method === 'POST' && action === 'offline') {
      agent.status = 'offline';
      streams.get(agent.id)?.end();
      return send(res, 204);
    }
    if (req.method === 'GET' && action === 'stream') {
      const status = failures.stream.shift();
      if (status) return send(res, status, { error: 'stream refused' });
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
      res.flushHeaders();
      streams.set(agent.id, res);
      const ping = setInterval(() => res.write(': ping\n\n'), pingMs);
      const lifetime = options.maxLifetimeMs
        ? setTimeout(() => {
            if (options.reconnectEvent) res.write('event: reconnect\ndata: {}\n\n');
            res.end();
          }, options.maxLifetimeMs)
        : null;
      req.on('close', () => {
        clearInterval(ping);
        clearTimeout(lifetime);
        if (streams.get(agent.id) === res) streams.delete(agent.id);
      });
      for (const d of deliveries.values()) {
        if (d.agent_id === agent.id && (d.state === 'queued' || options.replayAcked)) sendEvent(agent.id, messages.find((m) => m.id === d.message_id));
      }
      return;
    }
    if (req.method === 'POST' && action === 'deliveries' && parts[5] === 'ack') {
      const d = deliveries.get(`${parts[4]}:${agent.id}`);
      if (!d) return send(res, 404, { error: 'no such delivery' });
      const status = failures.ack.shift();
      if (status) return send(res, status, { error: 'ack failed' });
      d.state = 'delivered';
      return send(res, 204);
    }
    if (req.method === 'GET' && action === 'feed') {
      const subs = subscriptions.get(agent.id);
      const since = Number(url.searchParams.get('since') ?? agent.read_cursor ?? 0);
      const limit = Math.min(100, Number(url.searchParams.get('limit') || 100));
      const out = messages
        .filter((m) => m.kind === 'post' && m.id > since && m.author_agent_id !== agent.id && m.topics.some((t) => subs.has(t)))
        .slice(0, limit);
      return send(res, 200, { messages: out.map(view), cursor: String(out.length ? out[out.length - 1].id : since) });
    }
    if (req.method === 'POST' && action === 'cursor') {
      agent.read_cursor = Number(body.cursor);
      return send(res, 204);
    }
    if (req.method === 'POST' && action === 'posts') {
      const topics = checkTopics(body.topics, 1, MAX_POST_TOPICS);
      if (!topics) return send(res, 400, { error: `topics must be 1-${MAX_POST_TOPICS} valid slugs` });
      const msg = addMessage({ kind: 'post', author_agent_id: agent.id, author_oid: oid, topics, title: body.title, body: body.body, in_reply_to: body.in_reply_to });
      return send(res, 201, { message: view(msg) });
    }
    if (req.method === 'POST' && action === 'direct') {
      let target = null;
      let inReplyTo = null;
      if (body.reply_to_message) {
        const orig = messages.find((m) => String(m.id) === String(body.reply_to_message));
        if (!orig) return send(res, 404, { error: 'no such message' });
        target = orig.author_agent_id ? agents.get(orig.author_agent_id) : null;
        inReplyTo = String(orig.id);
      } else {
        const matches = [...agents.values()].filter((a) => a.id === body.to_agent || a.name === body.to_agent);
        if (matches.length > 1) return send(res, 409, { error: 'ambiguous', candidates: matches.map((a) => ({ id: a.id, name: a.name, owner_name: users.get(a.owner_oid)?.name })) });
        if (!matches.length) return send(res, 404, { error: 'no such agent' });
        target = matches[0];
      }
      const msg = addMessage({ kind: 'direct', author_agent_id: agent.id, author_oid: oid, target_agent_id: target?.id ?? null, body: body.body, in_reply_to: inReplyTo });
      return send(res, 201, { message: view(msg) });
    }
    if (req.method === 'POST' && action === 'transcript') {
      const status = failures.transcript.shift();
      if (status) return send(res, status, { error: 'transcript failed' });
      const problem = transcriptProblem(body, req.rawBytes);
      if (problem) return send(res, 400, { error: problem });
      if (!transcripts.has(agent.id)) transcripts.set(agent.id, new Map());
      const stored = transcripts.get(agent.id);
      let accepted = 0;
      for (const e of body.entries) {
        if (stored.has(e.key)) continue;
        stored.set(e.key, { ...e, session_id: body.session_id });
        accepted++;
      }
      return send(res, 200, { accepted });
    }
    if (action === 'subscriptions') {
      const subs = subscriptions.get(agent.id);
      if (req.method === 'GET') return send(res, 200, { topics: [...subs].sort() });
      const topics = checkTopics(body.topics, 1, 200);
      if (!topics) return send(res, 400, { error: 'invalid topics' });
      for (const t of topics) req.method === 'PUT' ? subs.add(t) : subs.delete(t);
      return send(res, 200, { topics: [...subs].sort() });
    }
    return send(res, 404, { error: 'not found' });
  });

  return {
    server,
    calls,
    waitFor,
    agents,
    subscriptions,
    messages,
    deliveries,
    streams,
    transcripts,
    options,
    // The next `count` stream requests, acks or transcript uploads answer `status` instead.
    failNextStreams(count, status = 500) {
      for (let i = 0; i < count; i++) failures.stream.push(status);
    },
    failNextAcks(count, status = 500) {
      for (let i = 0; i < count; i++) failures.ack.push(status);
    },
    failNextTranscripts(count, status = 500) {
      for (let i = 0; i < count; i++) failures.transcript.push(status);
    },
    async listen() {
      await new Promise((r) => server.listen(0, '127.0.0.1', r));
      return `http://127.0.0.1:${server.address().port}`;
    },
    async close() {
      for (const s of streams.values()) s.destroy();
      server.closeAllConnections?.();
      await new Promise((r) => server.close(r));
    },
    // Test hooks: a human (UI) or another agent sending to an agent.
    sendDirectFromUser(targetAgentId, bodyText, user = { oid: 'u-alice', name: 'Alice Smith', email: 'alice@example.com' }) {
      users.set(user.oid, user);
      return view(addMessage({ kind: 'direct', author_oid: user.oid, target_agent_id: targetAgentId, body: bodyText }));
    },
    addPost({ topics, title, bodyText, fromAgent = null, user = { oid: 'u-bob', name: 'Bob Jones', email: 'bob@example.com' } }) {
      users.set(user.oid, user);
      let author = null;
      if (fromAgent) {
        author = { id: randomUUID(), owner_oid: user.oid, name: fromAgent, status: 'idle' };
        agents.set(author.id, author);
        subscriptions.set(author.id, new Set());
      }
      return view(addMessage({ kind: 'post', author_oid: user.oid, author_agent_id: author?.id ?? null, topics, title, body: bodyText }));
    },
  };
}
