import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendChat } from '../../src/api/chat.ts';

test('sendChat times out', async () => {
  const orig = global.fetch;
  global.fetch = (_url: any, opts: any) => new Promise((_, reject) => {
    opts.signal.addEventListener('abort', () => {
      const err: any = new Error('AbortError');
      err.name = 'AbortError';
      reject(err);
    });
  });
  await assert.rejects(() => sendChat({ model: 'x', messages: [] }, { timeoutMs: 10 }), /TIMEOUT/);
  global.fetch = orig as any;
});
