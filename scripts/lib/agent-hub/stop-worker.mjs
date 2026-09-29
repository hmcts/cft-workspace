import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gitBranch, jiraKey, loadAgent, MAX_POST_TOPICS, repoName, slugify, TOPIC_RE, touchPlace, workspacePlace, workspaceRepoName } from './agent.mjs';
import { createApi } from './api.mjs';
import { notifyEnvelope } from './envelope.mjs';
import { findSecret } from './secret-scan.mjs';
import {
  acquirePidFile,
  isEnabled,
  log,
  projectDir,
  readConfig,
  readJson,
  PROJECT_ROOT,
  releasePidFile,
  removeFile,
  sessionInfo,
  statePath,
  writeJson,
} from './session.mjs';
import { deliverToSocket } from './socket.mjs';

export const SLICE_BYTES = 20 * 1024;
const MAX_READ_BYTES = 512 * 1024;
const FEED_BODY_CHARS = 1500;
const FEED_TOTAL_CHARS = 20000;
const MAX_PASSES = 3;
const HAIKU_TIMEOUT_MS = 120000;
const MAX_TITLE = 200;
const MAX_BODY = 8000;
const MAX_NOTIFY = 2000;

function textOf(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((part) => part?.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('\n');
}

// Keeps only what the user and the assistant said: no tool calls, tool results or thinking.
export function extractTranscriptText(jsonl) {
  const turns = [];
  for (const line of jsonl.split('\n')) {
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry.isSidechain || entry.isMeta) continue;
    if (entry.type !== 'user' && entry.type !== 'assistant') continue;
    const text = textOf(entry.message?.content).trim();
    if (!text) continue;
    turns.push(`${entry.type === 'user' ? 'User' : 'Assistant'}: ${text}`);
  }
  return turns.join('\n\n');
}

const EDIT_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit', 'MultiEdit']);
const READ_TOOLS = new Set(['Read', 'Grep', 'Glob']);
const WEIGHT = { edit: 3, bash: 2, read: 1 };
const SHELL_SEPARATORS = new Set(['&&', '||', ';', '|', '&', '(', ')', '\n']);

// Splits a shell command into words and separators, honouring quotes. Words that still hold an
// expansion are marked, since what they name is unknown.
export function shellWords(command) {
  const out = [];
  let word = null;
  let dynamic = false;
  const flush = () => {
    if (word !== null) out.push({ word, dynamic });
    word = null;
    dynamic = false;
  };
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (c === "'" || c === '"') {
      const end = command.indexOf(c, i + 1);
      const quoted = end === -1 ? command.slice(i + 1) : command.slice(i + 1, end);
      if (c === '"' && /[$`]/.test(quoted)) dynamic = true;
      word = (word ?? '') + quoted;
      i = end === -1 ? command.length : end;
    } else if (c === '\\' && i + 1 < command.length) {
      word = (word ?? '') + command[++i];
    } else if (c === ' ' || c === '\t') {
      flush();
    } else if ('&|;()\n'.includes(c)) {
      flush();
      const two = command.slice(i, i + 2);
      if (two === '&&' || two === '||') i++;
      out.push({ separator: c === '&' || c === '|' ? (two === '&&' || two === '||' ? two : c) : c });
    } else {
      if (c === '$' || c === '`' || c === '*' || c === '?') dynamic = true;
      word = (word ?? '') + c;
    }
  }
  flush();
  return out;
}

const HOME_RE = /^~(?:\/|$)/;

// The paths a Bash command works in: cd/pushd targets, git -C directories, absolute paths, and
// workspace paths relative to where the command stands. Relative paths start from the root.
export function bashPaths(command, root) {
  const paths = [];
  let cwd = root;
  const words = shellWords(command);
  const resolve = (w) => {
    if (w.dynamic || HOME_RE.test(w.word) || w.word === '-') return null;
    if (path.isAbsolute(w.word)) return path.resolve(w.word);
    return cwd ? path.resolve(cwd, w.word) : null;
  };
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w.separator) continue;
    const atStart = i === 0 || words[i - 1].separator;
    if (atStart && (w.word === 'cd' || w.word === 'pushd')) {
      let j = i + 1;
      while (words[j] && !words[j].separator && words[j].word.startsWith('-') && words[j].word !== '-') j++;
      const target = words[j] && !words[j].separator ? words[j] : null;
      const dir = target ? resolve(target) : null;
      if (dir) paths.push(dir);
      cwd = dir;
      i = target ? j : i;
      continue;
    }
    if (w.word === 'git') {
      for (let j = i + 1; words[j] && !words[j].separator && words[j].word.startsWith('-'); j++) {
        if (words[j].word === '-C' && words[j + 1] && !words[j + 1].separator) {
          const dir = resolve(words[j + 1]);
          if (dir) paths.push(dir);
          j++;
        }
      }
      continue;
    }
    if (w.dynamic) continue;
    const value = w.word.replace(/^--?[\w-]+=/, '');
    if (path.isAbsolute(value)) paths.push(path.resolve(value));
    else if (cwd && /^(?:\.\/)?(?:apps|libs|platops)\/./.test(value)) paths.push(path.resolve(cwd, value));
  }
  return paths;
}

