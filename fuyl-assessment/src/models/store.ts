import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Local copies of data synced from fuyl.in, plus the sync log. The app always
 * reads from these copies, so a fuyl.in outage never breaks the assessment —
 * it just serves the last good sync.
 */

// ─── Product (one document per handle) ──────────────────────────────────────

const VariantSchema = new Schema(
  { title: String, price: Number, compareAtPrice: Number, available: Boolean },
  { _id: false },
);
const ImageSchema = new Schema({ src: String, alt: String, file: String, position: Number }, { _id: false });

const StoreProductSchema = new Schema(
  {
    handle: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    url: { type: String, required: true },
    description: { type: String, default: "" },
    priceFrom: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    variants: { type: [VariantSchema], default: [] },
    images: { type: [ImageSchema], default: [] },
    syncedAt: { type: Date, required: true },
  },
  { timestamps: true, collection: "store_products" },
);

// ─── Ingredient cards from /pages/ingredients ──────────────────────────────

const PointSchema = new Schema({ heading: String, text: String }, { _id: false });

const StoreIngredientSchema = new Schema(
  {
    title: { type: String, required: true, unique: true },
    category: { type: String, default: "" },
    image: String,
    about: { type: String, default: "" },
    whatItDoes: { type: [PointSchema], default: [] },
    whyItMatters: { type: String, default: "" },
    /** Knowledge-base ingredient keys this card maps to (empty = unmatched). */
    matchedKeys: { type: [String], default: [], index: true },
    /** False once the card disappears from fuyl.in (kept for history). */
    active: { type: Boolean, default: true },
    syncedAt: { type: Date, required: true },
  },
  { timestamps: true, collection: "store_ingredients" },
);

// ─── Sync log ───────────────────────────────────────────────────────────────

const LabelCheckSchema = new Schema(
  { file: String, label: String, status: String, currentSrc: String, acknowledgedSrc: String },
  { _id: false },
);

const SyncRunSchema = new Schema(
  {
    trigger: { type: String, enum: ["cron", "admin", "script"], required: true },
    status: { type: String, enum: ["success", "partial", "failed"], required: true },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, required: true },
    product: { ok: Boolean, error: String, priceFrom: Number },
    ingredients: { ok: Boolean, error: String, count: Number, unmatched: [String], removed: [String] },
    labels: { type: [LabelCheckSchema], default: [] },
    labelReviewNeeded: { type: Boolean, default: false },
  },
  { collection: "sync_runs" },
);
SyncRunSchema.index({ startedAt: -1 });

// ─── Sync state (singleton): label versions an admin has confirmed ─────────

const SyncStateSchema = new Schema(
  {
    _id: { type: String, default: "singleton" },
    /** Label image versions an admin confirmed. (A list, not a map: file names contain dots, which MongoDB keys can't.) */
    acknowledgedLabels: { type: [new Schema({ file: String, src: String }, { _id: false })], default: [] },
    labelReviewNeeded: { type: Boolean, default: false },
    lastSuccessAt: Date,
  },
  { timestamps: true, collection: "sync_state" },
);

export type StoreProductDoc = InferSchemaType<typeof StoreProductSchema>;
export type StoreIngredientDoc = InferSchemaType<typeof StoreIngredientSchema>;
export type SyncRunDoc = InferSchemaType<typeof SyncRunSchema>;
export type SyncStateDoc = InferSchemaType<typeof SyncStateSchema>;

// Re-use compiled models across dev hot reloads.
const model = <T>(name: string, schema: Schema): Model<T> =>
  (mongoose.models[name] as Model<T>) ?? mongoose.model<T>(name, schema);

export const StoreProduct = model<StoreProductDoc>("StoreProduct", StoreProductSchema);
export const StoreIngredient = model<StoreIngredientDoc>("StoreIngredient", StoreIngredientSchema);
export const SyncRun = model<SyncRunDoc>("SyncRun", SyncRunSchema);
export const SyncState = model<SyncStateDoc>("SyncState", SyncStateSchema);
