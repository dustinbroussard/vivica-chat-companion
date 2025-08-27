const cache = new Map<string, { ts: number; data: unknown }>();
const CACHE_TTL = 60_000;

export async function callLLM({
  messages, model, signal, maxTokens = 512,
  retry = 1, requestId
}: {
  messages: Array<{role:string; content:string}>;
  model: string;
  signal: AbortSignal;
  maxTokens?: number;
  retry?: number;
  requestId: string;
}) {
  const start = Date.now();
  const body = { model, messages, max_tokens: maxTokens, stream: false };
  const key = JSON.stringify({ model, messages, maxTokens });
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }
  const url = process.env.LLM_BASE_URL ?? "https://openrouter.ai/api/v1/chat/completions";
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "HTTP-Referer": process.env.APP_URL ?? "http://localhost",
    "X-Title": "Vivica"
  } as Record<string, string>;

  for (let attempt = 0; attempt <= retry; attempt++) {
    try {
      const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal });
      const ms = Date.now() - start;
      console.log(`[LLM] id=${requestId} attempt=${attempt} status=${res.status} t=${ms}ms size=${JSON.stringify(body).length}`);

      if (res.status === 429 || res.status >= 500) {
        if (attempt < retry) {
          const backoff = Math.min(2000 * (attempt + 1) + Math.random() * 400, 6000);
          await new Promise(r => setTimeout(r, backoff));
          continue;
        }
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`LLM_ERROR status=${res.status} body=${text.slice(0, 500)}`);
      }
      const json = await res.json();
      cache.set(key, { ts: Date.now(), data: json });
      return json;
    } catch (e) {
      if (attempt >= retry) throw e;
    }
  }
}
