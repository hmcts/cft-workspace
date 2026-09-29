// Server-sent events parser (WHATWG event-stream rules, minus `retry` handling).
export function createSseParser({ onEvent, onComment = () => {} }) {
  let buffer = '';
  let data = [];
  let eventType = '';
  let lastEventId = '';
  let pendingCr = false;

  function dispatch() {
    if (data.length === 0) {
      eventType = '';
      return;
    }
    const event = { id: lastEventId, event: eventType || 'message', data: data.join('\n') };
    data = [];
    eventType = '';
    onEvent(event);
  }

  function line(text) {
    if (text === '') return dispatch();
    if (text.startsWith(':')) return onComment(text.slice(1).trimStart());
    const colon = text.indexOf(':');
    const field = colon === -1 ? text : text.slice(0, colon);
    let value = colon === -1 ? '' : text.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'data') data.push(value);
    else if (field === 'event') eventType = value;
    else if (field === 'id' && !value.includes('\0')) lastEventId = value;
  }

  return {
    push(chunk) {
      buffer += chunk;
      let start = 0;
      for (let i = 0; i < buffer.length; i++) {
        const ch = buffer[i];
        if (ch === '\n' && pendingCr) {
          pendingCr = false;
          start = i + 1;
          continue;
        }
        pendingCr = false;
        if (ch === '\n' || ch === '\r') {
          line(buffer.slice(start, i));
          start = i + 1;
          if (ch === '\r') pendingCr = true;
        }
      }
      buffer = buffer.slice(start);
    },
    get lastEventId() {
      return lastEventId;
    },
  };
}
