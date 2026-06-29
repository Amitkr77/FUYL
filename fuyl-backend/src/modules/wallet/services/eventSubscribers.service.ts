import { WalletService } from './wallet.service';
import { eventBus, Events } from '../../../shared/services/eventBus.service';
import { logger } from '../../../config/logger';
import { env } from '../../../config/env';
import { addDays } from '../../../shared/utils';

const walletService = new WalletService();

/**
 * Wires up wallet module to react to events from referral, subscription, and order modules.
 */
export function registerWalletEventSubscribers(): void {
  // ─── Referral rewarded → credit both referrer and referee wallets ─────────
  eventBus.on<{
    referralId: string;
    referrerId: string;
    refereeId: string;
    referrerReward: { id: string; amount: number; type: string };
    refereeReward: { id: string; amount: number; type: string };
  }>(Events.REFERRAL_REWARDED, async (event) => {
    try {
      if (event.referrerReward.type === 'wallet_credit' && event.referrerReward.amount > 0) {
        await walletService.credit({
          userId: event.referrerId,
          amount: event.referrerReward.amount,
          source: 'referral',
          description: `Referral reward — friend placed first order`,
          referenceType: 'referral_reward',
          referenceId: event.referrerReward.id,
          expiresAt: addDays(new Date(), env.referral.walletExpiryDays),
          metadata: { referralId: event.referralId, role: 'referrer' },
        });
      }
      if (event.refereeReward.type === 'wallet_credit' && event.refereeReward.amount > 0) {
        await walletService.credit({
          userId: event.refereeId,
          amount: event.refereeReward.amount,
          source: 'referral',
          description: `Welcome bonus — you used a referral code`,
          referenceType: 'referral_reward',
          referenceId: event.refereeReward.id,
          expiresAt: addDays(new Date(), env.referral.walletExpiryDays),
          metadata: { referralId: event.referralId, role: 'referee' },
        });
      }
    } catch (err) {
      logger.error('[wallet.event] REFERRAL_REWARDED handler failed', err);
    }
  });

  // ─── Referral rejected → reverse prior credit ─────────────────────────────
  eventBus.on<{ referralId: string; reason: string }>(
    'reward.reversed' as any,
    async (event: any) => {
      try {
        // Look up the wallet transaction by reference (referral_reward id)
        // For scaffold simplicity, reverse by referenceType + referenceId
        const { WalletTransactionRepository } = await import('../repositories/wallet.repository');
        const txRepo = new WalletTransactionRepository();
        const txs = await txRepo.findByReference('referral_reward', (event as any).rewardId ?? '');
        for (const tx of txs) {
          if (!tx.isReversed) {
            await walletService.reverse(tx._id, `Referral reward reversed: ${(event as any).reason}`);
          }
        }
      } catch (err) {
        logger.error('[wallet.event] reward.reversed handler failed', err);
      }
    }
  );

  // ─── Subscription charged → grant cashback to subscriber ──────────────────
  eventBus.on<{
    subscriptionId: string;
    customerId: string;
    amount: number;
    cycleNumber?: number;
    recovered?: boolean;
  }>(Events.SUBSCRIPTION_CHARGED, async (event) => {
    try {
      // Cashback: 2% of subscription amount, capped at ₹50 per cycle
      const cashback = Math.min(Math.round(event.amount * 0.02), 50);
      if (cashback <= 0) return;
      await walletService.credit({
        userId: event.customerId,
        amount: cashback,
        source: 'subscription_cashback',
        description: `Subscription cashback — cycle ${event.cycleNumber ?? 1}`,
        referenceType: 'subscription',
        referenceId: event.subscriptionId,
        expiresAt: addDays(new Date(), env.referral.walletExpiryDays),
        metadata: { subscriptionId: event.subscriptionId, cycleNumber: event.cycleNumber },
      });
    } catch (err) {
      logger.error('[wallet.event] SUBSCRIPTION_CHARGED handler failed', err);
    }
  });

  // ─── Order completed → grant cashback to customer ─────────────────────────
  eventBus.on<{ orderId: string; userId: string; amount: number }>(
    Events.ORDER_COMPLETED,
    async (event) => {
      try {
        // Cashback: 1% of order total, capped at ₹100
        const cashback = Math.min(Math.round(event.amount * 0.01), 100);
        if (cashback <= 0) return;
        await walletService.credit({
          userId: event.userId,
          amount: cashback,
          source: 'order_cashback',
          description: `Order cashback — order ${event.orderId}`,
          referenceType: 'order',
          referenceId: event.orderId,
          expiresAt: addDays(new Date(), env.referral.walletExpiryDays),
          metadata: { orderId: event.orderId },
        });
      } catch (err) {
        logger.error('[wallet.event] ORDER_COMPLETED handler failed', err);
      }
    }
  );

  // ─── Order cancelled → reverse cashback (best-effort) ─────────────────────
  eventBus.on<{ orderId: string; userId: string }>(Events.ORDER_CANCELLED, async (event) => {
    try {
      const { WalletTransactionRepository } = await import('../repositories/wallet.repository');
      const txRepo = new WalletTransactionRepository();
      const txs = await txRepo.findByReference('order', event.orderId);
      for (const tx of txs) {
        if (tx.type === 'credit' && !tx.isReversed) {
          await walletService.reverse(tx._id, `Order ${event.orderId} cancelled`);
        }
      }
    } catch (err) {
      logger.error('[wallet.event] ORDER_CANCELLED handler failed', err);
    }
  });

  // ─── User registered → auto-create wallet ─────────────────────────────────
  eventBus.on<{ userId: string }>(Events.USER_REGISTERED, async (event) => {
    try {
      await walletService.getOrCreateWallet(event.userId);
      logger.info(`[wallet.event] wallet auto-created for user ${event.userId}`);
    } catch (err) {
      logger.error('[wallet.event] USER_REGISTERED handler failed', err);
    }
  });

  logger.info('[wallet.event] subscribers registered');
}
