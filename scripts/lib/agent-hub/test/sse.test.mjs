import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSseParser } from '../sse.mjs';

function collect() {
  const events = [];
  const comments = [];
  const parser = createSseParser({ onEvent: (e) => events.push(e), onComment: (c) => comments.push(c) });
  return { parser, events, comments };
}

test('parses id, event and data, and comments', () => {
  const { parser, events, comments } = collect();
  parser.push('id: 1234\nevent: direct\ndata: {"message":{"id":"1234"}}\n\n: ping\n\n');
  assert.deepEqual(events, [{ id: '1234', event: 'direct', data: '{"message":{"id":"1234"}}' }]);
  assert.deepEqual(comments, ['ping']);
  assert.equal(parser.lastEventId, '1234');
});

test('handles chunks split mid-line and mid-CRLF', () => {
  const { parser, events } = collect();
  for (const chunk of ['id: 7\r', '\nevent: dir', 'ect\r\nda', 'ta: a\r\ndata: b\r', '\n\r', '\n']) parser.push(chunk);
  assert.deepEqual(events, [{ id: '7', event: 'direct', data: 'a\nb' }]);
});

test('bare CR line endings and default event type', () => {
  const { parser, events } = collect();
  parser.push('data: x\r\rdata:y\n\n');
  assert.deepEqual(events.map((e) => [e.event, e.data]), [['message', 'x'], ['message', 'y']]);
});

test('a block with no data dispatches nothing and resets the event type', () => {
  const { parser, events } = collect();
  parser.push('event: direct\n\ndata: z\n\n');
  assert.deepEqual(events, [{ id: '', event: 'message', data: 'z' }]);
});

test('id persists across events until changed', () => {
  const { parser, events } = collect();
  parser.push('id: 1\ndata: a\n\ndata: b\n\n');
  assert.deepEqual(events.map((e) => e.id), ['1', '1']);
});

test('a retry field is ignored and the reconnect event is dispatched by name', () => {
  const { parser, events, comments } = collect();
  parser.push(': connected\n\nretry: 1000\n\nevent: reconnect\ndata: {}\n\n');
  assert.deepEqual(comments, ['connected']);
  assert.deepEqual(events, [{ id: '', event: 'reconnect', data: '{}' }]);
});
