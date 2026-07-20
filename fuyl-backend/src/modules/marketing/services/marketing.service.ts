import { ContactMessageModel } from '../models';
import { newsletterSubscriberRepository } from '../repositories';
import type { INewsletterSubscriber } from '../models/newsletterSubscriber.model';
import {
  ContactMessageDTO,
  NewsletterSubscribeDTO,
  NewsletterVerifyDTO,
  NewsletterUnsubscribeDTO,
  NewsletterResendDTO,
} from '../validators';
import { generateRandomToken, hashToken } from '../../identity/utils/crypto';
import { notificationService } from '../../notification/services';
import { env } from '../../../config/env';
import { logger } from '../../../config/logger';

// How long a double opt-in confirmation link stays valid.
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
// Minimum gap between confirmation-email sends for the same address, so
// repeated submits (or resend spam) don't fan out a burst of emails.
const RESEND_THROTTLE_MS = 60 * 1000; // 60s

/**
 * Result the public subscribe endpoint returns. The frontend maps `status`
 * to the message it shows the visitor.
 */
export type SubscribeResult = {
  status: 'pending' | 'already_subscribed' | 'reactivating';
};

class MarketingService {
  async submitContactMessage(dto: ContactMessageDTO) {
    const message = await ContactMessageModel.create(dto);
    // No email-dispatch integration yet (would route through the
    // notification module's template/queue system) — submissions are
    // persisted so nothing is lost, but no one is actively alerted.
    return { id: message._id, received: true };
  }

  // ─── Newsletter — double opt-in lifecycle ───────────────────────────────

  async subscribeNewsletter(dto: NewsletterSubscribeDTO): Promise<SubscribeResult> {
    const email = dto.email.toLowerCase().trim();
    const existing = await newsletterSubscriberRepository.findByEmail(email);

    // Already confirmed — nothing to do, just tell them they're on the list.
    if (existing && existing.status === 'active') {
      return { status: 'already_subscribed' };
    }

    // Brand-new address → create a pending record and send confirmation.
    if (!existing) {
      const { rawToken, hash, expiresAt } = this.newVerification();
      const unsubscribeToken = generateRandomToken(24);
      const now = new Date();
      const sub = await newsletterSubscriberRepository.create({
        email,
        status: 'pending',
        verificationTokenHash: hash,
        verificationExpiresAt: expiresAt,
        lastConfirmationSentAt: now,
        unsubscribeToken,
        source: dto.source ?? 'website',
        subscribedAt: now,
        history: [
          { action: 'subscribed', at: now },
          { action: 'confirmation_sent', at: now },
        ],
      });
      await this.sendConfirmationEmail(sub, rawToken);
      return { status: 'pending' };
    }

    // Existing but not active (pending or previously unsubscribed) →
    // (re)issue a fresh confirmation, throttled.
    const wasUnsubscribed = existing.status === 'unsubscribed';
    const now = new Date();
    const { rawToken, hash, expiresAt } = this.newVerification();

    existing.status = 'pending';
    existing.verificationTokenHash = hash;
    existing.verificationExpiresAt = expiresAt;
    existing.subscribedAt = existing.subscribedAt ?? now;
    existing.history.push({
      action: wasUnsubscribed ? 'resubscribed' : 'confirmation_sent',
      at: now,
    });

    if (this.canSendConfirmation(existing, now)) {
      existing.lastConfirmationSentAt = now;
      await existing.save();
      await this.sendConfirmationEmail(existing, rawToken);
    } else {
      // Within throttle window — persist the state change but skip the email.
      await existing.save();
    }

    return { status: wasUnsubscribed ? 'reactivating' : 'pending' };
  }

  async verifyNewsletter(dto: NewsletterVerifyDTO) {
    const hash = hashToken(dto.token);
    const sub = await newsletterSubscriberRepository.findByVerificationTokenHash(hash);

    if (!sub) {
      return { verified: false as const, reason: 'invalid' as const };
    }
    if (sub.status === 'active') {
      // Link clicked twice — idempotent success.
      return { verified: true as const, email: sub.email, alreadyVerified: true };
    }
    if (
      !sub.verificationExpiresAt ||
      sub.verificationExpiresAt.getTime() < Date.now()
    ) {
      return { verified: false as const, reason: 'expired' as const };
    }

    const now = new Date();
    sub.status = 'active';
    sub.verifiedAt = now;
    sub.verificationTokenHash = null;
    sub.verificationExpiresAt = null;
    sub.history.push({ action: 'verified', at: now });
    await sub.save();

    await this.sendWelcomeEmail(sub);
    return { verified: true as const, email: sub.email };
  }

