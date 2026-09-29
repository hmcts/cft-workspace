import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT } from './session.mjs';

export const PATTERNS_FILE = path.join(PROJECT_ROOT, 'scripts', 'lib', 'secret-patterns');

export function parsePatterns(text) {
  return text
    .split('\n')
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((line) => new RegExp(line));
}

let cached = null;

export function loadPatterns(file = PATTERNS_FILE) {
  if (file === PATTERNS_FILE && cached) return cached;
  const patterns = parsePatterns(fs.readFileSync(file, 'utf8'));
  if (patterns.length === 0) throw new Error(`no secret patterns in ${file}`);
  if (file === PATTERNS_FILE) cached = patterns;
  return patterns;
}

// grep matches line by line; none of the patterns can span a newline, so testing the
// whole text is equivalent. The matched text is never returned, only its pattern.
export function findSecret(text, patterns = loadPatterns()) {
  if (!text) return null;
  for (const re of patterns) if (re.test(text)) return re.source;
  return null;
}

export function containsSecret(text, patterns) {
  return findSecret(text, patterns) !== null;
}