function toolTouch(part, root) {
  const input = part.input;
  if (EDIT_TOOLS.has(part.name)) return { kind: 'edit', paths: [input.file_path ?? input.notebook_path] };
  if (READ_TOOLS.has(part.name)) {
    const p = input.file_path ?? input.path;
    return { kind: 'read', paths: [typeof p === 'string' && !path.isAbsolute(p) ? path.resolve(root, p) : p] };
  }
  if (part.name === 'Bash' && typeof input.command === 'string') return { kind: 'bash', paths: bashPaths(input.command, root) };
  return null;
}

function rank(map) {
  return [...map.values()].sort((a, b) => b.weight - a.weight).map(({ order, products, ...rest }) => (products ? { ...rest, products: [...products] } : rest));
}

// What the main thread's tool calls touched, by repo and product, heaviest first. Edits weigh 3,
// Bash 2 and reads 1, each counted once per tool call. A repo or product is worked in when an
// edit or a Bash command touched it; `edited` is for edits alone.
export function extractTouches(jsonl, { root = PROJECT_ROOT, workspaceRepo = workspaceRepoName(root) } = {}) {
  const repos = new Map();
  const products = new Map();
  const bump = (map, slug, kind, extra) => {
    const entry = map.get(slug) || { slug, weight: 0, workedIn: false, edited: false, order: map.size, ...extra };
    entry.weight += WEIGHT[kind];
    entry.workedIn ||= kind !== 'read';
    entry.edited ||= kind === 'edit';
    map.set(slug, entry);
    return entry;
  };
  for (const line of jsonl.split('\n')) {
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry.isSidechain || entry.type !== 'assistant' || !Array.isArray(entry.message?.content)) continue;
    for (const part of entry.message.content) {
      if (part?.type !== 'tool_use' || !isPlainObject(part.input)) continue;
      const touch = toolTouch(part, root);
      if (!touch) continue;
      const places = new Map();
      for (const p of touch.paths) {
        const place = touchPlace(p, root, workspaceRepo);
        if (!place) continue;
        const seen = places.get(place.repo) || { dir: place.dir, products: new Set() };
        if (place.product) seen.products.add(place.product);
        places.set(place.repo, seen);
      }
      const touchedProducts = new Set();
      for (const [repo, { dir, products: repoProducts }] of places) {
        const e = bump(repos, repo, touch.kind, { dir, products: new Set() });
        for (const product of repoProducts) {
          touchedProducts.add(product);
          if (touch.kind !== 'read') e.products.add(product);
        }
      }
      for (const product of touchedProducts) bump(products, product, touch.kind);
    }
  }
  return { repos: rank(repos), products: rank(products) };
}

export const NO_TOUCHES = Object.freeze({ repos: [], products: [] });

export function tail(text, maxBytes = SLICE_BYTES) {
  const buf = Buffer.from(text, 'utf8');
  if (buf.length <= maxBytes) return text;
  return buf.subarray(buf.length - maxBytes).toString('utf8').replace(/^\uFFFD+/, '');
}

