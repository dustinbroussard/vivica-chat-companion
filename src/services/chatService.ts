
import { toast } from "@/components/ui/use-toast";
import { sanitizeParams, MODEL_CAPS } from './modelCaps';
import { enforceBudget } from './tokenUtils';
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_call_id?: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  isCodeRequest?: boolean; // Flag for code requests
  tools?: Record<string, unknown>[];
  tool_choice?: 'auto' | 'none' | {name: string};
  profile?: {  // Include full profile for model routing
    model: string;
    codeModel: string;
    temperature: number;
    maxTokens: number;
  };
  fallbackModel?: string;
  timeoutMs?: number;
}

export interface StreamStart {
  type: 'stream_start';
  data: { isCodeRequest?: boolean };
}

export interface StreamContent {
  content: string;
  isCodeRequest?: boolean;
}

function statusFromResponse(resp: Response, text: string) {
  const err = new Error(text || `HTTP ${resp.status}`) as Error & {
    status?: number;
    body?: string;
    retryAfterMs?: number;
  };
  err.status = resp.status;
  err.body = text;
  // Respect Retry-After and common rate-limit headers if provided
  const ra = resp.headers.get('retry-after');
  const reset = resp.headers.get('x-ratelimit-reset') || resp.headers.get('x-ratelimit-reset-ms');
  let retryAfterMs: number | undefined;
  if (ra) {
    // Retry-After can be seconds or an HTTP date
    const n = Number(ra);
    if (!Number.isNaN(n)) retryAfterMs = Math.max(0, Math.round(n * 1000));
    else {
      const t = Date.parse(ra);
      if (!Number.isNaN(t)) retryAfterMs = Math.max(0, t - Date.now());
    }
  }
  if (!retryAfterMs && reset) {
    const n = Number(reset);
    if (!Number.isNaN(n)) {
      // If it's clearly in ms, use as-is; if seconds, multiply
      retryAfterMs = n > 10_000 ? n : Math.max(0, Math.round(n * 1000));
    }
  }
  if (retryAfterMs && Number.isFinite(retryAfterMs)) {
    err.retryAfterMs = Math.min(retryAfterMs, 5 * 60_000); // cap at 5 minutes
  }
  return err;
}

function classify(err: unknown): 'network' | 'rate_limit' | 'unauthorized' | 'server' | 'client' {
  const e = err as { status?: number; name?: string };
  const s = e.status;
  if (
    !s &&
    (e.name === 'TypeError' || e.name === 'AbortError' || /NetworkError|Failed to fetch|TIMEOUT/i.test(String(err)))
  ) return 'network';
  if (s === 401) return 'unauthorized';
  if (s === 429) return 'rate_limit';
  if (s && s >= 500) return 'server';
  if (s && s >= 400) return 'client';
  return 'network';
}

export class ChatService {
  /** Primary key used for OpenRouter requests */
  // TODO: allow setting multiple keys here instead of pulling from localStorage
  private apiKey: string;
  // apiKeyList is unused; keep until multi-key refactor
  private apiKeyList: string[];
  private baseUrl: string;
  private telemetry = {
    keyUsage: {} as Record<string, {success: number; failures: number; cooldownUntil?: number}>,
    lastUsedKey: '',
  };

  private static CIRCUIT: Record<string, {openUntil?: number; failures: number}> = {};

  private static COOLDOWN_MS = 60 * 1000; // 1 minute default

  // Remember the last working key across instances
  private static activeKey: string | null = null;
  // Track temporarily failing keys to avoid retrying them repeatedly
  private static keyCooldowns: Record<string, number> = {};

  // Simple pacer to avoid bursty requests across the app
  private static lastRequestAt = 0;
  private static MIN_INTERVAL_MS = 600; // ~1.6 req/s baseline
  // Adaptive penalty after rate limits
  private static penaltyUntil = 0;
  private static penaltyIntervalMs = 0;
  private static async pace() {
    const now = Date.now();
    // Apply adaptive penalty window if active
    const interval = (ChatService.penaltyUntil > now)
      ? Math.max(ChatService.MIN_INTERVAL_MS, ChatService.penaltyIntervalMs || 1200)
      : ChatService.MIN_INTERVAL_MS;
    if (ChatService.penaltyUntil <= now) {
      ChatService.penaltyIntervalMs = 0;
    }
    const wait = ChatService.lastRequestAt + interval - now;
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    ChatService.lastRequestAt = Date.now();
  }
  private static setGlobalPenalty(ms?: number) {
    const now = Date.now();
    const extra = Math.min(Math.max(ms ?? 60_000, 15_000), 5 * 60_000); // 15s–5m
    ChatService.penaltyUntil = now + extra;
    // During penalty, space requests more aggressively
    ChatService.penaltyIntervalMs = Math.max(ChatService.penaltyIntervalMs, 1500);
  }
  static isPenalized() { return Date.now() < ChatService.penaltyUntil; }
  static penaltyRemaining() { return Math.max(0, ChatService.penaltyUntil - Date.now()); }

