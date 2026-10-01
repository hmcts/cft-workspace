import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { findSecret, loadPatterns, PATTERNS_FILE } from '../secret-scan.mjs';
import { PROJECT_ROOT } from '../session.mjs';
import { fakeSecrets } from './helpers.mjs';

const LIB = path.join(PROJECT_ROOT, 'scripts', 'lib', '_secret_scan.sh');
const clean = ['nothing to see here', 'password: short', 'the api key lives in Key Vault', 'eyJshort.'];

function bashScan(text, lib = LIB) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'secret-scan-'));
  const file = path.join(dir, 'scan.txt');
  fs.writeFileSync(file, `${text}\n`);
  const r = spawnSync('bash', ['-c', 'set -euo pipefail; source "$1"; s=0; secret_scan_file "$2" || s=$?; echo "$s"', 'x', lib, file], { encoding: 'utf8' });
  fs.rmSync(dir, { recursive: true, force: true });
  return Number(r.stdout.trim());
}

test('the pattern file parses and skips comments', () => {
  const patterns = loadPatterns();
  assert.equal(patterns.length, 5);
  assert.ok(!fs.readFileSync(PATTERNS_FILE, 'utf8').split('\n').some((l) => / $/.test(l)), 'no trailing spaces');
});

for (const [name, secret] of Object.entries(fakeSecrets)) {
  test(`JS scan and knowledge-sweep's bash scan both catch ${name}`, () => {
    const text = `some prose\n${secret}\nmore prose`;
    assert.ok(findSecret(text), 'JS scan');
    assert.equal(bashScan(text), 0, 'bash scan status');
  });
}

for (const text of clean) {
  test(`JS and bash agree "${text}" is clean`, () => {
    assert.equal(findSecret(text), null);
    assert.equal(bashScan(text), 1);
  });
}

test('the bash scan fails closed when the pattern list is missing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'secret-scan-lib-'));
  fs.copyFileSync(LIB, path.join(dir, '_secret_scan.sh'));
  assert.equal(bashScan('harmless', path.join(dir, '_secret_scan.sh')), 2);
  fs.writeFileSync(path.join(dir, 'secret-patterns'), '# only a comment\n\n');
  assert.equal(bashScan('harmless', path.join(dir, '_secret_scan.sh')), 2);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('knowledge-sweep blocks on the shared scan', () => {
  const sweep = fs.readFileSync(path.join(PROJECT_ROOT, 'scripts', 'knowledge-sweep'), 'utf8');
  assert.match(sweep, /^source "\$\(dirname "\$0"\)\/lib\/_secret_scan\.sh"$/m);
  assert.match(sweep, /secret_scan_file "\$SCAN" \|\| scan_status=\$\?\ncase \$scan_status in\n    1\) ;;\n    0\) discard_proposal/);
  assert.doesNotMatch(sweep, /grep -Eq/);
});
