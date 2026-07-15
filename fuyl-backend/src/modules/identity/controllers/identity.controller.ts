import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { identityService, IdentityService } from '../services';
import { success, created } from '../../../shared/responses';
import { validate } from '../../../shared/middleware/validate.middleware';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  changePasswordSchema,
  resendVerificationSchema,
  setPermissionsSchema,
  emailExistsSchema,
  checkoutIdentifySchema,
} from '../validators';
import { env } from '../../../config/env';
import { BadRequestError } from '../../../shared/errors';

export class IdentityController {
  register = [
    validate(registerSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const meta = IdentityService.extractMeta(req);
        const result = await identityService.register(req.body, meta);
        // Set refresh token cookie
        res.cookie(env.jwt.cookieName, result.refreshToken, {
          httpOnly: true,
          secure: env.isProd,
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return created(res, {
          user: result.user,
          accessToken: result.accessToken,
          emailVerificationToken: env.isDev ? result.emailVerificationToken : undefined,
        });
      } catch (err) { next(err); }
    },
  ];

  login = [
    validate(loginSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const meta = IdentityService.extractMeta(req);
        const result = await identityService.login(req.body, meta);
        res.cookie(env.jwt.cookieName, result.refreshToken, {
          httpOnly: true,
          secure: env.isProd,
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return success(res, { user: result.user, accessToken: result.accessToken });
      } catch (err) { next(err); }
    },
  ];

  emailExists = [
    validate(emailExistsSchema, 'query'),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const exists = await identityService.checkEmailExists(req.query.email as string);
        return success(res, { exists });
      } catch (err) { next(err); }
    },
  ];

  checkoutIdentify = [
    validate(checkoutIdentifySchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const meta = IdentityService.extractMeta(req);
        const guestId = req.headers['x-guest-id'] as string | undefined;
        const result = await identityService.checkoutIdentify(req.body, meta, guestId);
        if (result.status === 'needs_password') {
          return success(res, { status: 'needs_password' });
        }
        res.cookie(env.jwt.cookieName, result.refreshToken, {
          httpOnly: true,
          secure: env.isProd,
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return success(res, {
          status: 'authenticated',
          user: result.user,
          accessToken: result.accessToken,
          isNewAccount: result.isNewAccount,
        });
      } catch (err) { next(err); }
    },
  ];

  refresh = [
    validate(refreshSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const refreshToken = req.body.refreshToken ?? req.cookies?.[env.jwt.cookieName];
        if (!refreshToken) return next(new BadRequestError('Refresh token required'));
        const meta = IdentityService.extractMeta(req);
        const tokens = await identityService.refresh(refreshToken, meta);
        res.cookie(env.jwt.cookieName, tokens.refreshToken, {
          httpOnly: true,
          secure: env.isProd,
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return success(res, tokens);
      } catch (err) { next(err); }
    },
  ];

  logout = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.body?.refreshToken ?? req.cookies?.[env.jwt.cookieName];
      await identityService.logout(refreshToken);
      res.clearCookie(env.jwt.cookieName);
      return success(res, { loggedOut: true });
    } catch (err) { next(err); }
  };

  logoutAll = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      await identityService.logoutAll(req.user!.userId);
      res.clearCookie(env.jwt.cookieName);
      return success(res, { loggedOut: true });
    } catch (err) { next(err); }
  };

  forgotPassword = [
    validate(forgotPasswordSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const result = await identityService.forgotPassword(req.body.email);
        return success(res, result);
      } catch (err) { next(err); }
    },
  ];

  resetPassword = [
    validate(resetPasswordSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await identityService.resetPassword(req.body));
      } catch (err) { next(err); }
    },
  ];

  verifyEmail = [
    validate(verifyEmailSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await identityService.verifyEmail(req.body.token));
      } catch (err) { next(err); }
    },
  ];

  resendVerification = [
    validate(resendVerificationSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await identityService.resendVerification(req.body.email));
      } catch (err) { next(err); }
    },
  ];

  changePassword = [
    validate(changePasswordSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await identityService.changePassword(req.user!.userId, req.body));
      } catch (err) { next(err); }
    },
  ];

  me = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await identityService.getMe(req.user!.userId));
    } catch (err) { next(err); }
  };

  updateMe = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await identityService.updateMe(req.user!.userId, req.body));
    } catch (err) { next(err); }
  };

  setPermissions = [
    validate(setPermissionsSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await identityService.setPermissions(req.params.id, req.body.permissions));
      } catch (err) { next(err); }
    },
  ];

  listSessions = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await identityService.listSessions(req.user!.userId));
    } catch (err) { next(err); }
  };
}

export const identityController = new IdentityController();
