import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendChat } from '../../src/api/chat.ts';

test('sendChat times out', async () => {
  const orig = global.fetch;
  global.fetch = (_url: string, opts: { signal: AbortSignal }) => new Promise((_, reject) => {
    opts.signal.addEventListener('abort', () => {
      const err = new Error('AbortError') as Error & { name: string };
      err.name = 'AbortError';
      reject(err);
    });
  });
  await assert.rejects(() => sendChat({ model: 'x', messages: [] }, { timeoutMs: 10 }), /TIMEOUT/);
  global.fetch = orig as typeof fetch;
});

test('sendChat retries on server error', async () => {
  let calls = 0;
  const orig = global.fetch;
  global.fetch = async () => {
    calls++;
    if (calls === 1) {
      return new Response(JSON.stringify({ error: { message: 'fail' } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };
  const res = await sendChat({ model: 'x', messages: [{ role: 'user', content: 'hi' }] }, { retries: 1 });
  assert.equal(calls, 2);
  assert.deepEqual(res, { ok: true });
  global.fetch = orig as typeof fetch;
});
