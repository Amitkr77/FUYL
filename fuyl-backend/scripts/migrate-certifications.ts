/**
 * One-off migration: Product.certifications used to be string[] (plain
 * labels like 'organic', 'fssai'); it's now {label, logoUrl}[] so the
 * storefront certification marquee has real images to render. Converts
 * every existing string entry to {label: <string>, logoUrl: ''} in place.
 *
 * Usage:
 *   npm run migrate-certifications
 */
import { connectDB, disconnectDB } from '../src/config/db';
import { logger } from '../src/config/logger';
import { ProductModel } from '../src/modules/catalog/models/product.model';

async function main() {
  await connectDB();

  const products = await ProductModel.find({ certifications: { $type: 'array' } });
  let migrated = 0;

  for (const product of products) {
    const raw = product.certifications as unknown[];
    if (!raw?.length || typeof raw[0] !== 'string') continue;

    product.certifications = (raw as string[]).map((label) => ({ label, logoUrl: '' }));
    await product.save();
    migrated++;
  }

  logger.info(`[migrate-certifications] converted ${migrated} product(s) from string[] to {label,logoUrl}[]`);

  await disconnectDB();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
