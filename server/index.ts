import express from 'express';
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { callLLM } from './lib/llmClient.js';
import { trimHistory } from './middleware/trimHistory.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/mock-llm', async (req, res) => {
  const { delay = 0, status = 200 } = req.query as any;
  await new Promise(r => setTimeout(r, Number(delay)));
  if (Number(status) !== 200) {
    return res.status(Number(status)).json({ error: 'mock error' });
  }
  res.json({ id: 'mock', choices: [{ message: { content: 'mock reply' } }] });
});

app.post('/api/chat', async (req: Request, res: Response) => {
  const { messages = [], model = 'openrouter/auto', max_tokens } = req.body || {};
  const turn = messages.length;
  const trimmed = trimHistory(messages);
  const requestId = `${Date.now()}-${randomUUID().slice(0,8)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35000);
  try {
    const start = Date.now();
    const data = await callLLM({ messages: trimmed, model, maxTokens: max_tokens, signal: controller.signal, requestId });
    const ms = Date.now() - start;
    console.log(`[CHAT] id=${requestId} turn=${turn} status=200 t=${ms}ms`);
    res.json(data);
  } catch (e: any) {
    let status = 500;
    let type: string = 'SERVER';
    let message = e.message || 'Unknown error';
    if (e.name === 'AbortError') {
      status = 504; type = 'TIMEOUT'; message = 'Upstream timeout';
    } else if (/status=429/.test(message)) {
      status = 429; type = 'RATE_LIMIT';
    } else if (/status=401/.test(message)) {
      status = 401; type = 'AUTH';
    } else if (/status=413|context|length/i.test(message)) {
      status = 413; type = 'OVERSIZE';
    }
    console.error(`[CHAT] id=${requestId} error=${message}`);
    res.status(status).json({ error: { type, message, status } });
  } finally {
    clearTimeout(timeout);
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`server listening on ${port}`);
});
