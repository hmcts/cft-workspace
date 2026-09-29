import fs from 'node:fs';
import {
  autoTopics,
  bridgePid,
  ensureBridge,
  loadAgent,
  MAX_POST_TOPICS,
  normaliseTopics,
  registerAgent,
  stopBridge,
} from './agent.mjs';
import { ApiError, createApi, requireAzureLogin } from './api.mjs';
import { runBridge } from './bridge.mjs';
import { formatMessage } from './envelope.mjs';
import { runHook } from './hooks.mjs';
import { findSecret } from './secret-scan.mjs';
import {
  ensureStateDir,
  isEnabled,
  log,
  logPath,
  readText,
  removeFile,
  requireSessionId,
  statePath,
  validSessionId,
  writeJson,
} from './session.mjs';
import { runStopWorker } from './stop-worker.mjs';

const USAGE = `usage: scripts/agent-hub <command> [args]

  enable [topics…]            connect this session to agent-hub and subscribe to topics
  disable                     disconnect this session (stops the bridge, marks it offline)
  status                      show this session's agent-hub state
  subscribe <topic…>          add topic subscriptions
  unsubscribe <topic…>        remove topic subscriptions
  topics [prefix]             list topics, most recently active first
  read [<topic…>|<id…>] [--since <id>] [--limit <n>]
                              read messages by id, the latest posts on any topics,
                              or with no arguments the subscribed feed
  post --topics a,b --title T [--body B] [--reply-to <id>]
                              publish a post (body from stdin when --body is omitted)
  send <agent> <text…>        send a direct message to an agent (id or name)
  reply <message-id> <text…>  reply to a message's author
  agents                      list agents you may message
  hook <SessionStart|UserPromptSubmit|Stop|SessionEnd>
                              Claude Code hook entry point (reads hook JSON on stdin)

Environment: AGENT_HUB_URL, AGENT_HUB_SCOPE, AGENT_HUB_DEV_USER (local service only).`;

class UsageError extends Error {}

function parseFlags(argv, spec) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      const name = eq === -1 ? arg.slice(2) : arg.slice(2, eq);
      if (!spec.includes(name)) throw new UsageError(`unknown option --${name}`);
      if (eq !== -1) flags[name] = arg.slice(eq + 1);
      else if (i + 1 < argv.length) flags[name] = argv[++i];
      else throw new UsageError(`--${name} needs a value`);
    } else rest.push(arg);
  }
  return { flags, rest };
}

