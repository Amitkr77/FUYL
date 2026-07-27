/**
 * Sandbox verification for the Cashfree integration. Exercises the REAL
 * gateway wrappers (payment + subscription) so it validates the exact code
 * paths the app uses, and prints raw responses so you can confirm the field
 * names / status strings the `VERIFY` comments flag.
 *
 * Requires CASHFREE_APP_ID / CASHFREE_SECRET_KEY / CASHFREE_ENV in .env
 * (use sandbox keys). No database connection needed.
 *
 * Usage:
 *   npm run cashfree-check            # runs both flows
 *   npm run cashfree-check -- order   # one-time order only
 *   npm run cashfree-check -- sub     # subscription only
 *
 * Note: the subscription CHARGE + webhooks can't be scripted — they need a
 * human to authorize the mandate via the returned session/auth link. This
 * script verifies plan + subscription creation and status fetch, which is
 * where the API-shape risk lives.
 */
import { env } from '../src/config/env';
import { cashfreeGateway } from '../src/modules/payment/utils/cashfree';
import { cashfreeSubscriptionService } from '../src/modules/subscription/utils/cashfreeSubscription.service';

const stamp = Date.now().toString(36);
const TEST_CUSTOMER = {
  id: `cust_test_${stamp}`,
  phone: '9999999999',
  email: 'test@fuyl.in',
  name: 'Sandbox Tester',
};

function heading(title: string) {
  console.log(`\n${'━'.repeat(60)}\n  ${title}\n${'━'.repeat(60)}`);
}
function show(label: string, value: unknown) {
  console.log(`\n▶ ${label}:\n${JSON.stringify(value, null, 2)}`);
}
async function step<T>(name: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    const result = await fn();
    console.log(`\n✅ ${name} — OK`);
    show(`${name} response`, result);
    return result;
  } catch (err) {
    console.log(`\n❌ ${name} — FAILED`);
    console.log(err instanceof Error ? err.message : String(err));
    return null;
  }
}

async function testOrderFlow() {
  heading('ONE-TIME ORDER FLOW (fully scriptable)');
  const orderId = `order_test_${stamp}`;

  const created = await step('createOrder', () =>
    cashfreeGateway.createOrder({
      orderId,
      amount: 1,
      currency: 'INR',
      customer: TEST_CUSTOMER,
      returnUrl: `${env.clientUrl}/checkout/success?orderId=${orderId}`,
      notes: { source: 'sandbox-check' },
    }),
  );

  if (created) {
    console.log(
      `\nℹ️  payment_session_id present: ${Boolean(created.payment_session_id)} — ` +
        `this is what the storefront SDK opens. To simulate a real payment, use it in ` +
        `Cashfree's test checkout, then re-run getOrder below.`,
    );
    await step('getOrder', () => cashfreeGateway.getOrder(orderId));
    await step('getOrderPayments', () => cashfreeGateway.getOrderPayments(orderId));
  }
}

async function testSubscriptionFlow() {
  heading('SUBSCRIPTION FLOW (create + status; charge needs manual mandate auth)');
  const planId = `plan_test_${stamp}`;
  const subscriptionId = `sub_test_${stamp}`;

  const plan = await step('createPlan', () =>
    cashfreeSubscriptionService.createPlan({
      planId,
      planName: 'Sandbox Monthly',
      amount: 499,
      intervals: 1,
      intervalType: 'MONTH',
      maxCycles: 12,
    }),
  );

  if (plan) {
    const sub = await step('createSubscription', () =>
      cashfreeSubscriptionService.createSubscription({
        subscriptionId,
        planId,
        customer: TEST_CUSTOMER,
        authAmount: 499,
        returnUrl: `${env.clientUrl}/account/subscriptions`,
        notes: { source: 'sandbox-check' },
      }),
    );
    if (sub) {
      console.log(
        `\nℹ️  Authorize the mandate to activate: ` +
          `${sub.auth_link ?? '(use subscription_session_id in the SDK)'}\n` +
          `After authorization, Cashfree fires SUBSCRIPTION_STATUS_CHANGE and, per cycle, ` +
          `SUBSCRIPTION_NEW_PAYMENT to /webhooks/cashfree/subscription.`,
      );
      await step('getSubscription', () => cashfreeSubscriptionService.getSubscription(subscriptionId));
    }
  }
}

async function main() {
  const which = process.argv[2];
  console.log(`Cashfree env: mode=${env.cashfree.mode}, appId set=${Boolean(env.cashfree.appId)}, secret set=${Boolean(env.cashfree.secretKey)}`);
  if (!env.cashfree.appId || !env.cashfree.secretKey) {
    console.error('\n❌ CASHFREE_APP_ID / CASHFREE_SECRET_KEY not set in .env — aborting.');
    process.exit(1);
  }

  if (which !== 'sub') await testOrderFlow();
  if (which !== 'order') await testSubscriptionFlow();

  console.log('\nDone. Review the raw responses above against the VERIFY comments in the gateway wrappers.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
