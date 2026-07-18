import { UserRepository } from '../repositories/user.repository';
import { RefreshTokenRepository } from '../repositories/refreshToken.repository';
import {
  hashPassword,
  comparePassword,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateEmailVerificationToken,
  generatePasswordResetToken,
  verifyEmailVerificationToken,
  verifyPasswordResetToken,
  generateRandomToken,
} from '../utils/crypto';
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../../../shared/errors';
import { RoleEnum } from '../../../shared/enums';
import { JwtPayload } from '../../../shared/middleware/auth.middleware';
import { eventBus, Events } from '../../../shared/services/eventBus.service';
import { queueService } from '../../../shared/services/queue.service';
import { logger } from '../../../config/logger';
import { env } from '../../../config/env';
import { RegisterDTO, LoginDTO, ResetPasswordDTO, ChangePasswordDTO, CheckoutIdentifyDTO } from '../validators';
import { addDays } from '../../../shared/utils';
import { Request } from 'express';
import mongoose from 'mongoose';

const userRepo = new UserRepository();
const refreshRepo = new RefreshTokenRepository();

const REFRESH_TOKEN_TTL_DAYS = 7;

export class IdentityService {
  async register(dto: RegisterDTO, meta: { ip?: string; userAgent?: string; deviceFingerprint?: string }) {
    const existing = await userRepo.findByEmail(dto.email);
    if (existing) throw new ConflictError('Email already registered');

    if (dto.phone) {
      const phoneTaken = await userRepo.findByPhone(dto.phone);
      if (phoneTaken) throw new ConflictError('Phone number already registered');
    }

    const passwordHash = await hashPassword(dto.password);
    const user = await userRepo.create({
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      role: dto.role,
      firstName: dto.firstName,
      lastName: dto.lastName,
      displayName: dto.firstName ? `${dto.firstName} ${dto.lastName ?? ''}`.trim() : undefined,
      isEmailVerified: false,
      isPhoneVerified: false,
      isActive: true,
      permissions: [],
      referralCodeApplied: dto.referralCode,
      deviceFingerprint: meta.deviceFingerprint ?? dto.deviceFingerprint,
    });

    // Generate email verification token + send email
    const verifyToken = generateEmailVerificationToken(user.id);
    queueService.notificationDispatch({
      channel: 'email',
      to: { email: user.email, userId: user.id },
      template: 'email_verification',
      data: {
        token: verifyToken,
        verifyUrl: `${env.clientUrl}/verify-email?token=${verifyToken}`,
        name: user.displayName ?? user.email,
      },
    });

    // Emit user.registered event — referral module will pick this up
    eventBus.publish(Events.USER_REGISTERED, {
      userId: user.id,
      email: user.email,
      phone: user.phone,
      appliedReferralCode: dto.referralCode,
      deviceFingerprint: meta.deviceFingerprint ?? dto.deviceFingerprint,
      ipHash: meta.ip,
    });

    // Issue tokens
    const tokens = await this.issueTokens(user, meta);

    return { user, ...tokens, emailVerificationToken: verifyToken };
  }

  async login(dto: LoginDTO, meta: { ip?: string; userAgent?: string }) {
    const user = await userRepo.findByEmail(dto.email);
    if (!user) throw new UnauthorizedError('Invalid credentials');

    if (!user.isActive || user.isDeleted) throw new ForbiddenError('Account disabled');
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenError('Account temporarily locked. Try again later.');
    }

    const ok = await comparePassword(dto.password, user.passwordHash);
    if (!ok) {
      await userRepo.incrementFailedLogin(dto.email);
      throw new UnauthorizedError('Invalid credentials');
    }

    await userRepo.resetFailedLogin(user.id);
    await userRepo.update(user.id, {
      lastLoginAt: new Date(),
      lastLoginIp: meta.ip,
      failedLoginAttempts: 0,
      lockedUntil: undefined,
    });

    const tokens = await this.issueTokens(user, meta);
    eventBus.publish(Events.USER_LOGIN, { userId: user.id, ip: meta.ip });

