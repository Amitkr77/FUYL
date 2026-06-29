# Fuyl Backend — E-commerce Operating System

TypeScript · Express · MongoDB · Redis · BullMQ · Razorpay · JWT

A modular monolith with **17 modules** covering the full e-commerce lifecycle.
This scaffold ships **two fully-implemented new modules** — `subscription` and
`referral` — plus minimal stubs for the 15 existing modules so the project
boots end-to-end.

---

## 1. Architecture at a Glance

```
src/
├── config/         env, db, redis, queue, scheduler, logger
├── shared/         errors, responses, middleware, services (cache/queue/eventBus/audit), utils, enums
├── modules/        17 feature modules — each with controllers/services/repositories/models/routes
│   ├── identity, customer, catalog, inventory, pricing, promotion, cart,
│   │   checkout, order, payment, wallet, review, notification, analytics, admin   (stubs)
│   ├── subscription/    ← NEW — fully implemented
│   └── referral/        ← NEW — fully implemented
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
- `user.registered` → referral applies code, wallet creates wallet, analytics tracks
- `order.placed` → inventory reserves, referral records firstOrder, analytics tracks
- `order.completed` → referral grants reward, wallet credits cashback, subscription records delivery
- `order.cancelled` → inventory releases, referral reverses reward, wallet debits
- `payment.failed` → subscription enters dunning
- `subscription.charged` → wallet grants cashback, analytics records MRR
- `referral.redeemed` → wallet credits both parties, notification sends confirmations

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

| Module | Status |
|---|---|
| identity | ✅ Fully implemented — register/login/logout, JWT refresh, forgot/reset password, email verification, RBAC, refresh token rotation |
| catalog | ✅ Fully implemented — products, variants, categories, collections, tags, attributes, full-text search, publish/unpublish, SEO |
| wallet | ✅ Fully implemented — credits/debits, holds/releases, reversals, auto-creates wallet on signup, subscribes to referral/subscription/order events for cashback & rewards |
| order | ✅ Fully implemented — lifecycle (pending→completed), cancel, returns, refunds, invoices, `createFromSubscription()` for subscription billing, timeline tracking |
| payment | ✅ Fully implemented — Razorpay order creation + signature verification, wallet, COD, refunds, transaction log, webhook handler |
| subscription | ✅ Fully implemented — recurring billing via Razorpay Subscriptions, pause/resume/skip/cancel, billing cron, dunning, price lookup via catalog |
| referral | ✅ Fully implemented — codes, apply, fraud detection, milestone bonuses, event-driven reward granting |
| customer | 🔨 Stub (model + health route) |
| inventory | 🔨 Stub |
| pricing | 🔨 Stub |
| promotion | 🔨 Stub |
| cart | 🔨 Stub |
| checkout | 🔨 Stub |
| review | 🔨 Stub |
| notification | 🔨 Stub |
| analytics | 🔨 Stub |
| admin | 🔨 Stub |

### Cross-module integrations wired

- `subscription.service.fetchBasePrice()` → `catalogService.getPrice()` ✅
- `subscription.billing.spawnOrder()` → `orderService.createFromSubscription()` ✅
- Wallet subscribes to: `user.registered` (auto-create wallet), `referral.redeemed` (credit both parties), `subscription.charged` (2% cashback), `order.completed` (1% cashback), `order.cancelled` (reverse cashback) ✅
- Referral subscribes to: `user.registered` (mark pending), `order.placed` (record first order), `order.completed` (grant reward), `order.cancelled` (reverse reward) ✅
- Order publishes: `order.placed`, `order.shipped`, `order.delivered`, `order.completed`, `order.cancelled`, `order.returned` ✅
- Payment publishes: `payment.success`, `payment.failed`, `payment.refunded` ✅

To flesh out the remaining stub modules, implement `models/` → `repositories/` → `services/` → `controllers/` → `routes/` following the same pattern used in the implemented modules above.
