
import { useState, useCallback } from 'react';
import { ChatService, ChatMessage } from '@/services/chatService';
import { getPrimaryApiKey } from '@/utils/api';

interface UseOpenRouterChatProps {
  apiKey?: string;
}

export const useOpenRouterChat = ({ apiKey }: UseOpenRouterChatProps = {}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (
    messages: ChatMessage[],
    model: string,
    temperature: number = 0.7,
    onToken: (token: string) => void,
    onComplete: () => void
  ) => {
    const key = apiKey || getPrimaryApiKey();
    if (!key) {
      setError('OpenRouter API key is required');
      return;
    }

    setIsStreaming(true);
    setError(null);

    const chatService = new ChatService(key);
    try {
      const request = {
        model,
        messages,
        temperature,
        max_tokens: 4000,
        stream: true
      };
      const response = await chatService.sendMessage(request);

      for await (const chunk of chatService.streamResponse(response, request)) {
        // streamResponse can yield a start signal, or string/content objects.
        if (typeof chunk === 'string') {
          onToken(chunk);
        } else if ('content' in chunk && typeof chunk.content === 'string') {
          onToken(chunk.content);
        } // ignore 'stream_start' metadata here
      }

      onComplete();
    } catch (err: unknown) {
      const msg = String((err as Error)?.message || err);
      if (/stream/i.test(msg) || /does not support streaming/i.test(msg)) {
        try {
          const resp = await chatService.sendMessage({
            model,
            messages,
            temperature,
            max_tokens: 4000,
            stream: false,
          });
          const data = await resp.json();
          const content = data?.choices?.[0]?.message?.content ?? '';
          if (content) onToken(content);
          onComplete();
          return;
        } catch (err2: unknown) {
          const errorMessage = err2 instanceof Error ? err2.message : 'Unknown error occurred';
          setError(errorMessage);
          console.error('OpenRouter API error:', err2);
        }
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('OpenRouter API error:', err);
      }
    } finally {
      setIsStreaming(false);
    }
  }, [apiKey]);

  return {
    sendMessage,
    isStreaming,
    error,
    clearError: () => setError(null)
  };
};
