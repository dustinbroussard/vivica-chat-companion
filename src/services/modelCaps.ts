export const MODEL_CAPS: Record<string, { supports: Partial<Record<
  'frequency_penalty' | 'presence_penalty' | 'top_p' | 'max_output_tokens' | 'tools' | 'json_mode' | 'stream', boolean>>,
  maxInputTokens?: number,
}> = {
  'gpt-4o-mini': {
    supports: {
      frequency_penalty: true,
      presence_penalty: true,
      top_p: true,
      tools: true,
      json_mode: true,
      stream: true,
    },
    maxInputTokens: 128_000,
  },
  'qwen-small': {
    supports: {
      frequency_penalty: false,
      presence_penalty: false,
      top_p: true,
      tools: false,
      json_mode: false,
      stream: true,
    },
    maxInputTokens: 32_768,
  },
};

export function sanitizeParams(model: string, opts: Record<string, unknown>) {
  const caps = MODEL_CAPS[model]?.supports || {};
  const o: Record<string, unknown> = { ...opts };
  if (caps.frequency_penalty === false) delete (o as { frequency_penalty?: unknown }).frequency_penalty;
  if (caps.presence_penalty === false) delete (o as { presence_penalty?: unknown }).presence_penalty;
  if (caps.tools === false) delete (o as { tools?: unknown }).tools;
  if (caps.json_mode === false) delete (o as { response_format?: unknown }).response_format;
  if (caps.top_p === false) delete (o as { top_p?: unknown }).top_p;
  if (caps.stream === false) (o as { stream?: unknown }).stream = false;
  return o;
}