  async unsubscribeNewsletter(dto: NewsletterUnsubscribeDTO) {
    const sub = await newsletterSubscriberRepository.findByUnsubscribeToken(dto.token);
    if (!sub) {
      return { unsubscribed: false as const, reason: 'invalid' as const };
    }
    if (sub.status === 'unsubscribed') {
      return { unsubscribed: true as const, email: sub.email, alreadyUnsubscribed: true };
    }

    const now = new Date();
    sub.status = 'unsubscribed';
    sub.unsubscribedAt = now;
    // Clear any dangling verification material so a stale confirm link can't
    // re-activate an address that has since opted out.
    sub.verificationTokenHash = null;
    sub.verificationExpiresAt = null;
    sub.history.push({ action: 'unsubscribed', at: now });
    await sub.save();

    await this.sendUnsubscribedEmail(sub);
    return { unsubscribed: true as const, email: sub.email };
  }

  /**
   * Resend the confirmation email for a still-pending address. Always resolves
   * to `{ sent: true }` regardless of whether the address exists / is pending,
   * so the endpoint can't be used to enumerate who is subscribed.
   */
  async resendVerification(dto: NewsletterResendDTO) {
    const email = dto.email.toLowerCase().trim();
    const sub = await newsletterSubscriberRepository.findByEmail(email);
    const now = new Date();

    if (sub && sub.status === 'pending' && this.canSendConfirmation(sub, now)) {
      const { rawToken, hash, expiresAt } = this.newVerification();
      sub.verificationTokenHash = hash;
      sub.verificationExpiresAt = expiresAt;
      sub.lastConfirmationSentAt = now;
      sub.history.push({ action: 'confirmation_sent', at: now });
      await sub.save();
      await this.sendConfirmationEmail(sub, rawToken);
    }

    return { sent: true };
  }

  // ─── internals ──────────────────────────────────────────────────────────

  private newVerification() {
    const rawToken = generateRandomToken(32);
    return {
      rawToken,
      hash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
    };
  }

  private canSendConfirmation(sub: INewsletterSubscriber, now: Date): boolean {
    if (!sub.lastConfirmationSentAt) return true;
    return now.getTime() - sub.lastConfirmationSentAt.getTime() >= RESEND_THROTTLE_MS;
  }

  private unsubscribeUrl(token: string): string {
    return `${env.clientUrl}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
  }

  private async sendConfirmationEmail(sub: INewsletterSubscriber, rawToken: string) {
    const confirmUrl = `${env.clientUrl}/newsletter/verify?token=${encodeURIComponent(rawToken)}`;
    await this.dispatch(sub.email, 'newsletter_confirmation', {
      confirmUrl,
      unsubscribeUrl: this.unsubscribeUrl(sub.unsubscribeToken),
    });
  }

  private async sendWelcomeEmail(sub: INewsletterSubscriber) {
    await this.dispatch(sub.email, 'newsletter_welcome', {
      unsubscribeUrl: this.unsubscribeUrl(sub.unsubscribeToken),
    });
  }

  private async sendUnsubscribedEmail(sub: INewsletterSubscriber) {
    await this.dispatch(sub.email, 'newsletter_unsubscribed', { email: sub.email });
  }

  /**
   * Queue an email to a raw address (newsletter subscribers aren't
   * necessarily registered users). `transactional` category so these consent
   * / lifecycle emails always send and aren't gated by marketing opt-out.
   * Never throws into the request path — a queue hiccup shouldn't fail a
   * subscribe/verify/unsubscribe.
   */
  private async dispatch(
    email: string,
    template: string,
    data: Record<string, unknown>
  ) {
    try {
      await notificationService.dispatch({
        channel: 'email',
        to: { email },
        template,
        data,
        category: 'transactional',
      });
    } catch (err) {
      logger.error(`[marketing] failed to queue "${template}" email`, err);
    }
  }
}

export const marketingService = new MarketingService();
