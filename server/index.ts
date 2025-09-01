import express from 'express';
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { callLLM } from './lib/llmClient.js';
import { trimHistory } from './middleware/trimHistory.js';
import { authenticate } from './middleware/auth.js';
import { rateLimit } from './middleware/rateLimit.js';
import { validateChat } from './middleware/validateChat.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/mock-llm', async (req, res) => {
  const { delay = 0, status = 200 } = req.query as Record<string, string | undefined>;
  await new Promise(r => setTimeout(r, Number(delay)));
  if (Number(status) !== 200) {
    return res.status(Number(status)).json({ error: 'mock error' });
  }
  res.json({ id: 'mock', choices: [{ message: { content: 'mock reply' } }] });
});

type ChatBody = { messages: Array<{ role: string; content: string }>; model: string; max_tokens?: number };

app.post('/api/chat', authenticate, rateLimit, validateChat, async (req: Request, res: Response) => {
  const { messages, model, max_tokens } = req.body as ChatBody;
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
  } catch (e: unknown) {
    let status = 500;
    let type: string = 'SERVER';
    const err = e as { name?: string; message?: string };
    let message = err.message || 'Unknown error';
    if (err.name === 'AbortError') {
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

// Simple in-memory cache for model list
const modelsCache: { ts: number; data: unknown } = { ts: 0, data: null } as any;
const MODELS_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

app.get('/api/models', async (_req, res) => {
  try {
    const now = Date.now();
    if (modelsCache.data && now - modelsCache.ts < MODELS_TTL_MS) {
      return res.json(modelsCache.data);
    }
    const url = 'https://openrouter.ai/api/v1/models';
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (process.env.OPENROUTER_API_KEY) {
      headers['Authorization'] = `Bearer ${process.env.OPENROUTER_API_KEY}`;
    }
    const r = await fetch(url, { headers });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return res.status(r.status).json({ error: { type: 'UPSTREAM', message: text || `HTTP ${r.status}` } });
    }
    const data = await r.json();
    modelsCache.data = data;
    modelsCache.ts = now;
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: { type: 'SERVER', message: e?.message || 'Failed to fetch models' } });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`server listening on ${port}`);
});
