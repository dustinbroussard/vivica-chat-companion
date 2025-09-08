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

test('callLLM uses mock endpoint without API key', async () => {
  const origFetch = global.fetch;
  const origPort = process.env.PORT;
  delete process.env.LLM_BASE_URL;
  delete process.env.OPENROUTER_API_KEY;
  process.env.PORT = '4242';
  let called = '';
  global.fetch = async (url: any) => {
    called = String(url);
    return { status: 200, ok: true, json: async () => ({ choices: [] }) } as unknown as Response;
  };
  await callLLM({ messages: [{ role: 'user', content: 'hi' }], model: 'x', signal: new AbortController().signal, requestId: 'z' });
  assert.equal(called, 'http://localhost:4242/mock-llm');
  global.fetch = origFetch as typeof fetch;
  if (origPort) process.env.PORT = origPort; else delete process.env.PORT;
});
