import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  PROJECT_ROOT,
  ensureStateDir,
  log,
  pidAlive,
  readJson,
  readPidFile,
  removeFile,
  sessionInfo,
  spawnDetached,
  statePath,
  writeJson,
} from './session.mjs';

export const TOPIC_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
export const MAX_POST_TOPICS = 10;

export function normaliseTopic(raw) {
  const slug = String(raw).trim().toLowerCase();
  return TOPIC_RE.test(slug) ? slug : null;
}

export function normaliseTopics(list) {
  const good = [];
  const bad = [];
  for (const raw of list) {
    for (const part of String(raw).split(',')) {
      if (!part.trim()) continue;
      const slug = normaliseTopic(part);
      if (slug) {
        if (!good.includes(slug)) good.push(slug);
      } else bad.push(part.trim());
    }
  }
  return { good, bad };
}

// A repo name may carry characters a slug can't, e.g. dots.
export function slugify(raw) {
  const slug = String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return TOPIC_RE.test(slug) ? slug : null;
}

export function jiraKey(branch) {
  const m = /(?:^|[^A-Za-z0-9])([A-Za-z][A-Za-z0-9]+-\d+)(?![0-9])/.exec(branch || '');
  return m ? m[1].toLowerCase() : null;
}

function git(cwd, args) {
  try {
    return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).trim();
  } catch {
    return '';
  }
}

export function repoName(cwd) {
  const url = git(cwd, ['remote', 'get-url', 'origin']);
  if (url) return path.basename(url.replace(/\/+$/, '')).replace(/\.git$/, '');
  const top = git(cwd, ['rev-parse', '--show-toplevel']);
  return top ? path.basename(top) : null;
}

export function gitBranch(dir) {
  const branch = git(dir, ['rev-parse', '--abbrev-ref', 'HEAD']);
  return branch && branch !== 'HEAD' ? branch : null;
}

function realpath(p) {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
}

function relativeTo(root, p) {
  const rel = path.relative(root, p);
  return rel.startsWith('..') || path.isAbsolute(rel) ? null : rel;
}

// Sessions run from the workspace root to share history, so a cwd in the workspace but outside
// a clone says nothing about the repo being worked on.
export function gatherMetadata(sid, { cwd, root = PROJECT_ROOT } = {}) {
  const info = sessionInfo(sid);
  const dir = cwd || info.cwd || process.cwd();
  const rel = relativeTo(realpath(root), realpath(dir));
  const repoDir = rel === null ? dir : cloneDir(rel, root);
  return {
    session_id: sid,
    name: info.name,
    cwd: dir,
    repo: repoDir ? repoName(repoDir) : null,
    branch: repoDir ? gitBranch(repoDir) : null,
    host: os.hostname(),
  };
}

const workspaceNames = new Map();

export function workspaceRepoName(root = PROJECT_ROOT) {
  if (!workspaceNames.has(root)) workspaceNames.set(root, slugify(repoName(root) || path.basename(root)));
  return workspaceNames.get(root);
}

const CONTAINERS = new Set(['libs', 'platops']);

// Where a path sits in the workspace layout: apps/<product>/<repo>, libs/<repo> or platops/<repo>.
// Relative paths are taken from the workspace root; absolute ones must be under it.
export function workspacePlace(p, root = PROJECT_ROOT) {
  if (typeof p !== 'string' || !p) return null;
  let rel = p;
  if (path.isAbsolute(p)) {
    rel = path.relative(root, p);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  }
  const parts = rel.split(/[\\/]+/).filter((part) => part && part !== '.');
  let product;
  let repo;
  if (parts[0] === 'apps' && parts[1]) [product, repo] = [slugify(parts[1]), parts[2]];
  else if (CONTAINERS.has(parts[0])) [product, repo] = [parts[0], parts[1]];
  else return null;
  if (!product) return null;
  return { product, repo: repo && isRepoDir(repo) ? slugify(repo) : null };
}

