import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Points every ~/.claude lookup at a throwaway directory.
export function tempClaudeHome() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-hub-test-'));
  const claude = path.join(root, '.claude');
  fs.mkdirSync(path.join(claude, 'sessions'), { recursive: true });
  return {
    root,
    claude,
    hub: path.join(claude, 'agent-hub'),
    env: { HOME: root, CLAUDE_CONFIG_DIR: claude },
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

// Built at runtime so no secret-shaped literal sits in the repo.
export const fakeSecrets = {
  githubToken: `${'gh'}p_${'A1b2C3d4'.repeat(4)}`,
  jwt: `${'ey'}J${'a'.repeat(24)}.payload.sig`,
  accountKey: `DefaultEndpointsProtocol=https;${'Account'}Key=abc`,
  privateKey: `-----${'BEGIN'} RSA PRIVATE KEY-----`,
  password: `${'pass'}word: "${'Zx9'.repeat(6)}"`,
};