  constructor(apiKey: string, apiUrl?: string) {
    if (!apiKey) throw new Error('API key is required');
    this.apiKey = apiKey;
    // Allow API URL override via parameter or Vite env var
    this.baseUrl =
      apiUrl || import.meta.env.VITE_OPENROUTER_API_URL || 'https://openrouter.ai/api/v1';
    if (this.baseUrl.startsWith('http://') && window.location.protocol === 'https:') {
      console.warn('Using HTTP API endpoint on HTTPS page may be blocked due to mixed content.');
    }
    this.initKeyTelemetry();
  }

  private initKeyTelemetry() {
    const saved = localStorage.getItem('vivica-key-telemetry');
    if (saved) {
      try {
        this.telemetry = JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to load key telemetry', e);
      }
    }
  }

  private saveKeyTelemetry() {
    localStorage.setItem(
      'vivica-key-telemetry', 
      JSON.stringify(this.telemetry)
    );
  }

  private trackKeyUsage(key: string, success: boolean) {
    const shortKey = key.slice(-4);
    if (!this.telemetry.keyUsage[shortKey]) {
      this.telemetry.keyUsage[shortKey] = { success: 0, failures: 0 };
    }

    const usage = this.telemetry.keyUsage[shortKey];

    if (success) {
      usage.success++;
      usage.cooldownUntil = undefined;
      this.telemetry.lastUsedKey = shortKey;
    } else {
      usage.failures++;
      usage.cooldownUntil = Date.now() + ChatService.COOLDOWN_MS;
    }

    this.saveKeyTelemetry();
  }

  private static loadActiveKey(): string | null {
    if (ChatService.activeKey !== null) return ChatService.activeKey;
    const saved = localStorage.getItem('vivica-active-api-key');
    ChatService.activeKey = saved || null;
    return ChatService.activeKey;
  }

  private static setActiveKey(key: string) {
    ChatService.activeKey = key;
    localStorage.setItem('vivica-active-api-key', key);
  }

  private static loadCooldowns() {
    if (Object.keys(ChatService.keyCooldowns).length > 0) return;
    const saved = localStorage.getItem('vivica-key-cooldowns');
    if (saved) {
      try {
        ChatService.keyCooldowns = JSON.parse(saved);
      } catch {
        ChatService.keyCooldowns = {};
      }
    }
  }

  private static saveCooldowns() {
    localStorage.setItem('vivica-key-cooldowns', JSON.stringify(ChatService.keyCooldowns));
  }

  private static setCooldown(key: string, ms = 5 * 60 * 1000) {
    ChatService.loadCooldowns();
    ChatService.keyCooldowns[key] = Date.now() + ms;
    ChatService.saveCooldowns();
  }

  private static isInCooldown(key: string): boolean {
    ChatService.loadCooldowns();
    const expiry = ChatService.keyCooldowns[key];
    if (!expiry) return false;
    if (Date.now() > expiry) {
      delete ChatService.keyCooldowns[key];
      ChatService.saveCooldowns();
      return false;
    }
    return true;
  }

  private static clearCooldown(key: string) {
    ChatService.loadCooldowns();
    if (ChatService.keyCooldowns[key]) {
      delete ChatService.keyCooldowns[key];
      ChatService.saveCooldowns();
    }
  }

  private static isCircuitOpen(model: string): boolean {
    const s = ChatService.CIRCUIT[model];
    return !!(s?.openUntil && s.openUntil > Date.now());
  }

  private static recordFailure(model: string) {
    const s = (ChatService.CIRCUIT[model] ||= { failures: 0 });
    s.failures++;
    if (s.failures >= 3) {
      s.openUntil = Date.now() + 5 * 60_000;
    }
  }

  private static recordSuccess(model: string) {
    ChatService.CIRCUIT[model] = { failures: 0 };
  }

  static getModelHealth(model: string) {
    const s = ChatService.CIRCUIT[model];
    if (s?.openUntil && s.openUntil > Date.now()) {
      return { state: 'open' as const, failures: s.failures };
    }
    if (s?.failures && s.failures > 0) {
      return { state: 'degraded' as const, failures: s.failures };
    }
    return { state: 'ok' as const, failures: 0 };
  }

