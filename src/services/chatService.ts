
import { toast } from "@/components/ui/sonner";
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
  };
  err.status = resp.status;
  err.body = text;
  return err;
}

function classify(err: unknown): 'network' | 'rate_limit' | 'unauthorized' | 'server' | 'client' {
  const e = err as { status?: number; name?: string };
  const s = e.status;
  if (!s && (e.name === 'TypeError' || /NetworkError|Failed to fetch/i.test(String(err)))) return 'network';
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

  private static COOLDOWN_MS = 60 * 1000; // 1 minute default

  // Remember the last working key across instances
  private static activeKey: string | null = null;
  // Track temporarily failing keys to avoid retrying them repeatedly
  private static keyCooldowns: Record<string, number> = {};

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

  private async trySendWithKey(request: ChatRequest, apiKey: string): Promise<Response> {
    try {
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
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request)
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw statusFromResponse(response, text);
      }
      return response;
    } catch (error) {
      console.warn(`Attempt with key ${apiKey?.slice(-4)} failed:`, error);
      throw error;
    }
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
    const effectiveModel = isCode && request.profile?.codeModel
      ? request.profile.codeModel
      : request.model;

    // Exclude profile metadata from the API request body
    const { profile: _profile, isCodeRequest: _unused, ...rest } = request;
    const apiRequest: ChatRequest = {
      ...rest,
      model: effectiveModel,
    };

    // Persist detection result for callers that rely on the flag
    request.isCodeRequest = isCode;

    console.log('Sending request to OpenRouter:', {
      url: `${this.baseUrl}/chat/completions`,
      request: apiRequest,
    });

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

        const response = await this.trySendWithKey(apiRequest, key);
        this.trackKeyUsage(key, true);
        ChatService.setActiveKey(key);
        ChatService.clearCooldown(key);

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

        const kind = classify(error);
        if (kind === 'rate_limit') {
          ChatService.setCooldown(key, 60_000);
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

    console.error('OpenRouter API failed after all attempts:', errorMsg);
    throw new Error(errorMsg);
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
            if (data === '[DONE]') return;
            
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
  }
}
