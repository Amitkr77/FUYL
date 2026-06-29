# FUYL Frontend

Next.js 16 · Tailwind CSS v4 · TypeScript · Zustand

Built by Kynyx Solutions for FUYL (fuyl.in)  
Architecture: multi-tenancy-forward, decoupled from Node backend

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local — set NEXT_PUBLIC_API_URL to your Node backend URL

# 3. Run dev server
npm run dev
# → http://localhost:3000

# 4. Production build
npm run build && npm start
```

---

## Stack

| Concern         | Tool |
|-----------------|------|
| Framework       | Next.js 16 — App Router |
| Language        | TypeScript 5 |
| Styling         | Tailwind CSS v4 — tokens in `styles/globals.css` |
| State           | Zustand (cart + auth) with localStorage persistence |
| Animations      | CSS keyframes (marquee, fade-up) + `useIntersection` scroll reveals |
| Icons           | lucide-react |
| Fonts           | Barlow Condensed (display) + Inter (body) via Google Fonts CDN |

---

## Project Structure

```
app/
  (shop)/          → commerce: /products/[slug], /collections/[slug], /cart
  (content)/       → brand: /pages/why-fuyl, /science, /ingredients, /learn, /our-story, /contact
  (legal)/         → policies: shipping, returns, privacy, terms
  account/         → login, register, orders
  api/revalidate/  → POST webhook for ISR invalidation from backend

components/
  layout/          → Header, Footer, AnnouncementBar, CartDrawer, MegaMenu
  home/            → 12 homepage sections
  product/         → PDP: Gallery, Info, Tabs, Badges, Reviews
  collection/      → ProductCard, CollectionGrid
  cart/            → CartLineItem, CartSummary, CartEmpty
  content/         → SciencePillar, IngredientCard, BlogPostCard, LegalPage
  ui/              → Button, Badge, Accordion, Drawer, ScrollReveal, Countdown

lib/
  api/             → Typed fetch functions → Node backend
  hooks/           → useCart, useCountdown, useIntersection, useMediaQuery
  store/           → Zustand: cartStore, authStore
  constants/       → site.ts, nav.ts
  utils/           → cn, formatPrice, seo
```

---

## Backend API Contract

The frontend expects a Node backend at `NEXT_PUBLIC_API_URL` exposing:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET    | `/products/:slug` | Product detail |
| GET    | `/products` | Product listing |
| GET    | `/collections/:slug` | Collection + products |
| POST   | `/cart` | Create cart |
| POST   | `/cart/:id/items` | Add item |
| PATCH  | `/cart/:id/items/:lineId` | Update qty |
| DELETE | `/cart/:id/items/:lineId` | Remove item |
| POST   | `/cart/:id/checkout` | Get Razorpay checkout URL |
| POST   | `/auth/login` | Login → `{ token, user }` |
| POST   | `/auth/register` | Register → `{ token, user }` |
| GET    | `/account/profile` | Auth'd user profile |
| GET    | `/account/orders` | Auth'd order history |
| GET    | `/pages/:slug` | CMS page content |
| GET    | `/posts` | Blog listing |
| GET    | `/posts/:slug` | Blog post |
| POST   | `/newsletter/subscribe` | Email subscribe |
| POST   | `/contact` | Contact form submission |
| POST   | `/api/revalidate` | ISR invalidation webhook |

---

## Phase Status

- ✅ Phase 1 — Shell: layout, tokens, types, API layer, Zustand stores, UI primitives
- ✅ Phase 2 — Commerce: PDP, collection, cart page, account, cart drawer
- ✅ Phase 3 — Homepage: all 12 sections
- ✅ Phase 4 — Content: why-fuyl, science, ingredients (16 cards), learn, our-story, contact, legal pages, 404
- ⬜ Phase 5 — Analytics: GA4 events, Meta Pixel (ATC, purchase, page_view)
- ⬜ Phase 6 — Polish: Lighthouse audit, Core Web Vitals, a11y pass

---

## Deployment (Vercel)

1. Push to GitHub
2. Import into Vercel
3. Set environment variables (from `.env.example`)
4. Deploy — `npm run build` runs automatically

For ISR: configure your Node backend to `POST /api/revalidate` with `{ secret, path }` whenever products or content are updated.
