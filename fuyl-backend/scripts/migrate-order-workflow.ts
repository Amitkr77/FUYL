import mongoose from 'mongoose';
import { env } from '../src/config/env';

/** Idempotent migration from overlapping fulfilment terms to the canonical flow. */
async function migrate() {
  await mongoose.connect(env.mongo.uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB connection is unavailable');

  const orders = db.collection('orders');
  const mappings = [
    { from: 'packed', to: 'ready_to_ship' },
    { from: 'dispatched', to: 'shipped' },
    { from: 'completed', to: 'delivered' },
  ];
  for (const mapping of mappings) {
    const result = await orders.updateMany(
      { status: mapping.from },
      {
        $set: { status: mapping.to, 'timeline.$[event].status': mapping.to },
      },
      { arrayFilters: [{ 'event.status': mapping.from }] },
    );
    console.log(`[order migration] ${mapping.from} -> ${mapping.to}: ${result.modifiedCount}`);
  }

  // Old RTO/customer-return order statuses belong to their return/shipment
  // workflows. Preserve fulfilment history without extending its progress bar.
  const returned = await orders.updateMany(
    { status: 'returned' },
    { $set: { status: 'closed', closedAt: new Date() } },
  );
  console.log(`[order migration] returned -> closed: ${returned.modifiedCount}`);

  await orders.updateMany({ packedAt: { $exists: true } }, { $rename: { packedAt: 'readyToShipAt' } });
  await orders.updateMany({ completedAt: { $exists: true } }, { $rename: { completedAt: 'closedAt' } });
}

migrate()
  .then(async () => mongoose.disconnect())
  .catch(async (error) => {
    console.error('[order migration] failed', error);
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
  });