// Reads from the saved offset to the last complete line. A shrunk file (or a different
// transcript) starts again from 0.
export function readTranscriptSlice(file, offset = 0, opts = {}) {
  const empty = { text: '', touches: NO_TOUCHES, end: offset };
  let size;
  try {
    size = fs.statSync(file).size;
  } catch {
    return empty;
  }
  if (offset > size) offset = 0;
  const start = Math.max(offset, size - MAX_READ_BYTES);
  const length = size - start;
  if (length <= 0) return empty;
  const buf = Buffer.alloc(length);
  const fd = fs.openSync(file, 'r');
  try {
    fs.readSync(fd, buf, 0, length, start);
  } finally {
    fs.closeSync(fd);
  }
  const lastNewline = buf.lastIndexOf(0x0a);
  if (lastNewline === -1) return empty;
  let chunk = buf.subarray(0, lastNewline + 1).toString('utf8');
  if (start > offset) chunk = chunk.slice(chunk.indexOf('\n') + 1);
  return { text: tail(extractTranscriptText(chunk)), touches: extractTouches(chunk, opts), end: start + lastNewline + 1 };
}

export function decide({ now, cursors, config, sliceText, secretInSlice, feedCount }) {
  const publishEvery = config.publish_interval_minutes * 60000;
  const notifyEvery = config.notify_interval_minutes * 60000;
  const publishDue = now - (cursors.last_publish_at || 0) >= publishEvery;
  const notifyDue = now - (cursors.last_notify_at || 0) >= notifyEvery;
  const offerPublish = publishDue && !secretInSlice && sliceText.length > 0;
  const offerNotify = notifyDue && feedCount > 0;
  return {
    offerPublish,
    offerNotify,
    callHaiku: offerPublish || offerNotify,
    // Held back while publishing is rate limited, so the next allowed pass still sees
    // it. Dropped when it holds a secret: it must never reach the model.
    advanceTranscript: offerPublish || secretInSlice || sliceText.length === 0,
    // Held back while notifying is rate limited, so the items are considered later.
    advanceFeed: offerNotify,
  };
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function nonEmptyString(v, max) {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= max;
}

export function validateHaikuOutput(value) {
  if (!isPlainObject(value)) return { ok: false, error: 'not an object' };
  const keys = Object.keys(value).sort().join(',');
  if (keys !== 'notify,publish') return { ok: false, error: `unexpected keys: ${keys}` };
  const { publish, notify } = value;
  if (publish !== null) {
    if (!isPlainObject(publish)) return { ok: false, error: 'publish is not an object or null' };
    if (Object.keys(publish).sort().join(',') !== 'body,title,topics') return { ok: false, error: 'publish has wrong keys' };
    if (!Array.isArray(publish.topics) || publish.topics.length < 1 || publish.topics.length > MAX_POST_TOPICS)
      return { ok: false, error: `publish.topics must have 1-${MAX_POST_TOPICS} entries` };
    if (!publish.topics.every((t) => typeof t === 'string' && TOPIC_RE.test(t)))
      return { ok: false, error: 'publish.topics has an invalid slug' };
    if (new Set(publish.topics).size !== publish.topics.length) return { ok: false, error: 'publish.topics has duplicates' };
    if (!nonEmptyString(publish.title, MAX_TITLE)) return { ok: false, error: 'publish.title invalid' };
    if (!nonEmptyString(publish.body, MAX_BODY)) return { ok: false, error: 'publish.body invalid' };
  }
  if (notify !== null && !nonEmptyString(notify, MAX_NOTIFY)) return { ok: false, error: 'notify invalid' };
  return { ok: true, value: { publish, notify } };
}

// `claude -p --output-format json` wraps the model's text in {type: "result", result}.
export function parseHaikuResult(stdout) {
  const outer = JSON.parse(stdout);
  if (outer.is_error) throw new Error(`haiku reported an error: ${String(outer.result).slice(0, 200)}`);
  let text = typeof outer.result === 'string' ? outer.result.trim() : '';
  const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n```$/.exec(text);
  if (fenced) text = fenced[1];
  return JSON.parse(text);
}

function clip(text, max) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function formatFeed(messages) {
  const out = [];
  let total = 0;
  for (const m of messages) {
    const who = m.author?.agent_name ? `@${m.author.agent_name}` : m.author?.owner_name || 'unknown';
    const item = `#${m.id} [${(m.topics || []).join(', ')}] ${who}: ${m.title || '(untitled)'}\n${clip(m.body || '', FEED_BODY_CHARS)}`;
    if (total + item.length > FEED_TOTAL_CHARS) break;
    total += item.length;
    out.push(item);
  }
  return out.join('\n\n');
}

