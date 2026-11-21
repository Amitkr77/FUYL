# FUYL Assessment

Standalone, adaptive wellness assessment for **FUYL COMPLETE+**. Users answer a
short, branching questionnaire (one question per screen), see a summary of their
profile, enter their email, and get a personalised report showing which
COMPLETE+ ingredients support their focus areas, plus any safety notes. The
report is also emailed. The only recommendation is the COMPLETE+ product page
on fuyl.in.

- **Rules, not AI.** Recommendations come from a reviewed knowledge base and a
  deterministic engine, so the same answers always give the same result.
- **Own database.** MongoDB, separate from the FUYL store.
- **Data source.** Product and ingredient data are synced from the live Shopify
  storefront at fuyl.in. Doses come from the COMPLETE+ label images.
- **Admin** lives at `/admin` inside this app.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Motion,
Lenis, Mongoose, Zod, Nodemailer (SMTP), Vitest, Playwright.

> Next.js 16 has breaking changes from earlier versions (`proxy.ts` replaces
> middleware, `cookies()` / `params` are async-only, Turbopack by default). Read
> the bundled docs in `node_modules/next/dist/docs/` before changing framework
> code.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in MONGODB_URI and SESSION_SECRET
npm run dev                  # http://localhost:3002
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server on port 3002 |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |
| `npm run dev:db` | Throwaway in-memory MongoDB on `127.0.0.1:27019` (no install or Docker) — point `MONGODB_URI` at it for local testing |
| `npm run sync:preview` | Dry-run the fuyl.in sync without a database |
| `npm run check:env` | Show which settings are present (never values) and test MongoDB + SMTP login |
| `npm run test:e2e` | Build, then run the Playwright suite (in-memory MongoDB, fake fuyl.in, fake SMTP inbox) |

## Admin (`/admin`)

**Sign-in is passwordless:** an admin enters their email and receives a
6-digit one-time code over SMTP (valid 10 minutes, single use, resend after
60 s, voided after 5 wrong guesses; only an HMAC of the code is stored, and
the form answers the same for unknown emails). Create accounts from the
command line or from Admin → Users:

```bash
npm run admin:create -- you@fuyl.in "Your Name" admin      # or: reviewer
```

**Demo mode (local only).** With `DEMO_LOGIN=true` and `DEMO_*` credentials
set, the login page shows "Demo Admin" / "Demo Reviewer" buttons that fill in a
password for demo accounts (create them with `ADMIN_PASSWORD=… npm run
admin:create`). Password sign-in is refused whenever `DEMO_LOGIN` is off —
turn it off before going live.

| Area | What it does |
|---|---|
| Dashboard | Funnel (started → completed → unlocked → clicked to fuyl.in), top focus areas, drop-off by question, safety outcomes, alerts, recent activity |
| Content | Editors for questions (options, scores, flags, show-if conditions via a no-code builder), focus areas, ingredients (doses) and safety rules. Every edit is validated, saved to the **draft**, and marked "needs review". Renaming a key updates every reference |
| Flow simulator | Take the assessment against the draft with scores, flags and safety rules visible |
| Review & publish | Checks (errors block publishing), approvals, draft-vs-live changes, publish with a note, version history with restore |
| fuyl.in sync | Product, ingredient cards, label-image watch ("label changed — review doses"), run history, Sync now |
| Submissions | Search, detail, delete (erasure requests), CSV export (formula-safe) |
| Users / Activity | Manage admins & reviewers; audit log of every sign-in, edit, approval, publish, export and deletion |

**Roles.** Admin: everything. Reviewer: edit and approve content, simulate,
view submissions — cannot publish, delete, export or manage users.

**Publishing.** Users always get the latest *published* version. Publishing
is blocked while the checker reports errors or any item lacks reviewer
approval. Until the first publish, the public assessment stays closed
(`ALLOW_UNPUBLISHED_KB=true` overrides this for local testing only).

**Security.** Emailed one-time codes (no passwords for real accounts); 8-hour
signed session cookie (httpOnly, SameSite=Strict); role, active status and
session version re-checked from the database on every request (deactivating
a user or "Sign out everywhere" ends their sessions instantly); code requests
and failed attempts are limited per IP.

## User flow

`/` welcome + consent → `/q` one question per screen (adaptive) → `/summary`
(edit any answer) → email → staged loader → `/result/[token]` (also emailed).
`/go/[token]` records the product click and redirects to COMPLETE+ on fuyl.in
with UTM tags.

- The server owns the flow: a random session id lives in an httpOnly cookie
  (only its hash is stored); the browser never receives scoring weights,
  flags or branching rules.
- Unfinished sessions expire after 30 days; submissions after 12 months.
- The report email is sent over **SMTP** (nodemailer; TLS required). Without
  `SMTP_HOST` it is skipped and a one-line notice is logged (never the email
  body — it contains health information). Each submission records whether its
  email was sent, skipped or failed (visible in the admin).

Health check: `GET /api/health` returns `{ ok, checks: { db } }`.

## fuyl.in sync

Product and ingredient data come only from the live Shopify store:

| Source | What we take |
|---|---|
| `https://fuyl.in/products/fuyl-complete.json` | Title, URL, prices (Pack of 1 / Pack of 2), images |
| `https://fuyl.in/pages/ingredients` | 45 ingredient cards: name, category, image, "The Ingredient / What It Does / Why It Matters" text |
| Label images `ShopPic-5.png` (blend profile) and `ShopPic-6.png` (nutrition) | **Watched, not parsed.** Doses in `src/kb/ingredients.ts` were transcribed from them; if Shopify replaces either image, the admin is asked to review doses |

- Everything is stored as plain text in this app's database; the app always
  serves the last good copy, so a fuyl.in outage never breaks the assessment.
- Only ingredient **images** are overlaid onto the knowledge base. Names, doses
  and every claim-bearing sentence stay as reviewed in the KB.
- Each source syncs independently; a suspiciously small ingredient list
  (e.g. a maintenance page) is rejected instead of wiping data.

| Command / endpoint | Purpose |
|---|---|
| `npm run sync:preview` | Dry run against live fuyl.in — no database needed |
| `GET/POST /api/cron/sync` with `Authorization: Bearer $CRON_SECRET` | Scheduled sync (run daily). Disabled when `CRON_SECRET` is unset |

## Project layout

```
src/
  app/            routes (user flow, /admin, /api)
  components/
    motion/       ambient background, smooth scroll, scroll reveals
    ui/           shared UI primitives
  engine/         pure assessment engine (conditions, scoring, safety, result)
  kb/             knowledge-base seed (questions, focus areas, ingredients, safety rules)
  models/         Mongoose models
  sync/           fuyl.in product + ingredient sync
  lib/            env, db, utilities
tests/            Vitest unit tests
```

## Design

Minimal glassmorphism over a slowly drifting gradient background, with smooth
scrolling (Lenis) and scroll-triggered reveals (Motion). Every animation
respects `prefers-reduced-motion`.
