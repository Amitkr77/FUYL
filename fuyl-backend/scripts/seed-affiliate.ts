/**
 * Seed script — affiliate module
 *
 * Creates everything needed to test the full affiliate flow end-to-end:
 *   1. Affiliate program (10 % default, 15 % on orders > ₹2000)
 *   2. Test customer account  (customer@fuyl.test / Test@1234)
 *   3. Test affiliate account (affiliate@fuyl.test / Test@1234)
 *   4. Affiliate application  (linked to the affiliate user account)
 *   5. Approval + default tracking link
 *
 * Usage:
 *   npx tsx scripts/seed-affiliate.ts
 *
 * Safe to run multiple times — all operations are idempotent (upsert / skip-if-exists).
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db';
import { logger } from '../src/config/logger';
import { UserModel } from '../src/modules/identity/models/user.model';
import { AffiliateProgramModel } from '../src/modules/affiliate/models/program.model';
import { AffiliateModel } from '../src/modules/affiliate/models/affiliate.model';
import { AffiliateLinkModel } from '../src/modules/affiliate/models/link.model';
import { RoleEnum, AffiliateStatus } from '../src/shared/enums';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function upsertUser(email: string, firstName: string, lastName: string, role: string) {
  const emailLower = email.toLowerCase().trim();
  const existing = await UserModel.findOne({ emailLower });
  if (existing) {
    logger.info(`[seed] user already exists: ${email}`);
    return existing;
  }
  const passwordHash = await bcrypt.hash('Test@1234', 12);
  const user = await UserModel.create({
    email,
    emailLower,
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`,
    passwordHash,
    role,
    isActive: true,
    isEmailVerified: true,
    permissions: [],
  });
  logger.info(`[seed] created user: ${email} (${role})`);
  return user;
}

async function generateUniqueCode(name: string): Promise<string> {
  const base = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5);
  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    const code   = `${base}${suffix}`;
    const exists = await AffiliateLinkModel.findOne({ code });
    if (!exists) return code;
  }
  return `AFF${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  await connectDB();

  // 1 ── Affiliate program ───────────────────────────────────────────────────
  let program = await AffiliateProgramModel.findOne({ isActive: true });
  if (!program) {
    program = await AffiliateProgramModel.create({
      name:                  'Fuyl Affiliate Program',
      description:           'Earn 10 % commission on every referred sale (15 % on orders above ₹2000)',
      isActive:              true,
      defaultRate:           10,
      commissionBase:        'subtotal',
      attributionWindowDays: 30,
      tiers:                 [{ minOrderAmount: 2000, rate: 15 }],
      minPayoutAmount:       500,
      autoApproveAfterDays:  7,
    });
    logger.info(`[seed] created affiliate program: ${program.name} (${program._id})`);
  } else {
    logger.info(`[seed] affiliate program already exists: ${program.name} (${program._id})`);
  }

  // 2 ── Test customer account ───────────────────────────────────────────────
  const customerUser = await upsertUser(
    'customer@fuyl.test',
    'Test',
    'Customer',
    RoleEnum.CUSTOMER,
  );

  // 3 ── Test affiliate user account ─────────────────────────────────────────
  const affiliateUser = await upsertUser(
    'affiliate@fuyl.test',
    'Test',
    'Influencer',
    RoleEnum.CUSTOMER,   // affiliates are regular users with an affiliate profile
  );

  // 4 ── Affiliate application ───────────────────────────────────────────────
  let affiliate = await AffiliateModel.findOne({ email: 'affiliate@fuyl.test' });
  if (!affiliate) {
    affiliate = await AffiliateModel.create({
      name:      'Test Influencer',
      email:     'affiliate@fuyl.test',
      phone:     '9000000001',
      channels:  ['instagram', 'youtube'],
      userId:    affiliateUser._id,
      programId: program._id,
      status:    AffiliateStatus.PENDING,
    });
    logger.info(`[seed] created affiliate application: ${affiliate._id}`);
  } else {
    logger.info(`[seed] affiliate already exists: ${affiliate._id} (${affiliate.status})`);
  }

  // 5 ── Approve + create default link ──────────────────────────────────────
  if (affiliate.status === AffiliateStatus.PENDING) {
    await AffiliateModel.updateOne(
      { _id: affiliate._id },
      { $set: { status: AffiliateStatus.APPROVED, approvedAt: new Date() } }
    );

    const code = await generateUniqueCode(affiliate.name);
    const link = await AffiliateLinkModel.create({
      affiliateId: affiliate._id,
      code,
      destination: '/',
      label:       'Default',
      isActive:    true,
    });

    logger.info(`[seed] approved affiliate — tracking code: ${code}`);
    logger.info(`[seed] tracking link: http://localhost:4000/api/v1/r/${code}`);

    // Re-read for the summary
    affiliate = await AffiliateModel.findById(affiliate._id) as typeof affiliate;

    printSummary({ program, customerUser, affiliateUser, affiliate, code });
  } else {
    // Already approved — find their existing default link
    const link = await AffiliateLinkModel.findOne({ affiliateId: affiliate._id });
    const code = link?.code ?? '(no link found)';
    logger.info(`[seed] affiliate already approved — tracking code: ${code}`);
    printSummary({ program, customerUser, affiliateUser, affiliate, code });
  }

  await disconnectDB();
  process.exit(0);
}

// ─── Summary printer ─────────────────────────────────────────────────────────

function printSummary(ctx: {
  program:       mongoose.Document & { _id: mongoose.Types.ObjectId; name: string; defaultRate: number };
  customerUser:  mongoose.Document & { _id: mongoose.Types.ObjectId; email: string };
  affiliateUser: mongoose.Document & { _id: mongoose.Types.ObjectId; email: string };
  affiliate:     mongoose.Document & { _id: mongoose.Types.ObjectId; status: string } | null;
  code:          string;
}) {
  console.log('\n' + '='.repeat(60));
  console.log('  AFFILIATE SEED COMPLETE');
  console.log('='.repeat(60));

  console.log('\n📦 AFFILIATE PROGRAM');
  console.log(`   ID   : ${ctx.program._id}`);
  console.log(`   Name : ${ctx.program.name}`);
  console.log(`   Rate : ${ctx.program.defaultRate}% (15% on orders >₹2000)`);

  console.log('\n👤 CUSTOMER (for checkout testing)');
  console.log(`   ID       : ${ctx.customerUser._id}`);
  console.log(`   Email    : customer@fuyl.test`);
  console.log(`   Password : Test@1234`);

  console.log('\n🔗 AFFILIATE (approved & linked)');
  console.log(`   Affiliate ID : ${ctx.affiliate?._id ?? 'n/a'}`);
  console.log(`   User ID      : ${ctx.affiliateUser._id}`);
  console.log(`   Email        : affiliate@fuyl.test`);
  console.log(`   Password     : Test@1234`);
  console.log(`   Status       : ${ctx.affiliate?.status}`);

  console.log('\n🔗 TRACKING LINK');
  console.log(`   Code : ${ctx.code}`);
  console.log(`   URL  : http://localhost:4000/api/v1/r/${ctx.code}`);

  console.log('\n🚀 NEXT STEPS');
  console.log('   1. Start the server:  npm run dev');
  console.log(`   2. Hit the link:      curl -v http://localhost:4000/api/v1/r/${ctx.code}`);
  console.log('   3. Copy the aff_token from the Set-Cookie header');
  console.log('   4. Login as customer@fuyl.test and checkout with that cookie');
  console.log('   5. Complete the order → commission auto-created');
  console.log('   6. Approve commission via admin panel or API');
  console.log('='.repeat(60) + '\n');
}

main().catch((err) => {
  console.error('[seed-affiliate] failed:', err);
  process.exit(1);
});
