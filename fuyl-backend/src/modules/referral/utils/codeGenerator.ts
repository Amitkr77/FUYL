import { customAlphabet } from 'nanoid';
import { Constants } from '../../../shared/constants';

const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789'; // ambiguous chars removed
const nanoid6 = customAlphabet(alphabet, Constants.REFERRAL_CODE_LENGTH);

/**
 * Generate a referral code from a username/email handle.
 * Format: {handle}-{6char nanoid}  →  e.g. "rahul-k4x9q2"
 */
export function generateReferralCode(handle: string): string {
  const safeHandle = handle
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 12) || 'user';
  return `${safeHandle}-${nanoid6()}`;
}
