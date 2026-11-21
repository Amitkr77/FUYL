import { SignJWT, jwtVerify } from "jose";

/**
 * Admin session token: a short-lived HS256 JWT in an httpOnly cookie. It
 * carries only the user id and a session version; role and active status are
 * re-read from the database on every request, so revoking access is instant.
 */
export const ADMIN_COOKIE = "fuyl_admin";
export const ADMIN_SESSION_HOURS = 8;

export interface AdminClaims {
  sub: string; // user id
  sv: number; // session version
}

const key = (secret: string) => new TextEncoder().encode(secret);

export async function signAdminToken(claims: AdminClaims, secret: string): Promise<string> {
  return new SignJWT({ sv: claims.sv })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setAudience("fuyl-assessment-admin")
    .setExpirationTime(`${ADMIN_SESSION_HOURS}h`)
    .sign(key(secret));
}

export async function verifyAdminToken(token: string, secret: string): Promise<AdminClaims | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ["HS256"], audience: "fuyl-assessment-admin" });
    if (typeof payload.sub !== "string" || typeof payload.sv !== "number") return null;
    return { sub: payload.sub, sv: payload.sv };
  } catch {
    return null;
  }
}
