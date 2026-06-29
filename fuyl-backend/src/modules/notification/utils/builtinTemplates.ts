/**
 * Built-in notification templates. Seeded into the database on first boot.
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
    body: `Hi {{name}},

Please verify your email address by clicking the link below:

{{#if verifyUrl}}{{verifyUrl}}{{/if}}
{{#if token}}Your verification token: {{token}}{{/if}}

This link expires in 24 hours. If you didn't sign up, you can ignore this email.

— Fuyl Team`,
    description: 'Sent on registration and on resend-verification requests',
  },
  {
    name: 'password_reset',
    channel: 'email',
    subject: 'Reset your password',
    body: `Hi {{name}},

We received a request to reset your password. Use the link below to choose a new password:

{{#if resetUrl}}{{resetUrl}}{{/if}}
{{#if token}}Your reset token: {{token}}{{/if}}

This link expires in 1 hour. If you didn't request a reset, your account is safe — just ignore this email.

— Fuyl Team`,
    description: 'Sent on forgot-password requests',
  },
  {
    name: 'welcome',
    channel: 'email',
    subject: 'Welcome to Fuyl!',
    body: `Hi {{name}},

Welcome aboard! Your account is ready.

Explore our catalog, set up subscriptions for your daily essentials, and start earning rewards through our referral program.

— Fuyl Team`,
    description: 'Sent after successful email verification',
  },
  {
    name: 'order_placed',
    channel: 'email',
    subject: 'Order {{orderNumber}} confirmed',
    body: `Hi {{name}},

Your order {{orderNumber}} has been placed successfully.

Total: {{currency}}{{total}}
Items: {{itemCount}}
Payment: {{paymentMethod}}

We'll notify you when it ships.

— Fuyl Team`,
    description: 'Sent on order.placed event',
  },
  {
    name: 'order_shipped',
    channel: 'email',
    subject: 'Order {{orderNumber}} shipped',
    body: `Hi {{name}},

Your order {{orderNumber}} is on its way!

Tracking: {{trackingNumber}}
Carrier: {{carrier}}

— Fuyl Team`,
    description: 'Sent on order.shipped event',
  },
  {
    name: 'order_delivered',
    channel: 'email',
    subject: 'Order {{orderNumber}} delivered',
    body: `Hi {{name}},

Your order {{orderNumber}} has been delivered. Enjoy!

If you have a moment, please leave a review.

— Fuyl Team`,
    description: 'Sent on order.delivered event',
  },
  {
    name: 'subscription_activated',
    channel: 'email',
    subject: 'Subscription activated — {{planName}}',
    body: `Hi {{name}},

Your subscription to {{planName}} is now active.

Next delivery: {{nextDeliveryDate}}
Billing: {{currency}}{{amount}} / {{interval}}

Manage your subscription from the dashboard.

— Fuyl Team`,
    description: 'Sent on subscription.activated event',
  },
  {
    name: 'subscription_charged',
    channel: 'email',
    subject: 'Subscription billed — {{planName}}',
    body: `Hi {{name}},

Your subscription to {{planName}} was billed successfully.

Amount: {{currency}}{{amount}}
Cycle: {{cycleNumber}}
Next delivery: {{nextDeliveryDate}}

— Fuyl Team`,
    description: 'Sent on subscription.charged event',
  },
  {
    name: 'subscription_failed',
    channel: 'email',
    subject: 'Subscription payment failed — {{planName}}',
    body: `Hi {{name}},

We couldn't process the payment for your {{planName}} subscription.

Attempt: {{attemptNumber}} of {{maxAttempts}}
Amount: {{currency}}{{amount}}

We'll retry automatically. Please update your payment method if needed.

— Fuyl Team`,
    description: 'Sent on subscription.failed event',
  },
  {
    name: 'subscription_cancelled',
    channel: 'email',
    subject: 'Subscription cancelled — {{planName}}',
    body: `Hi {{name}},

Your subscription to {{planName}} has been cancelled.

You'll continue to receive deliveries until {{endDate}}.

— Fuyl Team`,
    description: 'Sent on subscription.cancelled event',
  },
  {
    name: 'referral_rewarded',
    channel: 'email',
    subject: 'You earned a referral reward!',
    body: `Hi {{name}},

Great news! You earned ₹{{amount}} via the referral program.

Your referee {{refereeName}} completed their first order.

The reward has been credited to your wallet.

— Fuyl Team`,
    description: 'Sent on referral.redeemed event',
  },
  {
    name: 'referral_applied',
    channel: 'email',
    subject: 'Referral code applied',
    body: `Hi {{name}},

Your referral code {{code}} has been applied.

You'll receive ₹{{refereeReward}} as wallet credit after your first order completes.

— Fuyl Team`,
    description: 'Sent on referral.applied event',
  },
  {
    name: 'wallet_credited',
    channel: 'email',
    subject: 'Wallet credited — ₹{{amount}}',
    body: `Hi {{name}},

Your wallet was credited with ₹{{amount}}.

Reason: {{reason}}
New balance: ₹{{balance}}

— Fuyl Team`,
    description: 'Sent on wallet.credit event',
  },
  {
    name: 'cart_abandoned',
    channel: 'email',
    subject: 'You left items in your cart',
    body: `Hi {{name}},

You left {{itemCount}} item(s) in your cart. Complete your checkout before they're gone!

{{#if cartUrl}}Resume: {{cartUrl}}{{/if}}

— Fuyl Team`,
    description: 'Sent on cart.abandoned event',
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
];
