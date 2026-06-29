import { CounterModel } from '../models/counter.model';

/**
 * Generate a human-readable sequential number with a prefix and year.
 * e.g. FUL-2026-00001, SUB-2026-00001, RET-2026-00001, INV-2026-00001
 */
export async function nextNumber(prefix: string, year = new Date().getFullYear()): Promise<string> {
  const counter = await CounterModel.findOneAndUpdate(
    { _id: `${prefix}-${year}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const seqPadded = String(counter.seq).padStart(5, '0');
  return `${prefix}-${year}-${seqPadded}`;
}

export async function peekCurrentSeq(prefix: string, year = new Date().getFullYear()): Promise<number> {
  const c = await CounterModel.findById(`${prefix}-${year}`);
  return c?.seq ?? 0;
}
