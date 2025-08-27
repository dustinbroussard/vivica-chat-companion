import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const messageSchema = z.object({
  role: z.string(),
  content: z.string(),
});

export const chatSchema = z.object({
  messages: z.array(messageSchema).min(1),
  model: z.string().optional().default('openrouter/auto'),
  max_tokens: z.number().int().positive().optional(),
});

export function validateChat(req: Request, res: Response, next: NextFunction) {
  const result = chatSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: { type: 'BAD_REQUEST', message: result.error.message, status: 400 } });
  }
  req.body = result.data;
  next();
}
