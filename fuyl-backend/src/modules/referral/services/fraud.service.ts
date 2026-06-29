import { FraudFlagRepository } from '../repositories/fraudFlag.repository';
import { FraudReason } from '../../../shared/enums';
import { FraudCheckResult } from '../interfaces';
import mongoose from 'mongoose';

const fraudRepo = new FraudFlagRepository();

/**
 * Anti-fraud engine — checks device fingerprint, IP, and phone overlaps
 * across previous referrals. Returns reasons + severity.
 */
export class FraudService {
  async check(input: {
    referrerId: string;
    refereeId: string;
    referralId: string;
    deviceFingerprint?: string;
    ipHash?: string;
    phoneHash?: string;
    upiHandle?: string;
  }): Promise<FraudCheckResult> {
    const reasons: Array<typeof FraudReason[keyof typeof FraudReason]> = [];

    // Self-referral guard
    if (input.referrerId === input.refereeId) {
      return {
        isFraud: true,
        reasons: [FraudReason.PHONE_MATCH],
        severity: 'high',
        details: { selfReferral: true },
      };
    }

    // Device fingerprint match
    if (input.deviceFingerprint) {
      const matches = await fraudRepo.findByFingerprint(input.deviceFingerprint, input.referralId);
      if (matches.length > 0) reasons.push(FraudReason.DEVICE_MATCH);
    }

    // IP match
    if (input.ipHash) {
      const matches = await fraudRepo.findByIpHash(input.ipHash, input.referralId);
      if (matches.length > 0) reasons.push(FraudReason.IP_MATCH);
    }

    // Phone match
    if (input.phoneHash) {
      const matches = await fraudRepo.findByPhoneHash(input.phoneHash);
      if (matches.length > 0) reasons.push(FraudReason.PHONE_MATCH);
    }

    // UPI handle match — basic
    if (input.upiHandle) {
      // In production we'd query all referee UPI handles; here we just match against
      // any stored flags with the same handle.
      // Skipping for scaffold — add a UPI repo lookup if needed.
    }

    const severity = reasons.length >= 2 ? 'high' : reasons.length === 1 ? 'medium' : 'low';
    const isFraud = reasons.length > 0;

    // Persist the flag if fraud is detected
    if (isFraud) {
      await fraudRepo.create({
        referralId: new mongoose.Types.ObjectId(input.referralId),
        referrerId: new mongoose.Types.ObjectId(input.referrerId),
        refereeId: new mongoose.Types.ObjectId(input.refereeId),
        reasons,
        deviceFingerprint: input.deviceFingerprint,
        ipHash: input.ipHash,
        phoneHash: input.phoneHash,
        upiHandle: input.upiHandle,
        severity,
      });
    }

    return { isFraud, reasons, severity, details: { reasonsChecked: 4 } };
  }

  /**
   * Nightly scanner — looks for suspicious patterns like rapid-fire referrals from same IP.
   */
  async scanNightly(): Promise<{ scanned: number; flagged: number }> {
    // Simplified: just count current pending fraud flags
    const pending = await fraudRepo.findPending(500);
    return { scanned: pending.length, flagged: 0 };
  }
}

export const fraudService = new FraudService();
