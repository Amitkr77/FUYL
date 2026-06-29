import crypto from 'crypto';

/**
 * Hash a device fingerprint / IP / phone for fraud detection.
 * Hashing lets us compare across users without storing PII.
 */
export function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function normalizeIp(ip: string): string {
  // Strip port
  return ip.split(':')[0];
}

/**
 * Build a composite device fingerprint from user-agent + accept-language + screen hints.
 * In production this would also include a client-side canvas/webgl fingerprint.
 */
export function buildDeviceFingerprint(headers: Record<string, string | string[] | undefined>): string {
  const ua = (headers['user-agent'] as string) ?? '';
  const lang = (headers['accept-language'] as string) ?? '';
  return hashValue(`${ua}::${lang}`);
}
