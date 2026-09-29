import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { runHook } from '../hooks.mjs';
import { agentName, conversationTitles, ensureStateDir, nameSlug, statePath, transcriptPath } from '../session.mjs';
import { tempClaudeHome } from './helpers.mjs';

let home;
const saved = {};

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

function registry(sid, fields) {
  fs.writeFileSync(path.join(home.claude, 'sessions', `${sid}.json`), JSON.stringify({ pid: 1, sessionId: sid, ...fields }));
}

function transcript(file, entries) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${entries.map((e) => JSON.stringify(e)).join('\n')}\n`);
}

test('nameSlug turns a title into an addressable handle', () => {
  assert.equal(nameSlug('dtsse-agent-hub redesign'), 'dtsse-agent-hub-redesign');
  assert.equal(nameSlug('  Fix PCS: make-order (v2)!  '), 'fix-pcs-make-order-v2');
  assert.equal(nameSlug(''), '');
  assert.equal(nameSlug('x'.repeat(80)).length, 64);
});

test('conversationTitles reads the latest custom and ai titles from the tail', () => {
  const file = path.join(home.root, 'titles.jsonl');
  transcript(file, [
    { type: 'ai-title', aiTitle: 'old title' },
    { type: 'user', message: { content: 'hello "ai-title" in text' } },
    { type: 'custom-title', customTitle: 'my conversation' },
    { type: 'ai-title', aiTitle: 'new title' },
  ]);
  assert.deepEqual(conversationTitles(file), { ai: 'new title', custom: 'my conversation' });
  assert.deepEqual(conversationTitles(path.join(home.root, 'missing.jsonl')), {});
});

test('agentName prefers a /rename, then the custom title, then the ai title, then the derived handle', () => {
  const cwd = '/work/cft-workspace';
  const file = (sid) => path.join(home.claude, 'projects', '-work-cft-workspace', `${sid}.jsonl`);

  registry('renamed', { name: 'agent-hub', nameSource: 'user', cwd });
  transcript(file('renamed'), [{ type: 'ai-title', aiTitle: 'something else' }]);
  assert.equal(agentName('renamed'), 'agent-hub');

  registry('custom', { name: 'hmcts-a1', nameSource: 'derived', cwd });
  transcript(file('custom'), [{ type: 'ai-title', aiTitle: 'ai one' }, { type: 'custom-title', customTitle: 'Custom One' }]);
  assert.equal(agentName('custom'), 'custom-one');

  registry('titled', { name: 'hmcts-da', nameSource: 'derived', cwd });
  transcript(file('titled'), [{ type: 'ai-title', aiTitle: 'dtsse-agent-hub redesign' }]);
  assert.equal(agentName('titled'), 'dtsse-agent-hub-redesign');

  registry('untitled', { name: 'hmcts-6f', nameSource: 'derived', cwd });
  assert.equal(agentName('untitled'), 'hmcts-6f');

  assert.equal(agentName('0123456789-unregistered'), '01234567');
});

test('transcriptPath uses what a hook recorded, then the worker cursor, then the registry cwd', async () => {
  const sid = 'sess-transcript';
  registry(sid, { name: 'hmcts-x', cwd: '/w/x' });
  assert.equal(transcriptPath(sid), path.join(home.claude, 'projects', '-w-x', `${sid}.jsonl`));

  ensureStateDir(sid);
  fs.writeFileSync(statePath(sid, 'cursors.json'), JSON.stringify({ transcript_path: '/from/worker.jsonl' }));
  assert.equal(transcriptPath(sid), '/from/worker.jsonl');

  fs.writeFileSync(statePath(sid, 'enabled'), 'x');
  fs.writeFileSync(statePath(sid, 'bridge.pid'), `${process.pid}\n`);
  await runHook('UserPromptSubmit', { session_id: sid, transcript_path: '/from/hook.jsonl' }, { ...process.env, AGENT_HUB_CHILD: '' });
  assert.equal(transcriptPath(sid), '/from/hook.jsonl');
});
