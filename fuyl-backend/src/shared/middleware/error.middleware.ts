import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from '../errors';
import { logger } from '../../config/logger';
import { ZodError } from 'zod';
import mongoose from 'mongoose';

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return res.status(400).json({
      success: false,
      error: { code: ErrorCodes.BAD_REQUEST, message: 'Validation failed', details },
    });
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: err.message, details: err.errors },
    });
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({
      success: false,
      error: { code: 'CAST_ERROR', message: `Invalid ${err.path}: ${err.value}` },
    });
  }

  if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
    const dup = (err as { keyValue?: Record<string, unknown> }).keyValue;
    return res.status(409).json({
      success: false,
      error: { code: ErrorCodes.CONFLICT, message: 'Duplicate key', details: dup },
    });
  }

  logger.error('[unhandled-error]', err);
  const message = err instanceof Error ? err.message : 'Internal server error';
  return res.status(500).json({
    success: false,
    error: { code: ErrorCodes.INTERNAL_SERVER_ERROR, message },
  });
}

export function notFoundMiddleware(_req: Request, res: Response) {
  return res.status(404).json({
    success: false,
    error: { code: 'ROUTE_NOT_FOUND', message: 'Route not found' },
  });
}
