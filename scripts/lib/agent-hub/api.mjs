import { execFile } from 'node:child_process';

export const DEFAULT_URL = 'https://agent-hub.aat.platform.hmcts.net';
export const DEFAULT_SCOPE = 'api://dtsse-agent-hub/.default';
const REFRESH_MARGIN_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15000;

export class ApiError extends Error {
  constructor(status, body, method, path) {
    super(`${method} ${path} failed: ${status}${body?.error ? ` ${body.error}` : ''}`);
    this.status = status;
    this.body = body;
  }
}

function runAz(args) {
  return new Promise((resolve, reject) => {
    execFile('az', args, { timeout: 30000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        const hint = err.code === 'ENOENT' ? 'az is not installed' : (stderr || err.message).trim();
        reject(new Error(`az ${args.slice(0, 2).join(' ')} failed: ${hint}`));
      } else {
        resolve(stdout);
      }
    });
  });
}

export async function requireAzureLogin(run = runAz) {
  try {
    await run(['account', 'show', '-o', 'none']);
  } catch (e) {
    throw new Error(`not logged in to Azure — run: az login\n(${e.message})`);
  }
}

export function parseAzToken(stdout, now = Date.now()) {
  const parsed = JSON.parse(stdout);
  if (!parsed.accessToken) throw new Error('az returned no accessToken');
  let expiresAt;
  if (Number.isFinite(Number(parsed.expires_on))) expiresAt = Number(parsed.expires_on) * 1000;
  else if (parsed.expiresOn) expiresAt = Date.parse(parsed.expiresOn);
  if (!Number.isFinite(expiresAt)) expiresAt = now + 30 * 60 * 1000;
  return { token: parsed.accessToken, expiresAt };
}

export function createTokenProvider({ scope = DEFAULT_SCOPE, run = runAz, now = Date.now } = {}) {
  let cached = null;
  let pending = null;
  return async function getToken() {
    if (cached && cached.expiresAt - REFRESH_MARGIN_MS > now()) return cached.token;
    if (!pending) {
      pending = run(['account', 'get-access-token', '--scope', scope, '-o', 'json'])
        .then((out) => {
          cached = parseAzToken(out, now());
          return cached.token;
        })
        .finally(() => {
          pending = null;
        });
    }
    return pending;
  };
}

export function createApi({
  baseUrl = process.env.AGENT_HUB_URL || DEFAULT_URL,
  devUser = process.env.AGENT_HUB_DEV_USER || '',
  getToken = devUser ? null : createTokenProvider({ scope: process.env.AGENT_HUB_SCOPE || DEFAULT_SCOPE }),
  fetchImpl = globalThis.fetch,
} = {}) {
  const base = baseUrl.replace(/\/+$/, '');

  async function headers(extra = {}) {
    const h = { ...extra };
    if (devUser) h['X-Dev-User'] = devUser;
    else h.Authorization = `Bearer ${await getToken()}`;
    return h;
  }

  async function request(method, path, body, { timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
    const init = {
      method,
      headers: await headers(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      signal: AbortSignal.timeout(timeoutMs),
    };
    if (body !== undefined) init.body = JSON.stringify(body);
    const res = await fetchImpl(`${base}${path}`, init);
    const text = await res.text();
    let json = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = { error: text.slice(0, 200) };
      }
    }
    if (!res.ok) throw new ApiError(res.status, json, method, path);
    return json;
  }

  const a = (agentId) => `/api/agent/${encodeURIComponent(agentId)}`;
  const qs = (params) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
    const s = q.toString();
    return s ? `?${s}` : '';
  };

  return {
    baseUrl: base,
    headers,
    register: (body) => request('POST', '/api/agent/register', body),
    heartbeat: (id, body) => request('POST', `${a(id)}/heartbeat`, body),
    offline: (id, opts) => request('POST', `${a(id)}/offline`, undefined, opts),
    ack: (id, messageId) => request('POST', `${a(id)}/deliveries/${encodeURIComponent(messageId)}/ack`),
    feed: (id, { since, limit } = {}) => request('GET', `${a(id)}/feed${qs({ since, limit })}`),
    setCursor: (id, cursor) => request('POST', `${a(id)}/cursor`, { cursor: String(cursor) }),
    post: (id, body) => request('POST', `${a(id)}/posts`, body),
    direct: (id, body) => request('POST', `${a(id)}/direct`, body),
    subscriptions: (id) => request('GET', `${a(id)}/subscriptions`),
    subscribe: (id, topics) => request('PUT', `${a(id)}/subscriptions`, { topics }),
    unsubscribe: (id, topics) => request('DELETE', `${a(id)}/subscriptions`, { topics }),
    topics: ({ prefix, limit } = {}) => request('GET', `/api/agent/topics${qs({ prefix, limit })}`),
    topicMessages: (slug, { since, before, limit } = {}) =>
      request('GET', `/api/agent/topics/${encodeURIComponent(slug)}/messages${qs({ since, before, limit })}`),
    agents: () => request('GET', '/api/agent/agents'),
    message: (messageId) => request('GET', `/api/agent/messages/${encodeURIComponent(messageId)}`),
    async stream(id, { signal, lastEventId } = {}) {
      const h = await headers({ Accept: 'text/event-stream' });
      if (lastEventId) h['Last-Event-ID'] = lastEventId;
      const res = await fetchImpl(`${base}${a(id)}/stream`, { headers: h, signal });
      if (!res.ok) {
        let json = null;
        try {
          json = await res.json();
        } catch {}
        throw new ApiError(res.status, json, 'GET', `${a(id)}/stream`);
      }
      return res;
    },
  };
}
