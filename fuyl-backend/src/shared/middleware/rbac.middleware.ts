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

// ─── Granular permissions ──────────────────────────────────────────────
// Additive on top of roles — not a replacement. `admin`/`super_admin` keep
// their existing blanket access via authorize() on most routes; these
// exist for the narrower case of granting ONE specific capability to an
// account that wouldn't otherwise have it (e.g. a support/ops staffer who
// needs to manage returns and inventory but shouldn't touch payouts or
// promotions, without promoting them to full `admin`).
export const Permissions = {
  WALLET_MANAGE: 'wallet:manage',
  PROMOTIONS_MANAGE: 'promotions:manage',
  INVENTORY_MANAGE: 'inventory:manage',
  SHIPPING_MANAGE: 'shipping:manage',
  RETURNS_MANAGE: 'returns:manage',
  SUBSCRIPTIONS_MANAGE: 'subscriptions:manage',
  REFERRALS_MANAGE: 'referrals:manage',
  CUSTOMERS_MANAGE: 'customers:manage',
} as const;

export type Permission = typeof Permissions[keyof typeof Permissions];

/**
 * Grant access if the caller has the specific permission OR holds one of
 * the always-trusted roles (admin/super_admin already have blanket access
 * by design — this middleware only narrows access for OTHER roles that
 * have been granted a specific permission, it never restricts admins).
 */
export function requirePermission(...perms: Permission[]) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new ForbiddenError('Authentication required'));
    if (req.user.role === Roles.SUPER_ADMIN || req.user.role === Roles.ADMIN) return next();
    const granted = req.user.permissions ?? [];
    if (!perms.some((p) => granted.includes(p))) {
      return next(new ForbiddenError(`Missing permission: ${perms.join(' or ')}`));
    }
    next();
  };
}
