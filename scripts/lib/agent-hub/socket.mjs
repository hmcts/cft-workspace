import net from 'node:net';

// Opens the connection only when there is something to send: the inbox closes idle
// connections after 30s.
export function deliverToSocket(socketPath, token, content, { timeoutMs = 5000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!socketPath) return reject(new Error('no messaging socket for this session'));
    if (!token) return reject(new Error('CLAUDE_CODE_MESSAGING_TOKEN is not set'));
    const conn = net.createConnection(socketPath);
    let settled = false;
    const finish = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      conn.destroy();
      if (err) reject(err);
      else resolve();
    };
    const timer = setTimeout(() => finish(new Error(`socket write timed out after ${timeoutMs}ms`)), timeoutMs);
    conn.on('error', (err) => finish(err));
    conn.on('connect', () => {
      const lines = `${JSON.stringify({ type: 'auth', token })}\n${JSON.stringify({
        type: 'user',
        message: { role: 'user', content },
      })}\n`;
      conn.end(lines, () => finish());
    });
  });
}