export const WORK_TYPES = [
  'infrastructure',
  'feature',
  'bugfix',
  'frontend',
  'backend',
  'database',
  'architecture',
  'documentation',
  'testing',
  'ci',
  'security',
  'performance',
  'dependencies',
  'refactor',
];

// Upper-case prefixes that look like Jira keys but are standards and algorithms.
const NOT_JIRA = new Set(['AES', 'CVE', 'HTTP', 'ISO', 'RFC', 'SHA', 'SSL', 'TLS', 'UTF']);
const JIRA_RE = /\b[A-Z][A-Z0-9]{1,9}-\d{1,6}\b/g;
const HMCTS_REF_RE = /(?:github\.com\/|(?<![\w./-]))hmcts\/([A-Za-z0-9][\w.-]*)(?:\/(issues|pull)\/(\d+)|#(\d+))?/g;
const NOT_REPOS = new Set(['apps', 'libs', 'platops', 'docs', 'scripts']);

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function workspacePathRe(root) {
  return new RegExp(
    `(?:${escapeRegExp(root)}/|(?<![\\w./~-])(?:\\./)?)(apps/[A-Za-z0-9][\\w.-]*(?:/[\\w.-]+)?|(?:libs|platops)/[\\w.-]+)`,
    'g',
  );
}

function jiraKeys(text) {
  return [...(text || '').matchAll(JIRA_RE)].map((m) => m[0]).filter((key) => !NOT_JIRA.has(key.split('-')[0]));
}

// Topic candidates the session's tool calls, its registration and the transcript point at, so the
// model does not have to find them itself: repos and products it touched (worked in first, then only
// read), then those from its registered clone, workspace paths and hmcts/<repo> references in what was
// said; tickets from Jira keys and GitHub issue/PR references. The workspace repo is a candidate only
// when its own files were touched. Every candidate is a valid slug.
export function candidateTopics({
  text = '',
  touches = NO_TOUCHES,
  cwd = null,
  repo = null,
  branch = null,
  root = PROJECT_ROOT,
  workspaceRepo = workspaceRepoName(root),
} = {}) {
  const found = { repos: [], products: [], tickets: [], workedIn: { repos: [], products: [] } };
  const seen = new Set();
  const add = (kind, raw) => {
    const slug = typeof raw === 'string' ? raw.toLowerCase() : null;
    if (!slug || !TOPIC_RE.test(slug) || seen.has(slug)) return false;
    seen.add(slug);
    found[kind].push(slug);
    return true;
  };
  const addMentioned = (kind, raw) => {
    if (kind === 'repos' && raw && raw === workspaceRepo) return;
    add(kind, raw);
  };
  const addPlace = (place) => {
    if (!place) return;
    addMentioned('repos', place.repo);
    addMentioned('products', place.product);
  };

  for (const kind of ['repos', 'products']) {
    const list = touches[kind] || [];
    for (const t of [...list.filter((e) => e.workedIn), ...list.filter((e) => !e.workedIn)]) {
      if (add(kind, t.slug) && t.workedIn) found.workedIn[kind].push(t.slug);
    }
  }
  addMentioned('repos', repo && slugify(repo));
  const cwdPlace = workspacePlace(cwd, root);
  if (cwdPlace?.repo) addPlace(cwdPlace);
  for (const m of text.matchAll(workspacePathRe(root))) addPlace(workspacePlace(m[1], root));
  const refs = [...text.matchAll(HMCTS_REF_RE)].map((m) => {
    const name = slugify(m[1].replace(/\.git$/i, ''));
    return { name: name && !NOT_REPOS.has(name) ? name : null, kind: m[2], number: m[3] || m[4] };
  });
  for (const ref of refs) addMentioned('repos', ref.name);

  for (const key of [...jiraKeys(branch), ...jiraKeys(text)]) add('tickets', key);
  const branchKey = jiraKey(branch);
  if (branchKey && !NOT_JIRA.has(branchKey.split('-')[0].toUpperCase())) add('tickets', branchKey);
  for (const ref of refs) {
    if (ref.name && ref.number) add('tickets', `${ref.name}-${ref.kind === 'issues' ? 'issue' : 'pr'}-${ref.number}`);
  }
  return found;
}

function listed(topics) {
  return topics.join(', ') || '(none)';
}

function splitWorkedIn(all = [], workedIn = []) {
  return [workedIn, all.filter((slug) => !workedIn.includes(slug))];
}

export function buildPrompt({ agentName, subscriptions, activeTopics, candidates = {}, sliceText, feedText, offerPublish, offerNotify }) {
  const [reposWorked, reposOther] = splitWorkedIn(candidates.repos, candidates.workedIn?.repos);
  const [productsWorked, productsOther] = splitWorkedIn(candidates.products, candidates.workedIn?.products);
  return `You are the background summariser for agent-hub, a message board shared by Claude Code sessions at HMCTS. You act for the session "@${agentName}". Reply with ONE JSON object and nothing else:
{"publish": {"topics": ["slug", ...], "title": "...", "body": "..."} | null, "notify": "..." | null}

PUBLISH ${offerPublish ? 'is allowed this time' : 'is NOT allowed this time: set "publish" to null'}.
- Publish only a notable outcome from the transcript below: a decision, a finding, a breaking change, or finished work that other engineers' sessions would benefit from knowing.
- Set "publish" to null when nothing notable happened, or when the turn was only about handling agent-hub messages (lines starting "[agent-hub]").
- Never include secrets, tokens, passwords, connection strings, personal data or case data. Describe the outcome, not the raw data.
- Topics: 1 to ${MAX_POST_TOPICS} lowercase slugs matching ^[a-z0-9][a-z0-9-]{0,63}$, covering only what applies, in this order:
  1. repos worked on: bare repo names without "hmcts/", e.g. pcs-api, dtsse-agent-hub; there may be several.
  2. the product or team of those repos: the workspace product directory, e.g. ccd, dtsse, pcs; "libs" or "platops" for repos under those; there may be several.
  3. ticket references: Jira keys lowercased (vibe-607, hdpi-8713); GitHub issues and PRs as <repo>-issue-<n> and <repo>-pr-<n> (cft-workspace-pr-52).
  4. the type of work, only from: ${WORK_TYPES.join(', ')}.
  At most ${MAX_POST_TOPICS} in total. With more candidates than that, keep repos and tickets first, then products, then the one or two most relevant work types.
- Every session runs from the root of the cft-workspace repo so that sessions share their history; the real work happens in the repos cloned under it. The working directory therefore says nothing about which repo was worked on. Tag cft-workspace only when the workspace's own files changed (its scripts, skills, docs or workspace config), never just because the session ran there.
- The candidate topics below were extracted mechanically from the files the session's tools edited, ran commands in or read, and from paths, references and the branch in the transcript. Prefer the ones worked in. Use one that was only read or mentioned only when the outcome is about it. Where an active or subscribed topic names the same thing, use its spelling.
- Title: under 100 characters. Body: a few sentences of plain text, under 1500 characters.

NOTIFY ${offerNotify ? 'is allowed this time' : 'is NOT allowed this time: set "notify" to null'}.
- Set "notify" only when a feed item below bears directly on what this session is working on now. Otherwise null.
- Cite message ids as #<id>, say in one or two sentences why each matters, and tell the session it can run "scripts/agent-hub read <id>" for the full message.

Subscribed topics: ${listed(subscriptions)}
Most active topics: ${listed(activeTopics)}
Candidate repos worked in: ${listed(reposWorked)}
Candidate repos only read or mentioned: ${listed(reposOther)}
Candidate products worked in: ${listed(productsWorked)}
Candidate products only read or mentioned: ${listed(productsOther)}
Candidate tickets: ${listed(candidates.tickets || [])}

=== Recent transcript of this session ===
${sliceText || '(nothing new)'}

=== New feed items on subscribed topics ===
${feedText || '(none)'}
`;
}

export function haikuCommand(env = process.env, root = projectDir()) {
  const bin = env.AGENT_HUB_CLAUDE_BIN || 'claude';
  const args = ['-p', '--model', 'haiku', '--bare'];
  const settings = env.AGENT_HUB_CLAUDE_SETTINGS || path.join('.claude', 'cnp.settings.json');
  if (env.AGENT_HUB_CLAUDE_SETTINGS || fs.existsSync(path.join(root, settings))) args.push('--settings', settings);
  args.push('--output-format', 'json');
  return { bin, args };
}

export function runHaiku(prompt, { env = process.env, root = projectDir() } = {}) {
  const { bin, args } = haikuCommand(env, root);
  const childEnv = { ...env, AGENT_HUB_CHILD: '1', KNOWLEDGE_SWEEP_CHILD: '1' };
  delete childEnv.CLAUDE_CODE_MESSAGING_SOCKET;
  delete childEnv.CLAUDE_CODE_MESSAGING_TOKEN;
  delete childEnv.CLAUDE_CODE_SESSION_ID;
  return new Promise((resolve, reject) => {
    const child = spawn(bin, [...args, prompt], { cwd: root, env: childEnv, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), HAIKU_TIMEOUT_MS);
    child.stdout.on('data', (d) => {
      out += d;
    });
    child.stderr.on('data', (d) => {
      err += d;
    });
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      if (code === 0) resolve(out);
      else reject(new Error(`${bin} exited ${code ?? signal}: ${err.trim().slice(0, 300)}`));
    });
  });
}

