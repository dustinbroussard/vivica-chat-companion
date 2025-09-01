
import { useState, useEffect } from 'react';

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  pricing?: {
    prompt: string;
    completion: string;
  };
  context_length?: number;
  architecture?: {
    modality: string;
    tokenizer: string;
    instruct_type?: string;
  };
  top_provider?: {
    context_length: number;
    max_completion_tokens?: number;
  };
}

export const useOpenRouterModels = () => {
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true);
        // Prefer server proxy with cache & CORS safety
        const response = await fetch('/api/models');
        
        if (!response.ok) {
          throw new Error('Failed to fetch models');
        }
        
        const data = await response.json();
        setModels(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Fallback to direct call if server proxy unavailable
        try {
          const r2 = await fetch('https://openrouter.ai/api/v1/models');
          if (r2.ok) {
            const data = await r2.json();
            setModels(data.data || []);
            setError(null);
          }
        } catch {}
        console.error('Error fetching OpenRouter models:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  return { models, loading, error };
};
