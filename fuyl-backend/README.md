# Fuyl Backend — E-commerce Operating System

TypeScript · Express · MongoDB · Redis · BullMQ · Razorpay · JWT

A modular monolith with **17 modules** covering the full e-commerce lifecycle,
all fully implemented with the full `models → repositories → services →
controllers → routes` stack. See [Project Status](#8-project-status) for the
few deliberate gaps (no shipping module yet, push notifications unwired).

---

## 1. Architecture at a Glance

```
src/
├── config/         env, db, redis, queue, scheduler, logger
├── shared/         errors, responses, middleware, services (cache/queue/eventBus/audit), utils, enums
├── modules/        17 feature modules — each with controllers/services/repositories/models/routes
│   identity, customer, catalog, inventory, pricing, promotion, cart, checkout,
│   order, payment, wallet, review, notification, analytics, admin, subscription, referral
├── routes/index.ts mounts all module routers
├── app.ts         express app (helmet, cors, json, swagger, raw-body webhook capture)
└── server.ts      boot sequence: mongo → redis → eventBus → schedulers → http
```

**Cross-cutting infrastructure:**
- **BullMQ** queue (`src/config/queue.ts`) — background jobs
- **node-cron** scheduler (`src/config/scheduler.ts`) — recurring tasks
- **Redis pub/sub** event bus (`src/shared/services/eventBus.service.ts`) — decoupled cross-module events

---

## 2. Quickstart

### Local (without Docker)

```bash
# 1. Install dependencies
npm install

# 2. Copy env and fill in real values
cp .env.example .env

# 3. Make sure MongoDB + Redis are running locally
#    (or use the docker-compose just for those: docker compose -f docker/docker-compose.yml up mongo redis)

# 4. Run in dev mode (tsx watch)
npm run dev

# 5. Build & run in prod
npm run build
npm start
```

### Docker

```bash
cd docker
docker compose up --build
```

The API is available at `http://localhost:4000/api/v1`.
Swagger docs at `http://localhost:4000/docs`.

---

## 3. The Two New Modules

### 3.1 Subscription Module

**Purpose:** Recurring billing for products ("Subscribe & Save") plus standalone membership plans. Integrates with Razorpay Subscriptions API.

**Collections:** `subscription_plans`, `subscriptions`, `subscription_deliveries`, `subscription_events`, `subscription_pause_schedules`

**Key endpoints:**

| Method | Path | Description |
|---|---|---|
| GET | `/subscriptions/plans` | List active plans (public) |
| POST | `/subscriptions` | Subscribe to a product/variant |
| GET | `/subscriptions/me` | List my subscriptions |
| PATCH | `/subscriptions/:id/pause` | Pause |
| PATCH | `/subscriptions/:id/resume` | Resume |
| POST | `/subscriptions/:id/skip` | Skip next delivery |
| PATCH | `/subscriptions/:id/frequency` | Change frequency |
| POST | `/subscriptions/:id/cancel` | Cancel (immediate or end-of-cycle) |
| GET | `/subscriptions/:id/deliveries` | Delivery history |
| GET | `/subscriptions/:id/events` | Audit log |
| POST | `/webhooks/razorpay/subscription` | Razorpay webhook (raw body) |
| POST | `/admin/subscription/plans` | Create plan (admin) |
| GET | `/admin/subscription/dashboard` | MRR, churn, active counts |

**Cron jobs:**
- `subscription.billing` — daily 02:00, processes due subscriptions
- `subscription.dunning` — hourly, retries failed payments (×3 then auto-cancel)
- `subscription.reminders` — daily 03:00, T-3 reminders

**Lifecycle:** `pending → active ⇄ paused → past_due → cancelled → expired`

### 3.2 Referral Module

**Purpose:** Existing customers invite new customers via unique codes; both earn rewards when the referee completes a qualifying action.

**Collections:** `referral_campaigns`, `referral_codes`, `referrals`, `referral_rewards`, `referral_fraud_flags`

**Key endpoints:**

| Method | Path | Description |
|---|---|---|
| POST | `/referrals/code` | Generate my referral code |
| GET | `/referrals/code` | List my codes |
| POST | `/referrals/apply` | Apply a code (at signup or checkout) |
| GET | `/referrals/me` | Dashboard — stats, earnings, pending |
| GET | `/referrals/me/list` | My referrals |
| GET | `/referrals/me/rewards` | My rewards |
| POST | `/referrals/share` | Get shareable link/message (whatsapp/email/sms/link) |
| POST | `/admin/referrals/campaigns` | Create campaign (admin) |
| GET | `/admin/referrals/stats` | Conversion, payout totals |
| GET | `/admin/referrals/fraud` | List fraud flags |
| POST | `/admin/referrals/fraud/:id/review` | Approve/reject a flagged referral |

**Event subscriptions:** `user.registered`, `order.placed`, `order.completed`, `order.cancelled`

**Anti-fraud:** device fingerprint + IP hash + phone hash matching across all referrals. Self-referrals are auto-blocked. High-severity matches auto-reject; medium-severity goes to admin moderation queue.

**Milestones:** per-campaign configurable (e.g. 5 / 10 / 25 referrals → bonus wallet credit).

**Cron jobs:**
- `referral.fraudScan` — nightly 04:00, scans suspicious patterns
- `referral.expirySweeper` — daily 05:00, expires stale pending referrals

---

## 4. Event Bus

Cross-module communication uses an in-process + Redis pub/sub event bus.
Modules publish events; subscribers react asynchronously. **No direct
cross-module service calls for side effects.**

Key events (see `src/shared/services/eventBus.service.ts`):
- `user.registered` → wallet creates wallet, referral marks pending, notification sends verification email, analytics tracks
- `order.placed` → referral records firstOrder, notification sends confirmation, analytics tracks
- `order.completed` → referral grants reward, wallet credits cashback, analytics tracks
- `order.cancelled` → referral reverses reward, wallet reverses cashback, analytics tracks
- `subscription.charged` → wallet grants cashback, notification sends receipt, analytics tracks
- `referral.redeemed` → wallet credits both parties, notification sends confirmations

Note: inventory reservation and subscription dunning are **not** currently event-driven —
inventory reservations are created directly by whatever calls the inventory service, and
`subscription.dunning` runs off its own hourly cron rather than reacting to `payment.failed`.
Only `wallet`, `referral`, `notification`, and `analytics` currently register event subscribers.

---

## 5. Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Hot-reload dev server (tsx watch) |
| `npm run build` | TypeScript compile to `dist/` |
| `npm start` | Run compiled production build |
| `npm run typecheck` | Type-check without emitting |
| `npm test` | Run all Jest tests |
| `npm run test:unit` | Unit tests only |
| `npm run test:integration` | Integration tests only |
| `npm run test:e2e` | End-to-end tests |

---

## 6. Module Development Pattern

Every module follows the same structure. When fleshing out a stub module,
copy this layout:

```
module/
├── controllers/      # Express handlers — parse req, call service, format response
├── services/         # Business logic — orchestrates repos + external services + events
├── repositories/     # Data access — wraps Mongoose models
├── models/           # Mongoose schemas
├── validators/       # Zod schemas for input validation
├── routes/           # Express routers
├── middleware/       # Module-specific middleware (ownership, rate-limit, etc.)
├── interfaces/       # TS interfaces (DTOs, service inputs/outputs)
├── utils/            # Module-only helpers
└── types/            # Module-only types
```

---

## 7. Environment Variables

See `.env.example` for the full list. Critical ones:

- `MONGODB_URI` — MongoDB connection string
- `REDIS_HOST`, `REDIS_PORT` — Redis for cache + queue + pub/sub
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — JWT signing secrets
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` — Razorpay credentials
- `DEFAULT_REFERRER_REWARD`, `DEFAULT_REFEREE_REWARD` — referral reward amounts
- `DEFAULT_DUNING_MAX_RETRIES` — max payment retries before auto-cancel

---

## 8. Project Status

All 17 modules have the full layer stack (`models` → `repositories` → `services` → `controllers` → `routes`) and are mounted with real endpoints, not just health checks. `checkout` and `admin` are the only two with no dedicated model — legitimately so, since neither owns its own collection (checkout orchestrates Cart → Order, admin aggregates other modules' data for a dashboard).

| Module | Status |
|---|---|
| identity | ✅ register/login/logout, JWT refresh, forgot/reset password, email verification, RBAC, refresh token rotation |
| catalog | ✅ products, variants, categories, collections, tags, attributes, full-text search, publish/unpublish, SEO |
| customer | ✅ profile, loyalty tiers, wishlist, saved addresses |
| pricing | ✅ price books (role/seller/category scoped, volume tiers), tax rules, quoting engine used by checkout & order |
| promotion | ✅ campaigns, coupon validation/redemption, automatic/bundle/flash-sale rule types |
| cart | ✅ guest + authenticated carts, coupon/referral application, merge-on-login, 15-min abandonment scan → `cart.abandoned` |
| checkout | ✅ preview + place-order orchestration across cart/pricing/promotion/wallet/inventory/order (no own model) |
| order | ✅ lifecycle (pending→completed), cancel, returns, refunds, invoices, `createFromSubscription()`, timeline tracking |
| payment | ✅ Razorpay order creation + signature verification, wallet, COD, refunds, transaction log, webhook handler |
| wallet | ✅ credits/debits, holds/releases, reversals, auto-creates wallet on signup, event-driven cashback/rewards |
| review | ✅ ratings, moderation queue, seller replies, helpful votes, verified-purchase flag |
| notification | ✅ email/SMS/WhatsApp dispatch via templates, preferences, BullMQ worker (push channel not implemented — no provider wired) |
| analytics | ✅ event tracking, hourly/daily/monthly rollups, BullMQ worker, admin dashboards |
| inventory | ✅ stock, reservations (with TTL expiry), movement ledger, low-stock alerts, event-driven fulfil/release on order ship/cancel |
| admin | ✅ cross-module dashboard (no own model) |
| subscription | ✅ recurring billing via Razorpay Subscriptions, pause/resume/skip/cancel, billing cron, dunning, price lookup via catalog |
| referral | ✅ codes, apply, fraud detection, milestone bonuses, event-driven reward granting |

### Known gaps (by design, not oversight)

- **Shipping** has no module yet — `shippingTotal` is hardcoded to `0` in both `order.service.ts` and `checkout.service.ts` pending a real carrier-rate integration.
- **Push notifications** are not implemented — `notification.service.ts` skips the channel with `status: 'skipped'` since no FCM/APNS provider is configured. Email and SMS/WhatsApp both work (falling back to a console-logging stub transport when no SMTP/Twilio credentials are set).

### Cross-module integrations wired

- `subscription.service.fetchBasePrice()` → `catalogService.getPrice()` ✅
- `subscription.billing.spawnOrder()` → `orderService.createFromSubscription()` ✅
- `checkout.service.placeOrder()` → `pricingService.quote()`, `promotionService`, `walletService`, `inventoryService.reserveStock()`, `orderService.create()` ✅
- `order.service.create()` / `createFromSubscription()` → `pricingService.computeTax()` for per-item tax ✅
- Wallet subscribes to: `user.registered` (auto-create wallet), `referral.redeemed` (credit both parties), `subscription.charged` (2% cashback), `order.completed` (1% cashback), `order.cancelled` (reverse cashback) ✅
- Referral subscribes to: `user.registered` (mark pending), `order.placed` (record first order), `order.completed` (grant reward), `order.cancelled` (reverse reward) ✅
- Inventory subscribes to: `order.shipped` (convert reservation → permanent stock deduction via `fulfillOrder()`), `order.cancelled` (release any reservations still held for that order) ✅
- Order publishes: `order.placed`, `order.shipped`, `order.delivered`, `order.completed`, `order.cancelled`, `order.returned` ✅
- Payment publishes: `payment.success`, `payment.failed`, `payment.refunded` ✅