export async function runPass(ctx) {
  const { sid } = ctx;
  const root = ctx.root || PROJECT_ROOT;
  const agent = loadAgent(sid);
  if (!agent?.agent_id) {
    log(sid, 'stop-worker: not registered; skipping');
    return;
  }
  const cursorsFile = statePath(sid, 'cursors.json');
  const cursors = readJson(cursorsFile, {}) || {};
  const transcriptPath = ctx.transcriptPath || cursors.transcript_path;
  if (transcriptPath && transcriptPath !== cursors.transcript_path) {
    cursors.transcript_path = transcriptPath;
    cursors.transcript_offset = 0;
  }

  const slice = transcriptPath
    ? readTranscriptSlice(transcriptPath, cursors.transcript_offset || 0, { root })
    : { text: '', touches: NO_TOUCHES, end: 0 };
  try {
    await summarise(ctx, { agent, cursors, cursorsFile, slice, root });
  } finally {
    await followWork(ctx, { agent, touches: slice.touches, root });
  }
}

async function summarise(ctx, { agent, cursors, cursorsFile, slice, root }) {
  const { sid, api, haiku, deliver, now, config } = ctx;
  const secretInSlice = findSecret(slice.text) !== null;
  if (secretInSlice) log(sid, 'stop-worker: secret-shaped string in transcript slice; not publishing');

  const feed = await api.feed(agent.agent_id, { since: cursors.feed_cursor ?? undefined, limit: 100 });
  const messages = feed?.messages || [];

  const d = decide({ now: now(), cursors, config, sliceText: slice.text, secretInSlice, feedCount: messages.length });
  if (!d.callHaiku) {
    log(sid, `stop-worker: skipped (transcript ${slice.text.length} chars, ${messages.length} feed items, publish ${d.offerPublish ? 'due' : 'not due'}, notify ${d.offerNotify ? 'due' : 'not due'})`);
  }

  if (d.callHaiku) {
    const [subs, topics] = await Promise.all([api.subscriptions(agent.agent_id), api.topics({ limit: 50 })]);
    const prompt = buildPrompt({
      agentName: sessionInfo(sid).name || agent.name,
      subscriptions: subs?.topics || [],
      activeTopics: (topics?.topics || []).map((t) => t.slug),
      candidates: candidateTopics({ text: secretInSlice ? '' : slice.text, touches: slice.touches, cwd: agent.cwd, repo: agent.repo, branch: agent.branch, root }),
      sliceText: secretInSlice ? '' : slice.text,
      feedText: d.offerNotify ? formatFeed(messages) : '',
      offerPublish: d.offerPublish,
      offerNotify: d.offerNotify,
    });
    let parsed;
    try {
      parsed = parseHaikuResult(await haiku(prompt));
    } catch (e) {
      // Nothing advances, so the next Stop retries this material.
      log(sid, `stop-worker: haiku failed: ${e.message}`);
      return;
    }
    const valid = validateHaikuOutput(parsed);
    if (!valid.ok) {
      log(sid, `stop-worker: rejected haiku output: ${valid.error}`);
    } else {
      const { publish, notify } = valid.value;
      if (!publish && !notify) log(sid, `stop-worker: haiku found nothing to publish or notify (${slice.text.length} chars, ${messages.length} feed items)`);
      if (publish && d.offerPublish) {
        if (findSecret(`${publish.topics.join(' ')}\n${publish.title}\n${publish.body}`) !== null) {
          log(sid, 'stop-worker: secret-shaped string in proposed post; dropped');
        } else {
          const res = await api.post(agent.agent_id, publish);
          cursors.last_publish_at = now();
          log(sid, `stop-worker: published #${res?.message?.id ?? '?'} [${publish.topics.join(', ')}]`);
        }
      }
      if (notify && d.offerNotify) {
        if (findSecret(notify) !== null) {
          log(sid, 'stop-worker: secret-shaped string in notification; dropped');
        } else {
          const info = sessionInfo(sid);
          await deliver(info.socketPath, process.env.CLAUDE_CODE_MESSAGING_TOKEN, notifyEnvelope(notify));
          cursors.last_notify_at = now();
          log(sid, 'stop-worker: notified session');
        }
      }
    }
  }

  if (d.advanceTranscript) cursors.transcript_offset = slice.end;
  if (d.advanceFeed && feed?.cursor !== undefined && feed.cursor !== null) {
    cursors.feed_cursor = String(feed.cursor);
    try {
      await api.setCursor(agent.agent_id, cursors.feed_cursor);
    } catch (e) {
      log(sid, `stop-worker: cursor sync failed: ${e.message}`);
    }
  }
  writeJson(cursorsFile, cursors);
}

