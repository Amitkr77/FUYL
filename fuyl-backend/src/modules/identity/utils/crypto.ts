import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { env } from '../../../config/env';
import { JwtPayload } from '../../../shared/middleware/auth.middleware';

export const hashPassword = (plain: string): Promise<string> =>
  bcrypt.hash(plain, 12);

export const comparePassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const accessSignOptions: SignOptions = { expiresIn: env.jwt.accessExpiry as any };
const refreshSignOptions: SignOptions = { expiresIn: env.jwt.refreshExpiry as any };

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, accessSignOptions);
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwt.refreshSecret, refreshSignOptions);
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwt.refreshSecret) as JwtPayload;
}

export function decodeAccessToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, env.jwt.accessSecret) as JwtPayload;
  } catch {
    return null;
  }
}

const emailVerifyOptions: SignOptions = { expiresIn: '24h' };
const passwordResetOptions: SignOptions = { expiresIn: '1h' };

export function generateEmailVerificationToken(userId: string): string {
  return jwt.sign({ userId, kind: 'email_verify' }, env.jwt.accessSecret, emailVerifyOptions);
}

export function verifyEmailVerificationToken(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, env.jwt.accessSecret) as { userId: string; kind?: string };
    if (payload.kind !== 'email_verify') return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export function generatePasswordResetToken(userId: string): string {
  return jwt.sign({ userId, kind: 'password_reset' }, env.jwt.accessSecret, passwordResetOptions);
}

export function verifyPasswordResetToken(token: string): { userId: string; issuedAt: number } | null {
  try {
    const payload = jwt.verify(token, env.jwt.accessSecret) as { userId: string; kind?: string; iat?: number };
    if (payload.kind !== 'password_reset') return null;
    // issuedAt (seconds) lets the service enforce single-use by comparing
    // against the user's passwordChangedAt.
    return { userId: payload.userId, issuedAt: payload.iat ?? 0 };
  } catch {
    return null;
  }
}

export function generateRandomToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}
