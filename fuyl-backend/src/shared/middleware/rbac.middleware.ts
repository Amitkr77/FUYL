import { Response, NextFunction } from 'express';
import { ForbiddenError } from '../errors';
import { AuthedRequest } from './auth.middleware';

export function authorize(...roles: string[]) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new ForbiddenError('Authentication required'));
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Role "${req.user.role}" not permitted`));
    }
    next();
  };
}

export const Roles = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  SELLER: 'seller',
  CUSTOMER: 'customer',
} as const;

export type Role = typeof Roles[keyof typeof Roles];
