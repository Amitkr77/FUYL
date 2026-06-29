import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cache.service';
import { UnauthorizedError } from '../errors';

/**
 * Idempotency middleware — looks at `Idempotency-Key` header.
 * If seen, returns cached response. Otherwise stores after handler runs.
 */
export function idempotent(ttlSeconds = 24 * 60 * 60) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = req.headers['idempotency-key'] as string | undefined;
    if (!key) return next();

    const cacheKey = `idem:${key}`;
    const cached = await cacheService.get<{ status: number; body: unknown }>(cacheKey);
    if (cached) {
      return res.status(cached.status).json(cached.body);
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      cacheService.set(cacheKey, { status: res.statusCode, body }, ttlSeconds).catch(() => {});
      return originalJson(body);
    };
    next();
  };
}

export function requireIdempotencyKey(req: Request, _res: Response, next: NextFunction) {
  if (!req.headers['idempotency-key']) {
    return next(new UnauthorizedError('Idempotency-Key header required'));
  }
  next();
}
