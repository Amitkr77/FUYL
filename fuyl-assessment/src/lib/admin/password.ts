import bcrypt from "bcryptjs";

/** Kept separate from auth.ts (which depends on Next request APIs) so CLI scripts can use it. */
export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

export const PASSWORD_MIN = 12;
