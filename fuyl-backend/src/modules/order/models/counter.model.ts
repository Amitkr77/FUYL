import mongoose, { Schema } from 'mongoose';

/**
 * Generic counter for sequential document numbers.
 * `_id` is the prefix-year key, e.g. "FUL-2026", "SUB-2026", "RET-2026".
 */
export interface ICounter {
  _id: string;
  seq: number;
}

const CounterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0, required: true },
});

export const CounterModel = mongoose.model<ICounter>('Counter', CounterSchema, 'counters');
