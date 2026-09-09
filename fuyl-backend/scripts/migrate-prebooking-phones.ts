import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { PrebookingLeadModel } from '../src/modules/marketing/models/prebookingLead.model';
import { normalizeIndianMobile } from '../src/modules/marketing/validators';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await mongoose.connect(uri);

  const leads = await PrebookingLeadModel.find({}).sort({ createdAt: 1 });
  const keepers = new Map<string, (typeof leads)[number]>();
  let normalized = 0;
  let merged = 0;

  for (const lead of leads) {
    const phone = normalizeIndianMobile(lead.phone);
    if (typeof phone !== 'string' || !/^\+91[6-9]\d{9}$/.test(phone)) {
      console.warn(`Skipped invalid phone on lead ${lead._id}`);
      continue;
    }
    const keeper = keepers.get(phone);
    if (keeper) {
      // Preserve the newest submitted details on the oldest record, then remove
      // the duplicate so the capacity counter reflects unique people.
      if (lead.submittedAt > keeper.submittedAt) {
        keeper.name = lead.name;
        keeper.source = lead.source;
        keeper.wantsToDonate = lead.wantsToDonate;
        keeper.submittedAt = lead.submittedAt;
        await keeper.save();
      }
      await PrebookingLeadModel.deleteOne({ _id: lead._id });
      merged += 1;
      continue;
    }
    keepers.set(phone, lead);
    lead.phone = phone;
    lead.phoneNormalized = phone;
    await lead.save();
    normalized += 1;
  }

  console.log(`Normalized ${normalized} leads; merged ${merged} duplicate phone records.`);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