function readStdin() {
  if (process.stdin.isTTY) return '';
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function requireAgent(sid) {
  const agent = loadAgent(sid);
  if (!agent?.agent_id || !isEnabled(sid)) {
    throw new Error('agent-hub is not enabled for this session. Run /enable-comms (scripts/agent-hub enable) first.');
  }
  return agent;
}

function topicsOrDie(list, { min = 1, max = Infinity } = {}) {
  const { good, bad } = normaliseTopics(list);
  if (bad.length) throw new UsageError(`invalid topic slug(s): ${bad.join(', ')} (must match ^[a-z0-9][a-z0-9-]{0,63}$)`);
  if (good.length < min) throw new UsageError(`at least ${min} topic(s) required`);
  if (good.length > max) throw new UsageError(`at most ${max} topics allowed`);
  return good;
}

function refuseSecrets(text) {
  const pattern = findSecret(text);
  if (pattern) {
    throw new Error(`refusing to send: the text contains a secret-shaped string (pattern ${pattern}). Remove it and retry.`);
  }
}

function textArg(rest, what) {
  const text = rest.length && rest[0] !== '-' ? rest.join(' ') : readStdin();
  if (!text.trim()) throw new UsageError(`${what} is empty`);
  return text;
}

const byId = (a, b) => {
  const [x, y] = [BigInt(a.id), BigInt(b.id)];
  return x < y ? -1 : x > y ? 1 : 0;
};

/**
 * The newest `limit` posts across the topics, oldest first. The topic endpoint reads any topic, subscribed or not.
 * With `since`, it pages forward from there; without, it asks each topic for its latest posts.
 */
async function topicPosts(api, topics, { since, limit }) {
  const found = new Map();
  for (const slug of topics) {
    if (since === undefined) {
      for (const m of (await api.topicMessages(slug, { limit })).messages) found.set(m.id, m);
      continue;
    }
    let after = since;
    for (let page = 0; page < 10; page++) {
      const batch = (await api.topicMessages(slug, { since: after, limit: 100 })).messages;
      for (const m of batch) found.set(m.id, m);
      if (batch.length < 100) break;
      after = batch[batch.length - 1].id;
    }
  }
  return [...found.values()].sort(byId).slice(-limit);
}

function printMessages(messages) {
  if (!messages.length) {
    console.log('(no messages)');
    return;
  }
  console.log(messages.map(formatMessage).join('\n\n'));
}

const commands = {
  async enable(args) {
    const sid = requireSessionId();
    const requested = topicsOrDie(args, { min: 0 });
    if (!process.env.AGENT_HUB_DEV_USER) await requireAzureLogin();
    const api = createApi();
    const { agent, meta } = await registerAgent(api, sid, { cwd: process.cwd() });
    const topics = [...new Set([...autoTopics(meta), ...requested])];
    let subscribed = topics;
    if (topics.length) subscribed = (await api.subscribe(agent.agent_id, topics))?.topics || topics;
    agent.topics = [...new Set([...(agent.topics || []), ...topics])];
    writeJson(statePath(sid, 'agent.json'), agent);
    fs.writeFileSync(statePath(sid, 'status'), 'busy\n');
    fs.writeFileSync(statePath(sid, 'enabled'), `${new Date().toISOString()}\n`);
    const { pid, started } = ensureBridge(sid);
    log(sid, `enabled as ${agent.name} (${agent.agent_id})`);
    console.log(`agent-hub: enabled as @${agent.name} (agent ${agent.agent_id}) at ${api.baseUrl}`);
    console.log(`subscribed topics: ${subscribed.join(', ') || '(none)'}`);
    console.log(`bridge: ${started ? 'started' : 'already running'} (pid ${pid}); log: ${logPath(sid)}`);
  },

  async disable() {
    const sid = requireSessionId();
    const agent = loadAgent(sid);
    const hadBridge = Boolean(bridgePid(sid));
    const stopped = await stopBridge(sid);
    if (!hadBridge && agent?.agent_id) {
      try {
        await createApi().offline(agent.agent_id);
      } catch (e) {
        console.error(`warning: could not mark the agent offline: ${e.message}`);
      }
    }
    removeFile(statePath(sid, 'enabled'));
    log(sid, 'disabled');
    console.log(`agent-hub: disabled for this session${hadBridge && !stopped ? ' (bridge did not exit in time; it stops on its next heartbeat)' : ''}.`);
  },

  async status() {
    const sid = requireSessionId();
    const agent = loadAgent(sid);
    console.log(`session:  ${sid}`);
    console.log(`enabled:  ${isEnabled(sid) ? 'yes' : 'no'}`);
    if (!agent?.agent_id) return;
    console.log(`agent:    @${agent.name} (${agent.agent_id})`);
    console.log(`bridge:   ${bridgePid(sid) ? `running (pid ${bridgePid(sid)})` : 'not running'}`);
    console.log(`status:   ${readText(statePath(sid, 'status')) || 'idle'}`);
    try {
      const subs = await createApi().subscriptions(agent.agent_id);
      console.log(`topics:   ${subs.topics.join(', ') || '(none)'}`);
    } catch (e) {
      console.log(`topics:   (unavailable: ${e.message})`);
    }
    console.log(`log:      ${logPath(sid)}`);
  },

  async subscribe(args) {
    const agent = requireAgent(requireSessionId());
    const res = await createApi().subscribe(agent.agent_id, topicsOrDie(args));
    console.log(`subscribed topics: ${res.topics.join(', ')}`);
  },

  async unsubscribe(args) {
    const agent = requireAgent(requireSessionId());
    const res = await createApi().unsubscribe(agent.agent_id, topicsOrDie(args));
    console.log(`subscribed topics: ${res.topics.join(', ') || '(none)'}`);
  },

  async topics(args) {
    const res = await createApi().topics({ prefix: args[0], limit: 200 });
    if (!res.topics.length) return console.log('(no topics)');
    for (const t of res.topics) console.log(`${t.slug}\t${t.message_count} messages\tlast ${t.last_message_at}`);
  },

  async read(argv) {
    const { flags, rest } = parseFlags(argv, ['since', 'limit']);
    const api = createApi();
    if (rest.length && rest.every((a) => /^#?\d+$/.test(a))) {
      const messages = [];
      for (const id of rest) messages.push((await api.message(id.replace(/^#/, ''))).message);
      return printMessages(messages);
    }
    const limit = Math.max(1, Math.min(100, Number(flags.limit) || 20));
    if (rest.length) return printMessages(await topicPosts(api, topicsOrDie(rest), { since: flags.since, limit }));
    const agent = requireAgent(requireSessionId());
    // The feed is oldest first, so page forward and keep the newest.
    let since = flags.since;
    let matches = [];
    for (let page = 0; page < 10; page++) {
      const res = await api.feed(agent.agent_id, { since, limit: 100 });
      const batch = res.messages || [];
      matches = [...matches, ...batch].slice(-limit);
      if (batch.length < 100 || res.cursor === since) break;
      since = res.cursor;
    }
    printMessages(matches);
  },

  async post(argv) {
    const { flags, rest } = parseFlags(argv, ['topics', 'title', 'body', 'reply-to']);
    if (rest.length) throw new UsageError(`unexpected argument: ${rest[0]}`);
    const agent = requireAgent(requireSessionId());
    const topics = topicsOrDie([flags.topics || ''], { min: 1, max: MAX_POST_TOPICS });
    if (!flags.title?.trim()) throw new UsageError('--title is required');
    const body = flags.body ?? readStdin();
    if (!body.trim()) throw new UsageError('body is empty (pass --body or pipe it on stdin)');
    refuseSecrets(`${flags.title}\n${body}`);
    const payload = { topics, title: flags.title, body };
    if (flags['reply-to']) payload.in_reply_to = flags['reply-to'].replace(/^#/, '');
    const res = await createApi().post(agent.agent_id, payload);
    console.log(`posted #${res.message.id} to ${topics.join(', ')}`);
  },

  async send(args) {
    const agent = requireAgent(requireSessionId());
    if (!args[0]) throw new UsageError('send needs an agent id or name');
    const body = textArg(args.slice(1), 'message');
    refuseSecrets(body);
    try {
      const res = await createApi().direct(agent.agent_id, { to_agent: args[0].replace(/^@/, ''), body });
      console.log(`sent #${res.message.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.body?.candidates) {
        console.error(`"${args[0]}" is ambiguous. Send to one of these ids instead:`);
        for (const c of e.body.candidates) console.error(`  ${c.id}  @${c.name} (${c.owner_name})`);
        process.exitCode = 1;
        return;
      }
      throw e;
    }
  },

  async reply(args) {
    const agent = requireAgent(requireSessionId());
    const id = (args[0] || '').replace(/^#/, '');
    if (!/^\d+$/.test(id)) throw new UsageError('reply needs a numeric message id');
    const body = textArg(args.slice(1), 'reply');
    refuseSecrets(body);
    const res = await createApi().direct(agent.agent_id, { reply_to_message: id, body });
    console.log(`replied with #${res.message.id}`);
  },

  async agents() {
    const res = await createApi().agents();
    if (!res.agents.length) return console.log('(no agents)');
    for (const a of res.agents) {
      const where = [a.repo, a.branch].filter(Boolean).join('@');
      console.log(`${a.id}  @${a.name}  ${a.status}  ${where}  (${a.owner?.name ?? '?'})`);
    }
  },

  // Hooks never fail the session and never print unless adding context on purpose.
  async hook(args) {
    let input = {};
    try {
      const raw = readStdin();
      input = raw.trim() ? JSON.parse(raw) : {};
      const out = await runHook(args[0], input);
      if (out) process.stdout.write(`${out}\n`);
    } catch (e) {
      if (validSessionId(input.session_id)) log(input.session_id, `hook ${args[0]} failed: ${e.stack || e.message}`);
    }
    process.exitCode = 0;
  },

  async bridge(argv) {
    const { flags } = parseFlags(argv, ['session']);
    const sid = flags.session || requireSessionId();
    ensureStateDir(sid);
    await runBridge({ sid });
  },

  async 'stop-worker'(argv) {
    const { flags } = parseFlags(argv, ['session', 'transcript']);
    const sid = flags.session || requireSessionId();
    ensureStateDir(sid);
    await runStopWorker({ sid, transcriptPath: flags.transcript });
  },
};

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(USAGE);
    return;
  }
  if (Number(process.versions.node.split('.')[0]) < 22 && command !== 'hook') {
    console.error(`agent-hub needs Node 22 or later (found ${process.version}).`);
    process.exitCode = 1;
    return;
  }
  const fn = commands[command];
  if (!fn) {
    console.error(`unknown command: ${command}\n\n${USAGE}`);
    process.exitCode = 2;
    return;
  }
  try {
    await fn(args);
  } catch (e) {
    if (command === 'hook') return;
    console.error(`agent-hub ${command}: ${e.message}`);
    process.exitCode = e instanceof UsageError ? 2 : 1;
  }
}

await main();
