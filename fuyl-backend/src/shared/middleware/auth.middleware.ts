import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { UnauthorizedError } from '../errors';
import { UserModel } from '../../modules/identity/models/user.model';

export interface JwtPayload {
  userId: string;
  role: string;
  email: string;
  // Granular permission grants, additive on top of role. Baked into the
  // token at issuance (same staleness trade-off `role` already has —
  // changes take effect on next login/refresh, not instantly), so
  // permission checks don't need a DB roundtrip per request.
  permissions?: string[];
  impersonatedAffiliateId?: string;
  impersonatedBy?: string;
  iat?: number;
  exp?: number;
}

export interface AuthedRequest extends Request {
  user?: JwtPayload;
}

export function authenticate(required: boolean = true) {
  return async (req: AuthedRequest, _res: Response, next: NextFunction) => {
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
      const payload = jwt.verify(token, env.jwt.accessSecret) as JwtPayload & { kind?: string };
      // Email-verification and password-reset tokens are signed with the same
      // secret and only differ by a `kind` claim (see identity/utils/crypto).
      // Real access tokens never carry `kind`, so reject any token that does —
      // otherwise a reset/verify link token would work as a bearer credential.
      if (payload.kind) {
        return next(new UnauthorizedError('Invalid or expired token'));
      }
      if (payload.impersonatedAffiliateId && !req.originalUrl.includes('/affiliate/')) return next(new UnauthorizedError('Affiliate impersonation tokens are restricted to affiliate routes'));
      // Privileged claims must reflect the account's current database state.
      // Without this lookup, disabling a staff member or revoking a permission
      // leaves their old JWT authorised until it expires.
      if (['staff', 'admin', 'super_admin'].includes(payload.role)) {
        const user = await UserModel.findById(payload.userId)
          .select('email role permissions isActive isDeleted')
          .lean();
        if (!user || !user.isActive || user.isDeleted || !['staff', 'admin', 'super_admin'].includes(user.role)) {
          return next(new UnauthorizedError('Account is inactive or no longer has admin access'));
        }
        payload.email = user.email;
        payload.role = user.role;
        payload.permissions = user.permissions ?? [];
      }
      req.user = payload;
      next();
    } catch {
      // BUG FIXED (found live — reported as "add to cart works but review
      // order says cart is empty"): "optional" auth used to mean a bad
      // token was silently treated the same as no token at all, so an
      // expired access token on e.g. POST /cart/items quietly fell back to
      // the anonymous/guest identity instead of erroring — the item landed
      // in a guest cart, not the signed-in user's cart, with no visible
      // failure. "Optional" should only mean a *missing* Authorization
      // header is fine; a *present-but-invalid* one is a stale session, not
      // an anonymous request, and must still 401 so the frontend's
      // apiFetch refresh-and-retry logic (which only fires on 401) can
      // catch it and retry with a valid identity instead of a wrong one.
      return next(new UnauthorizedError('Invalid or expired token'));
    }
  };
}

export const authRequired = authenticate(true);
export const authOptional = authenticate(false);
