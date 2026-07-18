import { z } from 'zod';
import { RoleEnum } from '../../../shared/enums';
import { Permissions } from '../../../shared/middleware/rbac.middleware';
import { phoneSchema } from '../../../shared/validators';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: phoneSchema.optional(),
  role: z.enum([RoleEnum.CUSTOMER, RoleEnum.SELLER]).default(RoleEnum.CUSTOMER),
  referralCode: z.string().min(4).max(50).optional(),
  deviceFingerprint: z.string().max(256).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// BUG FIXED (found in the fixing/testing pass): `refreshToken` was
// required here, but identityController.refresh() also accepts the token
// from the httpOnly refresh cookie as a fallback
// (`req.body.refreshToken ?? req.cookies?.[env.jwt.cookieName]`) — the only
// viable path for a plain browser client, since JS can never read an
// httpOnly cookie to put it in the body. With this field required, any
// cookie-only refresh request (empty body) was rejected with 400
// "Validation failed" before ever reaching the controller, so the
// cookie-fallback branch was unreachable dead code and no purely
// browser-based frontend could ever refresh its session.
export const refreshSchema = z.object({
  refreshToken: z.string().min(10).optional(),
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

const PERMISSION_VALUES = Object.values(Permissions) as [string, ...string[]];
export const setPermissionsSchema = z.object({
  permissions: z.array(z.enum(PERMISSION_VALUES)),
});

// ─── Checkout identify (guest → account, without a separate register page) ──
export const emailExistsSchema = z.object({
  email: z.string().email(),
});

export const checkoutIdentifySchema = z.object({
  email: z.string().email(),
  // Only required if the email already belongs to an existing account —
  // checked server-side, not assumed here.
  password: z.string().min(1).optional(),
  fullName: z.string().min(1).max(150).optional(),
  phone: phoneSchema.optional(),
});

export type RegisterDTO = z.infer<typeof registerSchema>;
export type LoginDTO = z.infer<typeof loginSchema>;
export type RefreshDTO = z.infer<typeof refreshSchema>;
export type ForgotPasswordDTO = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDTO = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailDTO = z.infer<typeof verifyEmailSchema>;
export type ChangePasswordDTO = z.infer<typeof changePasswordSchema>;
export type ResendVerificationDTO = z.infer<typeof resendVerificationSchema>;
export type SetPermissionsDTO = z.infer<typeof setPermissionsSchema>;
export type EmailExistsDTO = z.infer<typeof emailExistsSchema>;
export type CheckoutIdentifyDTO = z.infer<typeof checkoutIdentifySchema>;
