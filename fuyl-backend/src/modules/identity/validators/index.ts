import { z } from 'zod';
import { RoleEnum } from '../../../shared/enums';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/).optional(),
  role: z.enum([RoleEnum.CUSTOMER, RoleEnum.SELLER]).default(RoleEnum.CUSTOMER),
  referralCode: z.string().min(4).max(50).optional(),
  deviceFingerprint: z.string().max(256).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(128),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(10),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export const resendVerificationSchema = z.object({
  email: z.string().email(),
});

export type RegisterDTO = z.infer<typeof registerSchema>;
export type LoginDTO = z.infer<typeof loginSchema>;
export type RefreshDTO = z.infer<typeof refreshSchema>;
export type ForgotPasswordDTO = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDTO = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailDTO = z.infer<typeof verifyEmailSchema>;
export type ChangePasswordDTO = z.infer<typeof changePasswordSchema>;
export type ResendVerificationDTO = z.infer<typeof resendVerificationSchema>;
