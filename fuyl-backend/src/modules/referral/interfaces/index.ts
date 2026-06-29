import { RewardType, FraudReason } from '../../../shared/enums';

export interface CreateCampaignInput {
  name: string;
  description?: string;
  startsAt?: Date;
  endsAt?: Date;
  referrerReward: { type: typeof RewardType[keyof typeof RewardType]; amount: number; couponCode?: string };
  refereeReward: { type: typeof RewardType[keyof typeof RewardType]; amount: number; couponCode?: string };
  rewardTrigger: 'signup' | 'order_placed' | 'order_completed';
  maxReferralsPerReferrer?: number;
  maxTotalReferrals?: number;
  milestoneBonuses?: Array<{ threshold: number; bonusAmount: number }>;
}

export type UpdateCampaignInput = Partial<CreateCampaignInput>;

export interface ApplyCodeInput {
  code: string;
  refereeId: string;
  deviceFingerprint?: string;
  ipHash?: string;
  phoneHash?: string;
  upiHandle?: string;
}

export interface FraudCheckResult {
  isFraud: boolean;
  reasons: Array<typeof FraudReason[keyof typeof FraudReason]>;
  severity: 'low' | 'medium' | 'high';
  details?: Record<string, unknown>;
}

export interface MilestoneBonusResult {
  awarded: boolean;
  threshold?: number;
  bonusAmount?: number;
}

export interface OrderCompletedEvent {
  orderId: string;
  userId: string;
  amount: number;
  isRefereeFirstOrder: boolean;
}

export interface UserRegisteredEvent {
  userId: string;
  email: string;
  phone?: string;
  deviceFingerprint?: string;
  ipHash?: string;
  appliedReferralCode?: string;
}