    return { user, ...tokens };
  }

  async refresh(refreshToken: string, meta: { ip?: string; userAgent?: string }) {
    const tokenHash = hashToken(refreshToken);
    const stored = await refreshRepo.findByTokenHash(tokenHash);
    if (!stored) throw new UnauthorizedError('Invalid refresh token');

    let payload: JwtPayload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      await refreshRepo.revoke(tokenHash);
      throw new UnauthorizedError('Refresh token expired');
    }

    const user = await userRepo.findById(payload.userId);
    if (!user || !user.isActive) throw new UnauthorizedError('User not found or inactive');

    // Rotate: revoke old, issue new
    const newRefresh = signRefreshToken({ userId: user.id, role: user.role, email: user.email, permissions: user.permissions });
    await refreshRepo.revoke(tokenHash, hashToken(newRefresh));
    await refreshRepo.create({
      tokenHash: hashToken(newRefresh),
      userId: new mongoose.Types.ObjectId(user.id),
      userAgent: meta.userAgent,
      ip: meta.ip,
      expiresAt: addDays(new Date(), REFRESH_TOKEN_TTL_DAYS),
      isRevoked: false,
    });

    const newAccess = signAccessToken({ userId: user.id, role: user.role, email: user.email, permissions: user.permissions });
    return { accessToken: newAccess, refreshToken: newRefresh };
  }

  async logout(refreshToken: string) {
    if (!refreshToken) return;
    const tokenHash = hashToken(refreshToken);
    await refreshRepo.revoke(tokenHash);
  }

  async logoutAll(userId: string) {
    await refreshRepo.revokeAllForUser(userId);
  }

  async forgotPassword(email: string) {
    const user = await userRepo.findByEmail(email);
    if (!user) {
      // Don't leak whether the email exists
      return { sent: true };
    }
    const token = generatePasswordResetToken(user.id);
    queueService.notificationDispatch({
      channel: 'email',
      to: { email: user.email, userId: user.id },
      template: 'password_reset',
      data: {
        token,
        resetUrl: `${env.clientUrl}/reset-password?token=${token}`,
        name: user.displayName ?? user.email,
      },
    });
    return { sent: true };
  }

  async resetPassword(dto: ResetPasswordDTO) {
    const decoded = verifyPasswordResetToken(dto.token);
    if (!decoded) throw new BadRequestError('Invalid or expired reset token');
    const user = await userRepo.findById(decoded.userId);
    if (!user) throw new NotFoundError('User');

    const passwordHash = await hashPassword(dto.password);
    await userRepo.update(user.id, {
      passwordHash,
      passwordChangedAt: new Date(),
    });
    await refreshRepo.revokeAllForUser(user.id);
    return { reset: true };
  }

  async changePassword(userId: string, dto: ChangePasswordDTO) {
    const user = await userRepo.findById(userId);
    if (!user) throw new NotFoundError('User');

    const ok = await comparePassword(dto.currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedError('Current password is incorrect');

    const passwordHash = await hashPassword(dto.newPassword);
    await userRepo.update(user.id, {
      passwordHash,
      passwordChangedAt: new Date(),
    });
    await refreshRepo.revokeAllForUser(user.id);
    return { changed: true };
  }

  async verifyEmail(token: string) {
    const decoded = verifyEmailVerificationToken(token);
    if (!decoded) throw new BadRequestError('Invalid or expired verification token');
    const user = await userRepo.findById(decoded.userId);
    if (!user) throw new NotFoundError('User');
    if (user.isEmailVerified) return { verified: true };
    await userRepo.update(user.id, { isEmailVerified: true });
    // welcome template's own description has always said "sent after
    // successful email verification" — nothing ever actually triggered it
    // until now.
    queueService.notificationDispatch({
      channel: 'email',
      to: { email: user.email, userId: user.id },
      template: 'welcome',
      data: { name: user.displayName ?? user.email },
    });
    return { verified: true };
  }

  async resendVerification(email: string) {
    const user = await userRepo.findByEmail(email);
    if (!user) return { sent: true };
    if (user.isEmailVerified) throw new BadRequestError('Email already verified');
    const token = generateEmailVerificationToken(user.id);
    queueService.notificationDispatch({
      channel: 'email',
      to: { email: user.email, userId: user.id },
      template: 'email_verification',
      data: {
        token,
        verifyUrl: `${env.clientUrl}/verify-email?token=${token}`,
        name: user.displayName ?? user.email,
      },
    });
    return { sent: true };
  }

  /**
   * Public — used by the checkout page to decide whether to reveal a
   * password field for a returning customer. No side effects, safe to call
   * on every keystroke/blur while typing an email.
   */
  async checkEmailExists(email: string): Promise<boolean> {
    const user = await userRepo.findByEmail(email);
    return !!user;
  }

  /**
   * Resolves the identity checkout should proceed as, without ever sending
   * the shopper to a separate login/register page:
   *   - New email  -> account created silently (random password, "set your
   *     password" email sent via the existing forgot-password flow), then
   *     logged in immediately.
   *   - Known email, no password yet -> returns 'needs_password' so the
   *     checkout page can reveal one inline field, rather than erroring.
   *   - Known email + correct password -> logged in normally.
   * Either way, any guest cart is merged into the resolved account so
   * checkout continues with the same items the shopper already added.
   */
  async checkoutIdentify(
    dto: CheckoutIdentifyDTO,
    meta: { ip?: string; userAgent?: string; deviceFingerprint?: string },
    guestId?: string
  ): Promise<
    | { status: 'needs_password' }
    | { status: 'authenticated'; user: unknown; accessToken: string; refreshToken: string; isNewAccount: boolean }
  > {
    const existing = await userRepo.findByEmail(dto.email);

    if (existing) {
      if (!existing.isActive || existing.isDeleted) throw new ForbiddenError('Account disabled');
      if (existing.lockedUntil && existing.lockedUntil > new Date()) {
        throw new ForbiddenError('Account temporarily locked. Try again later.');
      }
      if (!dto.password) {
        return { status: 'needs_password' };
      }

      const ok = await comparePassword(dto.password, existing.passwordHash);
      if (!ok) {
        await userRepo.incrementFailedLogin(dto.email);
        throw new UnauthorizedError('Incorrect password');
      }

      await userRepo.resetFailedLogin(existing.id);
      await userRepo.update(existing.id, { lastLoginAt: new Date(), lastLoginIp: meta.ip });
      const tokens = await this.issueTokens(existing, meta);

      if (guestId) {
        const { cartService } = await import('../../cart/services/cart.service');
        await cartService.mergeGuestCartIntoUser(guestId, existing.id);
      }

      eventBus.publish(Events.USER_LOGIN, { userId: existing.id, ip: meta.ip });
      return { status: 'authenticated', user: existing, ...tokens, isNewAccount: false };
    }

    // New email — create the account silently, right from the checkout form.
    const nameParts = (dto.fullName ?? '').trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || undefined;

    const registerResult = await this.register(
      {
        email: dto.email,
        password: generateRandomToken(16),
        firstName,
        lastName,
        phone: dto.phone,
        role: RoleEnum.CUSTOMER,
      } as RegisterDTO,
      meta
    );

    if (guestId) {
      const { cartService } = await import('../../cart/services/cart.service');
      await cartService.mergeGuestCartIntoUser(guestId, registerResult.user.id);
    }

    // Reuses the existing forgot-password email so they can set a real
    // password whenever they want — no new email template needed.
    void this.forgotPassword(dto.email);

    return {
      status: 'authenticated',
      user: registerResult.user,
      accessToken: registerResult.accessToken,
      refreshToken: registerResult.refreshToken,
      isNewAccount: true,
    };
  }

  async getMe(userId: string) {
    const user = await userRepo.findById(userId);
    if (!user) throw new NotFoundError('User');
    return user;
  }

  async updateMe(userId: string, patch: { firstName?: string; lastName?: string; phone?: string; avatarUrl?: string }) {
    const updated = await userRepo.update(userId, patch);
    if (!updated) throw new NotFoundError('User');
    return updated;
  }

  /**
   * Admin-only: grant/revoke granular permissions for a non-admin account
   * (see shared/middleware/rbac.middleware.ts's Permissions/requirePermission).
   * Takes effect on the user's next login/refresh — permissions are baked
   * into the access token at issuance, same as `role` already is.
   */
  async setPermissions(userId: string, permissions: string[]) {
    const updated = await userRepo.update(userId, { permissions });
    if (!updated) throw new NotFoundError('User');
    return updated;
  }

  async listSessions(userId: string) {
    return refreshRepo.listActiveForUser(userId);
  }

  private async issueTokens(
    user: { _id: string | mongoose.Types.ObjectId; role: string; email: string; permissions?: string[] },
    meta: { ip?: string; userAgent?: string }
  ) {
    const userIdStr = user._id.toString();
    const payload: JwtPayload = { userId: userIdStr, role: user.role, email: user.email, permissions: user.permissions };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await refreshRepo.create({
      tokenHash: hashToken(refreshToken),
      userId: new mongoose.Types.ObjectId(userIdStr),
      userAgent: meta.userAgent,
      ip: meta.ip,
      expiresAt: addDays(new Date(), REFRESH_TOKEN_TTL_DAYS),
      isRevoked: false,
    });

    return { accessToken, refreshToken };
  }

  static extractMeta(req: Request): { ip?: string; userAgent?: string; deviceFingerprint?: string } {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket.remoteAddress;
    return {
      ip,
      userAgent: req.headers['user-agent'],
      deviceFingerprint: (req.headers['x-device-fingerprint'] as string) ?? undefined,
    };
  }
}

export const identityService = new IdentityService();
