import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { UnauthorizedError } from '../errors';

export interface JwtPayload {
  userId: string;
  role: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthedRequest extends Request {
  user?: JwtPayload;
}

export function authenticate(required: boolean = true) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header) {
      if (required) return next(new UnauthorizedError('Missing Authorization header'));
      return next();
    }
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return next(new UnauthorizedError('Malformed Authorization header'));
    }
    try {
      const payload = jwt.verify(token, env.jwt.accessSecret) as JwtPayload;
      req.user = payload;
      next();
    } catch {
      if (required) return next(new UnauthorizedError('Invalid or expired token'));
      next();
    }
  };
}

export const authRequired = authenticate(true);
export const authOptional = authenticate(false);
