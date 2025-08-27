import type { Request, Response, NextFunction } from 'express';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = process.env.API_TOKEN;
  if (!token) return next();
  const auth = req.get('authorization');
  if (auth === `Bearer ${token}`) return next();
  return res.status(401).json({ error: { type: 'AUTH', message: 'Unauthorized', status: 401 } });
}
