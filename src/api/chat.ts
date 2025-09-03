export interface ChatPayload {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
}

export async function sendChat(
  payload: ChatPayload,
  { timeoutMs = 30000, retries = 2 }: { timeoutMs?: number; retries?: number } = {}
) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        let message = `CHAT_${res.status}`;
        try {
          const data = await res.json();
          message = data?.error?.message || message;
        } catch {}

        if ((res.status === 429 || res.status >= 500) && attempt < retries) {
          const backoff = Math.min(500 * 2 ** attempt, 4000);
          await new Promise(r => setTimeout(r, backoff));
          continue;
        }
        const err = new Error(message) as Error & { status?: number };
        err.status = res.status;
        throw err;
      }

      return await res.json();
    } catch (e: unknown) {
      const err = e as { name?: string };
      if (err.name === 'AbortError') {
        if (attempt >= retries) throw new Error('TIMEOUT');
      } else {
        if (attempt >= retries) throw e;
      }
      const backoff = Math.min(500 * 2 ** attempt, 4000);
      await new Promise(r => setTimeout(r, backoff));
    } finally {
      clearTimeout(to);
    }
  }

  throw new Error('CHAT_FAILED');
}
