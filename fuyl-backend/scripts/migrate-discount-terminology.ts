import mongoose from 'mongoose';
import { env } from '../src/config/env';

/**
 * One-time, idempotent migration for the discount terminology rollout.
 *
 * - promotion_campaigns -> discounts
 * - coupon_redemptions.campaignId -> discountId
 * - role permission promotions:manage -> discounts:manage
 */
async function migrate() {
  await mongoose.connect(env.mongo.uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB connection is unavailable');

  const names = new Set((await db.listCollections().toArray()).map(({ name }) => name));
  const oldCollection = 'promotion_campaigns';
  const newCollection = 'discounts';

  if (names.has(oldCollection) && !names.has(newCollection)) {
    await db.collection(oldCollection).rename(newCollection);
    console.log(`[discount migration] renamed ${oldCollection} -> ${newCollection}`);
  } else if (names.has(oldCollection) && names.has(newCollection)) {
    const oldDocuments = await db.collection(oldCollection).find({}).toArray();
    if (oldDocuments.length) {
      await db.collection(newCollection).bulkWrite(
        oldDocuments.map((document) => ({
          replaceOne: { filter: { _id: document._id }, replacement: document, upsert: true },
        }))
      );
    }
    await db.collection(oldCollection).drop();
    console.log(`[discount migration] merged ${oldDocuments.length} records and removed ${oldCollection}`);
  }

  if ((await db.listCollections({ name: 'coupon_redemptions' }).toArray()).length) {
    const result = await db.collection('coupon_redemptions').updateMany(
      { campaignId: { $exists: true } },
      { $rename: { campaignId: 'discountId' } }
    );
    console.log(`[discount migration] renamed redemption reference on ${result.modifiedCount} records`);
  }

  if ((await db.listCollections({ name: 'roles' }).toArray()).length) {
    const addResult = await db.collection('roles').updateMany(
      { permissions: 'promotions:manage' },
      { $addToSet: { permissions: 'discounts:manage' } }
    );
    await db.collection('roles').updateMany(
      { permissions: 'promotions:manage' },
      { $pull: { permissions: 'promotions:manage' } }
    );
    console.log(`[discount migration] updated ${addResult.modifiedCount} role permission records`);
  }

  if ((await db.listCollections({ name: 'wallet_transactions' }).toArray()).length) {
    const result = await db.collection('wallet_transactions').updateMany(
      { source: 'promotion' },
      { $set: { source: 'discount' } }
    );
    console.log(`[discount migration] updated ${result.modifiedCount} wallet transaction source records`);
  }

  const referralOldCollection = 'referral_campaigns';
  const referralNewCollection = 'referral_programs';
  const refreshedNames = new Set((await db.listCollections().toArray()).map(({ name }) => name));
  if (refreshedNames.has(referralOldCollection) && !refreshedNames.has(referralNewCollection)) {
    await db.collection(referralOldCollection).rename(referralNewCollection);
    console.log(`[discount migration] renamed ${referralOldCollection} -> ${referralNewCollection}`);
  }
  for (const collectionName of ['referral_codes', 'referrals']) {
    if ((await db.listCollections({ name: collectionName }).toArray()).length) {
      const result = await db.collection(collectionName).updateMany(
        { campaignId: { $exists: true } },
        { $rename: { campaignId: 'programId' } }
      );
      console.log(`[discount migration] updated ${result.modifiedCount} ${collectionName} referral references`);
    }
  }
}

migrate()
  .then(async () => { await mongoose.disconnect(); })
  .catch(async (error) => {
    console.error('[discount migration] failed', error);
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
  });
