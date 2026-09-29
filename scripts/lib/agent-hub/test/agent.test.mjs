import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { autoTopics, cloneDir, gatherMetadata, jiraKey, normaliseTopics, slugify, touchPlace, workspacePlace } from '../agent.mjs';
import { PROJECT_ROOT } from '../session.mjs';
import { nextBackoff } from '../bridge.mjs';
import { tempClaudeHome } from './helpers.mjs';

test('jiraKey finds a ticket in common branch shapes', () => {
  assert.equal(jiraKey('feature/HDPI-1234-fix-thing'), 'hdpi-1234');
  assert.equal(jiraKey('hdpi-77_retry'), 'hdpi-77');
  assert.equal(jiraKey('feat/agent-hub'), null);
  assert.equal(jiraKey(null), null);
});

test('normaliseTopics lowercases, splits commas, dedupes and reports bad slugs', () => {
  assert.deepEqual(normaliseTopics(['PCS-API,ccd', 'ccd', 'bad slug', '-x']), { good: ['pcs-api', 'ccd'], bad: ['bad slug', '-x'] });
});

test('autoTopics uses the repo name and Jira key', () => {
  assert.deepEqual(autoTopics({ repo: 'pcs.api', branch: 'HDPI-9-x' }), ['pcs-api', 'hdpi-9']);
  assert.deepEqual(autoTopics({ repo: null, branch: null }), []);
});

test('autoTopics adds the workspace product of the cwd', () => {
  const at = (rel) => `${PROJECT_ROOT}/${rel}`;
  assert.deepEqual(autoTopics({ repo: 'pcs-api', branch: 'HDPI-9-x', cwd: at('apps/pcs/pcs-api/src') }), ['pcs-api', 'pcs', 'hdpi-9']);
  assert.deepEqual(autoTopics({ repo: 'rse-cft-lib', branch: null, cwd: at('libs/rse-cft-lib') }), ['rse-cft-lib', 'libs']);
  assert.deepEqual(autoTopics({ repo: null, branch: null, cwd: PROJECT_ROOT }), []);
  assert.deepEqual(autoTopics({ repo: 'x', branch: null, cwd: '/tmp/apps/pcs/x' }), ['x']);
});

test('workspacePlace reads the workspace layout', () => {
  assert.deepEqual(workspacePlace('apps/ccd/ccd-data-store-api/src', '/r'), { product: 'ccd', repo: 'ccd-data-store-api' });
  assert.deepEqual(workspacePlace('/r/platops/cnp-flux-config', '/r'), { product: 'platops', repo: 'cnp-flux-config' });
  assert.deepEqual(workspacePlace('apps/ccd/docs/x.md', '/r'), { product: 'ccd', repo: null });
  assert.deepEqual(workspacePlace('apps/pcs', '/r'), { product: 'pcs', repo: null });
  assert.deepEqual(workspacePlace('libs', '/r'), { product: 'libs', repo: null });
  assert.equal(workspacePlace('/other/apps/pcs/pcs-api', '/r'), null);
  assert.equal(workspacePlace('scripts/agent-hub', '/r'), null);
  assert.equal(slugify('---'), null);
});

test('touchPlace maps clones, workspace-owned files, and ignores the rest', () => {
  const at = (p) => touchPlace(p, '/r', 'cft-workspace');
  assert.deepEqual(at('/r/apps/dtsse/dtsse-agent-hub/src/a.ts'), { repo: 'dtsse-agent-hub', product: 'dtsse', dir: '/r/apps/dtsse/dtsse-agent-hub' });
  assert.deepEqual(at('/r/libs/rse-cft-lib'), { repo: 'rse-cft-lib', product: 'libs', dir: '/r/libs/rse-cft-lib' });
  assert.deepEqual(at('/r/scripts/agent-hub'), { repo: 'cft-workspace', product: null, dir: '/r' });
  assert.deepEqual(at('/r/.claude/skills/x/SKILL.md'), { repo: 'cft-workspace', product: null, dir: '/r' });
  assert.deepEqual(at('/r/apps/ccd/docs/x.md'), { repo: 'cft-workspace', product: 'ccd', dir: '/r' });
  assert.deepEqual(at('/r/apps/ccd/.claude/skills'), { repo: 'cft-workspace', product: 'ccd', dir: '/r' });
  assert.deepEqual(at('/r/apps/ccd/CLAUDE.md'), { repo: 'cft-workspace', product: 'ccd', dir: '/r' });
  for (const p of ['/r', '/r/apps', '/r/apps/ccd', '/r/libs', '/tmp/x', '/r-other/scripts', 'scripts/x', null]) assert.equal(at(p), null, String(p));
  assert.equal(cloneDir('apps/ccd/docs/x', '/r'), null);
  assert.equal(cloneDir('platops/cnp-flux-config/apps', '/r'), '/r/platops/cnp-flux-config');
});

function gitRepo(dir, branch) {
  fs.mkdirSync(dir, { recursive: true });
  execFileSync('git', ['init', '-q', '-b', branch, dir]);
  execFileSync('git', ['-C', dir, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'x']);
}

test('gatherMetadata registers no repo in the workspace, and the clone and its branch inside one', (t) => {
  const home = tempClaudeHome();
  t.after(home.cleanup);
  const root = path.join(home.root, 'cft-workspace');
  gitRepo(root, 'feat/agent-hub');
  const clone = path.join(root, 'apps', 'dtsse', 'dtsse-agent-hub');
  gitRepo(clone, 'VIBE-607-web-ui');
  fs.mkdirSync(path.join(root, 'scripts'));
  fs.mkdirSync(path.join(clone, 'src'));

  for (const cwd of [root, path.join(root, 'scripts'), path.join(root, 'apps', 'dtsse')]) {
    const meta = gatherMetadata('sess-meta', { cwd, root });
    assert.equal(meta.repo, null, cwd);
    assert.equal(meta.branch, null, cwd);
    assert.equal(meta.cwd, cwd);
    assert.ok(!autoTopics(meta).includes('cft-workspace'));
  }
  const inClone = gatherMetadata('sess-meta', { cwd: path.join(clone, 'src'), root });
  assert.equal(inClone.repo, 'dtsse-agent-hub');
  assert.equal(inClone.branch, 'VIBE-607-web-ui');
  assert.equal(inClone.cwd, path.join(clone, 'src'));
});

test('reconnect backoff doubles to a 60s ceiling', () => {
  const seq = [];
  let b = 0;
  for (let i = 0; i < 9; i++) seq.push((b = nextBackoff(b)));
  assert.deepEqual(seq, [1000, 2000, 4000, 8000, 16000, 32000, 60000, 60000, 60000]);
});
