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
import { RegisterDTO, LoginDTO, ResetPasswordDTO, ChangePasswordDTO } from '../validators';
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
      data: { token: verifyToken, name: user.displayName ?? user.email },
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
    const newRefresh = signRefreshToken({ userId: user.id, role: user.role, email: user.email });
    await refreshRepo.revoke(tokenHash, hashToken(newRefresh));
    await refreshRepo.create({
      tokenHash: hashToken(newRefresh),
      userId: new mongoose.Types.ObjectId(user.id),
      userAgent: meta.userAgent,
      ip: meta.ip,
      expiresAt: addDays(new Date(), REFRESH_TOKEN_TTL_DAYS),
      isRevoked: false,
    });

    const newAccess = signAccessToken({ userId: user.id, role: user.role, email: user.email });
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
      data: { token, name: user.displayName ?? user.email },
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
      data: { token, name: user.displayName ?? user.email },
    });
    return { sent: true };
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

  async listSessions(userId: string) {
    return refreshRepo.listActiveForUser(userId);
  }

  private async issueTokens(
    user: { _id: string | mongoose.Types.ObjectId; role: string; email: string },
    meta: { ip?: string; userAgent?: string }
  ) {
    const userIdStr = user._id.toString();
    const payload: JwtPayload = { userId: userIdStr, role: user.role, email: user.email };
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
