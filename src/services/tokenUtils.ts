import type { ChatMessage } from './chatService';

export function estimateTokens(text: string): number {
  return Math.ceil((text || '').length / 4);
}

export function enforceBudget(messages: ChatMessage[], limit = 4000) {
  const headroom = Math.floor(limit * 0.8);
  const estimate = () => messages.reduce((s, m) => s + estimateTokens(m.content), 0);
  while (messages.length && estimate() > headroom) {
    messages.shift();
  }
  const last = messages[messages.length - 1];
  if (!last || last.role !== 'user' || last.content.trim().replace(/\p{C}+/gu, '') === '') {
    throw new Error('EMPTY_USER_MESSAGE');
  }
  return messages;
}
