import { emailWrap, emailButton, emailFallbackLink, emailDetailRow, emailDetailsTable, emailBadge } from './emailLayout';

/**
 * Built-in notification templates. Seeded into the database on first boot.
 * Email-channel bodies are full HTML documents (emailWrap()) — nothing
 * downstream sanitizes/strips this (see notification.service.ts), and
 * notification.service.ts derives a plain-text fallback from the HTML
 * automatically, so templates only need to author the HTML version.
 * SMS/WhatsApp-channel bodies stay plain text — those channels have no HTML
 * rendering at all.
 */
export interface BuiltinTemplate {
  name: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'push';
  subject?: string;
  body: string;
  description?: string;
}

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    name: 'email_verification',
    channel: 'email',
    subject: 'Verify your email address',
    body: emailWrap(`
      <p style="margin:0 0 16px;">Hi {{name}},</p>
      <p style="margin:0 0 8px;">Welcome to FUYL — please verify your email address to activate your account.</p>
      {{#if verifyUrl}}
      ${emailButton('{{verifyUrl}}', 'Verify Email')}
      ${emailFallbackLink('{{verifyUrl}}')}
      {{/if}}
      {{#if token}}<p style="margin:16px 0 0;font-size:13px;color:#4A5A3A;">Verification code: <strong>{{token}}</strong></p>{{/if}}
      <p style="margin:24px 0 0;font-size:13px;color:#4A5A3A;">This link expires in 24 hours. If you didn't create a FUYL account, you can safely ignore this email.</p>
    `),
    description: 'Sent on registration and on resend-verification requests',
  },
  {
    name: 'password_reset',
    channel: 'email',
    subject: 'Reset your password',
    body: emailWrap(`
      <p style="margin:0 0 16px;">Hi {{name}},</p>
      <p style="margin:0 0 8px;">We received a request to reset your password. Click below to choose a new one.</p>
      {{#if resetUrl}}
      ${emailButton('{{resetUrl}}', 'Reset Password')}
      ${emailFallbackLink('{{resetUrl}}')}
      {{/if}}
      {{#if token}}<p style="margin:16px 0 0;font-size:13px;color:#4A5A3A;">Reset code: <strong>{{token}}</strong></p>{{/if}}
      <p style="margin:24px 0 0;font-size:13px;color:#4A5A3A;">This link expires in 1 hour. If you didn't request this, your account is safe — just ignore this email.</p>
    `),
    description: 'Sent on forgot-password requests',
  },
  {
    name: 'welcome',
    channel: 'email',
    subject: 'Welcome to FUYL!',
    body: emailWrap(`
      <p style="margin:0 0 16px;">Hi {{name}},</p>
      <p style="margin:0 0 8px;">Your account is verified and ready to go — welcome aboard.</p>
      <p style="margin:0 0 8px;">Explore the full range, set up a subscription for your daily essentials, and start earning rewards by inviting friends.</p>
      ${emailButton('{{shopUrl}}', 'Start Shopping')}
    `),
    description: 'Sent after successful email verification',
  },
  {
    name: 'newsletter_confirmation',
    channel: 'email',
    subject: 'Confirm your FUYL newsletter subscription',
    body: emailWrap(`
      <p style="margin:0 0 16px;">Hi there,</p>
      <p style="margin:0 0 8px;">Thanks for signing up for the FUYL newsletter. Please confirm your email address to start receiving nutrition tips, new product drops, and subscriber-only offers.</p>
      ${emailButton('{{confirmUrl}}', 'Confirm Subscription')}
      ${emailFallbackLink('{{confirmUrl}}')}
      <p style="margin:24px 0 0;font-size:13px;color:#4A5A3A;">This link expires in 24 hours. If you didn't request this, you can safely ignore this email — you won't be subscribed.</p>
    `),
    description: 'Double opt-in confirmation, sent when someone subscribes to the newsletter',
  },
  {
    name: 'newsletter_welcome',
    channel: 'email',
    subject: 'Welcome to the FUYL newsletter 🎉',
    body: emailWrap(`
      <p style="margin:0 0 16px;">You're in! 🎉</p>
      <p style="margin:0 0 8px;">Your subscription is confirmed. Expect nutrition insights, new product announcements, and offers we save for subscribers only.</p>
      ${emailButton('{{shopUrl}}', 'Explore FUYL')}
      <p style="margin:24px 0 0;font-size:12px;color:#4A5A3A;">Changed your mind? You can <a href="{{unsubscribeUrl}}" style="color:#558476;">unsubscribe anytime</a>.</p>
    `),
    description: 'Sent after a newsletter subscriber confirms their email (double opt-in)',
  },
  {
    name: 'newsletter_unsubscribed',
    channel: 'email',
    subject: "You've been unsubscribed from FUYL",
    body: emailWrap(`
      <p style="margin:0 0 16px;">You're unsubscribed.</p>
      <p style="margin:0 0 8px;">We've removed <strong>{{email}}</strong> from the FUYL newsletter. You won't receive any more marketing emails from us.</p>
      <p style="margin:16px 0 0;font-size:13px;color:#4A5A3A;">Changed your mind? You can subscribe again anytime from our website.</p>
    `),
    description: 'Confirmation sent after a subscriber unsubscribes from the newsletter',
  },
  {
    name: 'order_placed',
    channel: 'email',
    subject: 'Order {{orderNumber}} confirmed',
    body: emailWrap(`
      <p style="margin:0 0 16px;">Hi {{name}},</p>
      <p style="margin:0 0 8px;">Thanks for your order — we're getting it ready.</p>
      ${emailDetailsTable(
        emailDetailRow('Order', '{{orderNumber}}') +
        emailDetailRow('Items', '{{itemCount}}') +
        emailDetailRow('Payment', '{{paymentMethod}}') +
        emailDetailRow('Total', '{{currency}}{{total}}')
      )}
      <p style="margin:16px 0 0;">We'll email you again the moment it ships.</p>
      ${emailButton('{{orderUrl}}', 'View Order')}
    `),
    description: 'Sent on order.placed event',
  },
  {
    name: 'order_shipped',
    channel: 'email',
    subject: 'Order {{orderNumber}} shipped',
    body: emailWrap(`
      <p style="margin:0 0 16px;">Hi {{name}},</p>
      <p style="margin:0 0 8px;">${emailBadge('On its way', 'success')}</p>
      <p style="margin:16px 0 8px;">Your order {{orderNumber}} is on its way!</p>
      ${emailDetailsTable(
        emailDetailRow('Carrier', '{{carrier}}') +
        emailDetailRow('Tracking No.', '{{trackingNumber}}')
      )}
      ${emailButton('{{orderUrl}}', 'Track Order')}
    `),
    description: 'Sent on order.shipped event',
  },
  {
    name: 'order_delivered',
    channel: 'email',
    subject: 'Order {{orderNumber}} delivered',
    body: emailWrap(`
      <p style="margin:0 0 16px;">Hi {{name}},</p>
      <p style="margin:0 0 8px;">${emailBadge('Delivered', 'success')}</p>
      <p style="margin:16px 0 8px;">Your order {{orderNumber}} has been delivered. Enjoy!</p>
      <p style="margin:0 0 8px;">If you have a moment, we'd love to hear how it's working for you.</p>
      ${emailButton('{{orderUrl}}', 'Leave a Review')}
    `),
    description: 'Sent on order.delivered event',
  },
  {
    name: 'subscription_activated',
    channel: 'email',
    subject: 'Subscription activated — {{planName}}',
    body: emailWrap(`
      <p style="margin:0 0 16px;">Hi {{name}},</p>
      <p style="margin:0 0 8px;">Your subscription to <strong>{{planName}}</strong> is now active.</p>
      ${emailDetailsTable(
        emailDetailRow('Next delivery', '{{nextDeliveryDate}}') +
        emailDetailRow('Billing', '{{currency}}{{amount}} / {{interval}}')
      )}
      ${emailButton('{{manageUrl}}', 'Manage Subscription')}
    `),
    description: 'Sent on subscription.activated event',
  },
  {
    name: 'subscription_charged',
    channel: 'email',
    subject: 'Subscription billed — {{planName}}',
    body: emailWrap(`
      <p style="margin:0 0 16px;">Hi {{name}},</p>
      <p style="margin:0 0 8px;">Your subscription to <strong>{{planName}}</strong> was billed successfully.</p>
      ${emailDetailsTable(
        emailDetailRow('Amount', '{{currency}}{{amount}}') +
        emailDetailRow('Cycle', '{{cycleNumber}}') +
        emailDetailRow('Next delivery', '{{nextDeliveryDate}}')
      )}
      ${emailButton('{{manageUrl}}', 'Manage Subscription')}
    `),
    description: 'Sent on subscription.charged event',
  },
  {
    name: 'subscription_failed',
    channel: 'email',
    subject: 'Subscription payment failed — {{planName}}',
    body: emailWrap(`
      <p style="margin:0 0 16px;">Hi {{name}},</p>
      <p style="margin:0 0 8px;">${emailBadge('Payment failed', 'warning')}</p>
      <p style="margin:16px 0 8px;">We couldn't process the payment for your <strong>{{planName}}</strong> subscription.</p>
      ${emailDetailsTable(
        emailDetailRow('Attempt', '{{attemptNumber}} of {{maxAttempts}}') +
        emailDetailRow('Amount', '{{currency}}{{amount}}')
      )}
      <p style="margin:16px 0 0;">We'll retry automatically — update your payment method to avoid missing your next delivery.</p>
      ${emailButton('{{manageUrl}}', 'Update Payment Method')}
    `),
    description: 'Sent on subscription.failed event',
  },
  {
    name: 'subscription_cancelled',
    channel: 'email',
    subject: 'Subscription cancelled — {{planName}}',
    body: emailWrap(`
      <p style="margin:0 0 16px;">Hi {{name}},</p>
      <p style="margin:0 0 8px;">Your subscription to <strong>{{planName}}</strong> has been cancelled.</p>
      <p style="margin:0 0 8px;">You'll continue to receive deliveries until <strong>{{endDate}}</strong>.</p>
      ${emailButton('{{manageUrl}}', 'View Subscriptions')}
    `),
    description: 'Sent on subscription.cancelled event',
  },
  {
    name: 'referral_rewarded',
    channel: 'email',
    subject: 'You earned a referral reward!',
    body: emailWrap(`
      <p style="margin:0 0 16px;">Hi {{name}},</p>
      <p style="margin:0 0 8px;">${emailBadge('Reward earned', 'success')}</p>
      <p style="margin:16px 0 8px;">Great news — you earned <strong>₹{{amount}}</strong> through the referral program.</p>
      <p style="margin:0 0 8px;">Your referee {{refereeName}} completed their first order, and the reward has been credited to your wallet.</p>
      ${emailButton('{{walletUrl}}', 'View Wallet')}
    `),
    description: 'Sent on referral.redeemed event',
  },
  {
    name: 'referral_applied',
    channel: 'email',
    subject: 'Referral code applied',
    body: emailWrap(`
      <p style="margin:0 0 16px;">Hi {{name}},</p>
      <p style="margin:0 0 8px;">Your referral code <strong>{{code}}</strong> has been applied.</p>
      <p style="margin:0 0 8px;">You'll receive <strong>₹{{refereeReward}}</strong> as wallet credit once your first order completes.</p>
      ${emailButton('{{walletUrl}}', 'View Wallet')}
    `),
    description: 'Sent on referral.applied event',
  },
  {
    name: 'wallet_credited',
    channel: 'email',
    subject: 'Wallet credited — ₹{{amount}}',
    body: emailWrap(`
      <p style="margin:0 0 16px;">Hi {{name}},</p>
      <p style="margin:0 0 8px;">Your wallet was just credited.</p>
      ${emailDetailsTable(
        emailDetailRow('Credited', '₹{{amount}}') +
        emailDetailRow('Reason', '{{reason}}') +
        emailDetailRow('New balance', '₹{{balance}}')
      )}
      ${emailButton('{{walletUrl}}', 'View Wallet')}
    `),
    description: 'Sent on wallet.credit event',
  },
  {
    name: 'cart_abandoned',
    channel: 'email',
    subject: 'You left items in your cart',
    body: emailWrap(`
      <p style="margin:0 0 16px;">Hi {{name}},</p>
      <p style="margin:0 0 8px;">You left {{itemCount}} item(s) in your cart — they're still saved and ready for checkout.</p>
      ${emailButton('{{cartUrl}}', 'Resume Checkout')}
    `),
    description: 'Sent on cart.abandoned event',
  },
  {
    name: 'referral_share_email',
    channel: 'email',
    subject: "You've been invited to FUYL 🎁",
    body: emailWrap(`
      <p style="margin:0 0 16px;">Hi,</p>
      <p style="margin:0 0 8px;">A friend thinks you'd love FUYL and sent you an invite. Use code <strong>{{code}}</strong> at signup for wallet credit on your first order.</p>
      ${emailButton('{{link}}', 'Claim Your Invite')}
      ${emailFallbackLink('{{link}}')}
    `),
    description: "Sent when a customer shares their referral code via email (referral module's share action)",
  },
  {
    name: 'order_otp',
    channel: 'sms',
    body: 'Your Fuyl order OTP is {{otp}}. Valid for 10 minutes. Do not share.',
    description: 'OTP for COD order confirmation',
  },
  {
    name: 'subscription_reminder',
    channel: 'sms',
    body: 'Hi {{name}}, your {{planName}} subscription delivers tomorrow. Reply PAUSE to pause or SKIP to skip this cycle.',
    description: 'Pre-delivery reminder for subscription',
  },
  {
    name: 'referral_share_sms',
    channel: 'sms',
    body: "You're invited to Fuyl! Use code {{code}} for wallet credit on your first order. {{link}}",
    description: "Sent when a customer shares their referral code via SMS/WhatsApp (referral module's share action)",
  },
];
