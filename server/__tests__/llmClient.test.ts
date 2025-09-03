import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callLLM } from '../lib/llmClient.ts';

test('callLLM retries once on 429', async () => {
  let calls = 0;
  const orig = global.fetch;
  global.fetch = async () => {
    calls++;
    if (calls === 1) {
      return { status: 429, ok: false, text: async () => '', json: async () => ({}) } as unknown as Response;
    }
    return { status: 200, ok: true, json: async () => ({ choices: [] }) } as unknown as Response;
  };
  const res = await callLLM({ messages: [], model: 'test', signal: new AbortController().signal, requestId: 'x' });
  assert.equal(calls, 2);
  assert.deepEqual(res.choices.length, 0);
  global.fetch = orig as typeof fetch;
});

test('callLLM retries on network error', async () => {
  let calls = 0;
  const orig = global.fetch;
  global.fetch = async () => {
    calls++;
    if (calls === 1) {
      throw new Error('network');
    }
    return { status: 200, ok: true, json: async () => ({ choices: [] }) } as unknown as Response;
  };
  const res = await callLLM({ messages: [{ role: 'user', content: 'hi' }], model: 'test2', signal: new AbortController().signal, requestId: 'y' });
  assert.equal(calls, 2);
  assert.deepEqual(res.choices.length, 0);
  global.fetch = orig as typeof fetch;
});
