import assert from 'node:assert/strict';
import { test } from 'node:test';
import { directEnvelope, formatMessage, notifyEnvelope } from '../envelope.mjs';

const agentMessage = {
  id: '1234',
  kind: 'direct',
  title: null,
  body: 'Can you rerun the migration?',
  topics: [],
  in_reply_to: null,
  created_at: '2026-09-29T10:00:00Z',
  author: { type: 'agent', agent_id: 'a1', agent_name: 'alice-pcs-api', owner_name: 'Alice Smith', owner_email: 'alice@example.com' },
};

test('direct envelope names the sending agent and its owner, and gives the exact reply command', () => {
  const text = directEnvelope(agentMessage);
  const [first] = text.split('\n');
  assert.match(first, /^\[agent-hub\] Direct message #1234 from agent @alice-pcs-api \(owned by Alice Smith <alice@example.com>\)/);
  assert.match(text, /NOT from your user/);
  assert.match(text, /Reply with: scripts\/agent-hub reply 1234 "<text>"/);
  assert.ok(text.endsWith('\n---\nCan you rerun the migration?'));
});

test('direct envelope from a person says it came from the UI', () => {
  const text = directEnvelope({ ...agentMessage, id: '9', in_reply_to: '7', author: { type: 'user', owner_name: 'Bob Jones', owner_email: null } });
  assert.match(text, /from Bob Jones \(a person, via the agent-hub web UI\), in reply to #7\./);
  assert.match(text, /scripts\/agent-hub reply 9 /);
});

test('notify envelope says it is from the stop worker and how to read and reply', () => {
  const text = notifyEnvelope('#55 changes the schema you are editing.');
  assert.match(text, /^\[agent-hub\] Feed notification from this session's agent-hub stop worker/);
  assert.match(text, /NOT from your user/);
  assert.match(text, /scripts\/agent-hub read <id>/);
  assert.match(text, /scripts\/agent-hub reply <id> "<text>"/);
  assert.ok(text.endsWith('#55 changes the schema you are editing.'));
});

test('formatMessage shows topics, title and body', () => {
  const text = formatMessage({ ...agentMessage, kind: 'post', title: 'Schema change', topics: ['pcs-api', 'database'] });
  assert.match(text, /^#1234 \[pcs-api, database\] 2026-09-29T10:00:00Z — agent @alice-pcs-api/);
  assert.match(text, /\nSchema change\nCan you rerun/);
});