// Product directories also hold workspace-tracked docs and plugin files next to the clones.
function isRepoDir(name) {
  return /^[A-Za-z0-9]/.test(name) && name !== 'docs' && !/\.(md|ya?ml|json)$/i.test(name);
}

function relParts(rel) {
  return rel.split(/[\\/]+/).filter((part) => part && part !== '.');
}

// The clone directory a workspace-relative path sits in, or null when it is not inside a clone.
export function cloneDir(rel, root = PROJECT_ROOT) {
  const parts = relParts(rel);
  const depth = parts[0] === 'apps' ? 3 : 2;
  if (parts.length < depth || !workspacePlace(parts.join('/'), root)?.repo) return null;
  return path.join(root, ...parts.slice(0, depth));
}

// What an absolute path touched: a clone (its repo and product), or a file the workspace repo
// itself owns (scripts, skills, docs, product docs and plugins). The root and the bare container
// directories are no one's, and paths outside the root are ignored.
export function touchPlace(p, root = PROJECT_ROOT, workspaceRepo = workspaceRepoName(root)) {
  if (typeof p !== 'string' || !path.isAbsolute(p)) return null;
  const rel = relativeTo(root, path.resolve(p));
  if (!rel) return null;
  const parts = relParts(rel);
  if (parts[0] === 'apps' || CONTAINERS.has(parts[0])) {
    if (parts.length < (parts[0] === 'apps' ? 3 : 2)) return null;
    const place = workspacePlace(rel, root);
    if (place?.repo) return { repo: place.repo, product: place.product, dir: cloneDir(rel, root) };
    return workspaceRepo ? { repo: workspaceRepo, product: place?.product ?? null, dir: root } : null;
  }
  return workspaceRepo ? { repo: workspaceRepo, product: null, dir: root } : null;
}

export function autoTopics(meta) {
  const product = workspacePlace(meta.cwd)?.product;
  return [...new Set([meta.repo && slugify(meta.repo), product, jiraKey(meta.branch)].filter(Boolean))];
}

export function loadAgent(sid) {
  return readJson(statePath(sid, 'agent.json'));
}

export async function registerAgent(api, sid, opts = {}) {
  const meta = gatherMetadata(sid, opts);
  const res = await api.register(meta);
  ensureStateDir(sid);
  const previous = loadAgent(sid) || {};
  const agent = {
    ...previous,
    agent_id: res.agent_id,
    name: res.name || meta.name,
    session_id: sid,
    repo: meta.repo,
    branch: meta.branch,
    cwd: meta.cwd,
    claude_pid: sessionInfo(sid).pid || previous.claude_pid || null,
    registered_at: new Date().toISOString(),
  };
  if (agent.pending_subscribe?.length) {
    await api.subscribe(agent.agent_id, agent.pending_subscribe);
    delete agent.pending_subscribe;
  }
  writeJson(statePath(sid, 'agent.json'), agent);
  return { agent, meta };
}

export function bridgePid(sid) {
  const pid = readPidFile(statePath(sid, 'bridge.pid'));
  return pid && pidAlive(pid) ? pid : null;
}

export function ensureBridge(sid) {
  const running = bridgePid(sid);
  if (running) return { pid: running, started: false };
  removeFile(statePath(sid, 'bridge.stop'));
  const pid = spawnDetached(sid, ['bridge', '--session', sid]);
  log(sid, `spawned bridge pid ${pid}`);
  return { pid, started: true };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Returns true if a running bridge exited (it posts offline itself on the way out).
export async function stopBridge(sid, { waitMs = 3000 } = {}) {
  ensureStateDir(sid);
  fs.writeFileSync(statePath(sid, 'bridge.stop'), `${Date.now()}\n`);
  const pid = bridgePid(sid);
  if (!pid) return false;
  try {
    process.kill(pid, 'SIGTERM');
  } catch {}
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    if (!pidAlive(pid)) return true;
    await sleep(50);
  }
  return !pidAlive(pid);
}