  private async trySendWithKey(
    request: ChatRequest,
    apiKey: string,
    timeoutMs = 30000,
    rid?: string
  ): Promise<Response> {
    const referer = /^https?:/i.test(window.location.origin)
      ? window.location.origin
      : undefined;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'Vivica Chat Companion',
    };
    if (referer) {
      headers['HTTP-Referer'] = referer;
    }

    const endpoint = `${this.baseUrl}/chat/completions`;
    const send = async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const start = Date.now();
      try {
        // Global pacer: keep a minimum gap between requests
        await ChatService.pace();
        // Emit request diagnostics
        try {
          window.dispatchEvent(new CustomEvent('ai:request', { detail: { rid, model: request.model, endpoint } }));
        } catch {}
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(request),
          signal: controller.signal,
        });
        // Only read body for logging on non-stream responses; avoid blocking streams
        let sample = '';
        if (!resp.ok) {
          const text = await resp.clone().text().catch(() => '');
          throw statusFromResponse(resp, text);
        } else if (!request.stream) {
          sample = await resp.clone().text().catch(() => '');
        }
        const elapsed = Math.round(Date.now() - start);
        console.log('[AI][recv]', {
          rid,
          status: resp.status,
          elapsed,
          sample: sample.slice(0, 200),
        });
        try {
          window.dispatchEvent(new CustomEvent('ai:response', { detail: { rid, status: resp.status, elapsed } }));
        } catch {}
        return resp;
      } finally {
        clearTimeout(timer);
      }
    };

    const FAIL_CODES = new Set([408, 409, 429, 500, 502, 503, 504]);

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await send();
      } catch (error: unknown) {
        const status = (error as { status?: number }).status ?? 0;
        console.log('[AI][error]', { rid, status, msg: String(error) });
        if (!FAIL_CODES.has(status) || attempt === 2) {
          throw error;
        }
        // Backoff with jitter; prefer Retry-After when provided
        const ra = (error as { retryAfterMs?: number }).retryAfterMs;
        const base = Math.min(400 * Math.pow(2, attempt), 4000);
        const delay = Math.max(ra ?? 0, base + Math.random() * 400);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw new Error('unreachable');
  }

  private isCodeRequest(messages: ChatMessage[]): boolean {
    // Check if last message contains code-related keywords or backticks
    const lastMessage = messages[messages.length - 1]?.content.toLowerCase() || '';
    return lastMessage.includes('code') || 
           lastMessage.includes('function') ||
           lastMessage.includes('```') ||
           lastMessage.includes('programming');
  }

  async sendMessage(request: ChatRequest): Promise<Response> {
    // Route to code model if this is a code request
    const isCode = request.isCodeRequest ?? this.isCodeRequest(request.messages);
    let effectiveModel = isCode && request.profile?.codeModel
      ? request.profile.codeModel
      : request.model;

    if (ChatService.isCircuitOpen(effectiveModel) && request.fallbackModel) {
      effectiveModel = request.fallbackModel;
    }

    // Exclude profile metadata from the API request body
    const { profile: _profile, isCodeRequest: _unused, timeoutMs = 30000, fallbackModel: _fb, ...rest } = request;
    let apiRequest: ChatRequest = {
      ...rest,
      model: effectiveModel,
    };

    apiRequest = sanitizeParams(effectiveModel, apiRequest) as ChatRequest;

    const limit = apiRequest.max_tokens || request.profile?.maxTokens || MODEL_CAPS[effectiveModel]?.maxInputTokens;
    if (apiRequest.messages) {
      apiRequest.messages = enforceBudget(apiRequest.messages, limit);
    }

    // Persist detection result for callers that rely on the flag
    request.isCodeRequest = isCode;

    const rid = (globalThis.crypto as { randomUUID?: () => string } | undefined)?.randomUUID?.() ??
      Math.random().toString(36).slice(2);
    const endpoint = `${this.baseUrl}/chat/completions`;
    const inChars = apiRequest.messages?.reduce((s, m) => s + m.content.length, 0) ?? 0;
    const { model: _m, messages: _msg, ...params } = apiRequest as Record<string, unknown>;
    console.log('[AI][send]', { rid, model: effectiveModel, endpoint, inChars, params });

    // Get all API keys from storage - constructor key first, then settings keys
    const settings = JSON.parse(localStorage.getItem('vivica-settings') || '{}');
    const keys = Array.from(new Set([
      this.apiKey,
      settings.apiKey1 || '',
      settings.apiKey2 || '',
      settings.apiKey3 || ''
    ]
      .map((k: string) => k.trim())
      .filter(Boolean)));

    // Prefer static cooldown tracking
    const usableKeys = keys.filter(k => !ChatService.isInCooldown(k));

    if (usableKeys.length === 0) {
      throw new Error('No valid API keys available. Please check your settings.');
    }

    let lastError: unknown = null;

    // Only show visual feedback if we have multiple keys to try
    const showRetryFeedback = usableKeys.length > 1;

    // Determine starting key based on last success
    const active = ChatService.loadActiveKey();
    let startIndex = active ? usableKeys.indexOf(active) : -1;
    if (startIndex === -1) {
      startIndex = usableKeys.indexOf(this.apiKey);
      if (startIndex === -1) startIndex = 0;
    }

    const rotate = (i: number) => (startIndex + i) % usableKeys.length;

    // Try each key in order until one succeeds
    for (let attempt = 0; attempt < usableKeys.length; attempt++) {
      const idx = rotate(attempt);
      const key = usableKeys[idx].trim();
      try {
        if (attempt > 0 && showRetryFeedback) {
          toast.message(`Connecting with backup key ${attempt + 1}...`, {
            duration: 1000,
            position: 'bottom-center'
          });
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        const response = await this.trySendWithKey(apiRequest, key, timeoutMs, rid);
        this.trackKeyUsage(key, true);
        ChatService.setActiveKey(key);
        ChatService.clearCooldown(key);
        ChatService.recordSuccess(effectiveModel);
        Object.defineProperty(response, 'rid', { value: rid, enumerable: true });

        if (attempt > 0) {
          const feedback = showRetryFeedback ? 
            toast.success(`Connected with backup key`, {
              duration: 2000,
              position: 'bottom-center'
            }) :
            console.log(`Connected with backup key ${key.slice(-4)}`);
        
          // Exponential backoff logging
          const backoff = Math.min(1000 * Math.pow(2, attempt), 8000);
          console.debug(`API request succeeded after ${attempt} retries (next backoff: ${backoff}ms)`);
        }

        return response;
      } catch (error) {
        this.trackKeyUsage(key, false);
        lastError = error;
        ChatService.recordFailure(effectiveModel);

        const kind = classify(error);
        if (kind === 'rate_limit') {
          const ra = (error as { retryAfterMs?: number }).retryAfterMs;
          ChatService.setCooldown(key, ra && ra > 0 ? ra : 60_000);
          ChatService.setGlobalPenalty(ra);
        } else if (kind === 'server' || kind === 'network') {
          ChatService.setCooldown(key, 3 * 60_000);
        } else if (kind === 'unauthorized') {
          ChatService.setCooldown(key, 30 * 60_000);
        } else {
          // client errors: no cooldown
        }

        if (attempt === usableKeys.length - 1) break;
      }
    }

    // All attempts failed - format a helpful error message
    const errorMsg = (() => {
      const kind = classify(lastError);
      if (kind === 'unauthorized') return 'Invalid API key. Check Settings → API Keys.';
      if (kind === 'rate_limit') return 'Rate limited. Try again in a minute.';
      if (kind === 'server') return 'Upstream error. Try again shortly.';
      if (kind === 'network') return 'Network error. Check the connection.';
      const le = lastError as { body?: string; message?: string } | null;
      return le?.body || le?.message || 'Request failed.';
    })();

    console.error('OpenRouter API failed after all attempts:', errorMsg, rid);
    try {
      const kind = classify(lastError);
      const ra = (lastError as { retryAfterMs?: number }).retryAfterMs;
      window.dispatchEvent(new CustomEvent('ai:error', { detail: { rid, kind, retryAfterMs: ra } }));
    } catch {}
    const err = new Error(`${errorMsg} (Request ID: ${rid})`) as Error & { rid?: string };
    err.rid = rid;
    throw err;
  }

  async sendMessageJson<T = unknown>(request: ChatRequest): Promise<T> {
    const resp = await this.sendMessage({ ...request, stream: false });
    return resp.json();
  }


  async *streamResponse(
    response: Response,
    request?: ChatRequest
  ): AsyncGenerator<string | StreamStart | StreamContent, void, unknown> {
    // Yield a signal before starting the stream
    const startSignal: StreamStart = {
      type: 'stream_start',
      data: { isCodeRequest: request?.isCodeRequest }
    };
    yield startSignal;
    
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    let gotDone = false;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              gotDone = true;
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                // If this was a code request, we'll need to send the result to Vivica for summary
                // TODO: route the final code output back through the persona model
                // for a plain-English explanation before displaying to the user.
                yield {
                  content,
                  isCodeRequest: request?.isCodeRequest
                };
              }
            } catch (e) {
              console.warn('Failed to parse streaming response:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    if (!gotDone) {
      throw new Error('STREAM_ABORTED');
    }
  }
}
