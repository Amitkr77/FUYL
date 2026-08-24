import mongoose, { Types } from 'mongoose';
import { env } from '../src/config/env';

async function migrate() {
  await mongoose.connect(env.mongo.uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB connection is unavailable');

  const locations = db.collection('warehouse_locations');
  let defaultLocation = await locations.findOne({ isDefault: true });
  if (!defaultLocation) {
    const created = await locations.insertOne({
      name: 'Main Location', code: 'DEFAULT', isActive: true, isDefault: true,
      createdAt: new Date(), updatedAt: new Date(),
    });
    defaultLocation = await locations.findOne({ _id: created.insertedId });
  }
  const code = String(defaultLocation!.code).toUpperCase();
  for (const collectionName of ['inventory_stocks', 'inventory_reservations', 'stock_movements']) {
    const result = await db.collection(collectionName).updateMany(
      { $or: [{ warehouseId: 'default' }, { warehouseId: { $exists: false } }] },
      { $set: { warehouseId: code } },
    );
    console.log(`[inventory migration] ${collectionName} -> ${code}: ${result.modifiedCount}`);
  }

  const owner = await db.collection('inventory_stocks').findOne({}, { projection: { sellerId: 1 } });
  if (!owner?.sellerId) {
    console.log('[inventory migration] no inventory owner found; skipped missing zero-stock rows');
    return;
  }
  const products = await db.collection('products').find({ isDeleted: false }, { projection: { _id: 1 } }).toArray();
  const variants = await db.collection('variants').find({ isActive: true }, { projection: { _id: 1, productId: 1, sku: 1 } }).toArray();
  const variantsByProduct = new Map<string, typeof variants>();
  for (const variant of variants) {
    const key = variant.productId.toString();
    variantsByProduct.set(key, [...(variantsByProduct.get(key) ?? []), variant]);
  }
  const operations = products.flatMap((product) => {
    const productVariants = variantsByProduct.get(product._id.toString()) ?? [];
    const rows = productVariants.length ? productVariants : [{ _id: undefined, sku: undefined }];
    return rows.map((variant) => ({
      updateOne: {
        filter: { productId: product._id, variantId: variant._id ?? null, warehouseId: code },
        update: { $setOnInsert: {
          productId: product._id, ...(variant._id ? { variantId: variant._id } : {}),
          sellerId: new Types.ObjectId(owner.sellerId), warehouseId: code, sku: variant.sku,
          onHand: 0, reserved: 0, available: 0, reorderThreshold: 0, reorderQuantity: 0,
          isPerishable: false, currency: 'INR', createdAt: new Date(), updatedAt: new Date(),
        } },
        upsert: true,
      },
    }));
  });
  if (operations.length) {
    const result = await db.collection('inventory_stocks').bulkWrite(operations);
    console.log(`[inventory migration] backfilled ${result.upsertedCount} missing product/variant rows`);
  }
}

migrate().then(async () => mongoose.disconnect()).catch(async (error) => {
  console.error('[inventory migration] failed', error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