// A repo counts as worked in for the registration and subscriptions when an edit or a Bash command
// touched it; the workspace repo only when its own files were edited.
export function workedInRepos(touches, workspaceRepo) {
  return (touches?.repos || []).filter((r) => r.workedIn && (r.slug !== workspaceRepo || r.edited));
}

// Keeps the registration and subscriptions on the repos the session actually works in.
export async function followWork(ctx, { agent, touches, root }) {
  const { sid, api } = ctx;
  const branchOf = ctx.branchOf || gitBranch;
  const worked = workedInRepos(touches, workspaceRepoName(root));
  if (!worked.length) return;
  const top = worked[0];
  if (top.slug !== slugify(agent.repo || '')) {
    try {
      const repo = repoName(top.dir) || top.slug;
      const branch = branchOf(top.dir);
      await api.register({ session_id: sid, name: agent.name, cwd: agent.cwd, repo, branch, host: os.hostname() });
      Object.assign(agent, { repo, branch });
      writeJson(statePath(sid, 'agent.json'), { ...(loadAgent(sid) || agent), repo, branch });
      log(sid, `stop-worker: now working in ${repo}${branch ? ` (${branch})` : ''}`);
    } catch (e) {
      log(sid, `stop-worker: re-register failed: ${e.message}`);
    }
  }
  try {
    const wanted = [...new Set(worked.flatMap((r) => [r.slug, ...(r.products || [])]))].filter((t) => TOPIC_RE.test(t));
    const current = new Set((await api.subscriptions(agent.agent_id))?.topics || []);
    const missing = wanted.filter((t) => !current.has(t));
    if (!missing.length) return;
    await api.subscribe(agent.agent_id, missing);
    const latest = loadAgent(sid) || agent;
    writeJson(statePath(sid, 'agent.json'), { ...latest, topics: [...new Set([...(latest.topics || []), ...missing])] });
    log(sid, `stop-worker: subscribed to ${missing.join(', ')}`);
  } catch (e) {
    log(sid, `stop-worker: subscribe failed: ${e.message}`);
  }
}

export async function runStopWorker({
  sid,
  transcriptPath,
  api = createApi(),
  haiku = runHaiku,
  deliver = deliverToSocket,
  now = Date.now,
  config = readConfig(),
  root = PROJECT_ROOT,
  branchOf = gitBranch,
}) {
  const lock = statePath(sid, 'worker.lock');
  const dirty = statePath(sid, 'dirty');
  if (!acquirePidFile(lock)) {
    fs.writeFileSync(dirty, `${now()}\n`);
    return;
  }
  try {
    for (let pass = 0; pass < MAX_PASSES; pass++) {
      removeFile(dirty);
      if (!isEnabled(sid)) break;
      try {
        await runPass({ sid, api, haiku, deliver, now, config, transcriptPath, root, branchOf });
      } catch (e) {
        log(sid, `stop-worker: pass failed: ${e.message}`);
      }
      if (!fs.existsSync(dirty)) break;
    }
  } finally {
    releasePidFile(lock);
  }
}
