/**
 * Generates minimal scaffold files for the 15 existing modules.
 * Each module gets:
 *   - models/index.ts (mongoose schema placeholder)
 *   - routes/index.ts (router with a /health endpoint)
 *   - index.ts (barrel export)
 *
 * The subscription + referral modules are already fully implemented
 * and are NOT regenerated here.
 *
 * Usage:  tsx scripts/generate-module-stubs.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const MODULES_ROOT = path.resolve(__dirname, '..', 'src', 'modules');

const modules = [
  { name: 'identity',     collections: ['users', 'roles', 'permissions', 'refresh_tokens'] },
  { name: 'customer',     collections: ['customers', 'addresses'] },
  { name: 'catalog',      collections: ['products', 'variants', 'categories', 'collections', 'tags', 'attributes'] },
  { name: 'inventory',    collections: ['inventories', 'warehouses', 'batches', 'stock_movements'] },
  { name: 'pricing',      collections: ['price_rules', 'tax_rules', 'price_books'] },
  { name: 'promotion',    collections: ['coupons', 'campaigns', 'gift_cards'] },
  { name: 'cart',         collections: ['carts', 'wishlists'] },
  { name: 'checkout',     collections: ['checkout_sessions'] },
  { name: 'order',        collections: ['orders', 'returns', 'refunds', 'invoices'] },
  { name: 'payment',      collections: ['payments', 'transactions'] },
  { name: 'wallet',       collections: ['wallets', 'wallet_transactions'] },
  { name: 'review',       collections: ['reviews', 'ratings'] },
  { name: 'notification', collections: ['notification_logs', 'templates'] },
  { name: 'analytics',    collections: ['analytics_events'] },
  { name: 'admin',        collections: [] },
];

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function write(filePath: string, content: string) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content.trim() + '\n', 'utf8');
}

function pascal(s: string): string {
  return s.replace(/(^|[-_])(\w)/g, (_, __, c) => c.toUpperCase());
}

function generate(module: { name: string; collections: string[] }) {
  const base = path.join(MODULES_ROOT, module.name);
  const ModelName = pascal(module.name);

  // ── models/index.ts ─────────────────────────────────────────────
  if (module.collections.length > 0) {
    const modelDefs = module.collections.map((col) => {
      const Cap = pascal(col);
      return `
export interface I${Cap} extends Document {
  // TODO: add fields for the ${col} collection
  createdAt: Date;
  updatedAt: Date;
}

const ${Cap}Schema = new Schema<I${Cap}>(
  {
    // TODO: define schema for ${col}
  },
  { timestamps: true }
);

export const ${Cap}Model = mongoose.model<I${Cap}>('${Cap}', ${Cap}Schema, '${col}');
`;
    }).join('\n');

    write(path.join(base, 'models', 'index.ts'), `
import mongoose, { Schema, Document } from 'mongoose';
${modelDefs}
`);
  } else {
    write(path.join(base, 'models', 'index.ts'), `
// ${module.name} module has no dedicated collections
export {};
`);
  }

  // ── routes/index.ts ─────────────────────────────────────────────
  write(path.join(base, 'routes', 'index.ts'), `
import { Router } from 'express';
import { authOptional } from '../../../shared/middleware/auth.middleware';

const router = Router();

/**
 * ${module.name} module — placeholder routes.
 * Implement controllers/services/repositories following the same pattern
 * as the subscription and referral modules.
 */
router.get('/${module.name}/health', authOptional, (_req, res) => {
  res.json({ success: true, module: '${module.name}', status: 'scaffold' });
});

export default router;
`);

  // ── index.ts ────────────────────────────────────────────────────
  write(path.join(base, 'index.ts'), `
export * from './models';
export { default as ${module.name}Router } from './routes';
`);

  console.log(`[stub] generated ${module.name}`);
}

console.log(`Generating stubs for ${modules.length} modules...`);
modules.forEach(generate);
console.log('Done.');
