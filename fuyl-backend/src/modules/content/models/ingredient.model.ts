import mongoose, { Schema, Document } from 'mongoose';

export const INGREDIENT_CATEGORIES = [
  'greens', 'berries', 'adaptogens', 'probiotics', 'vitamins', 'omegas', 'enzymes', 'antioxidants',
] as const;

export interface IIngredient extends Document {
  name: string;
  slug: string;
  amount: string;
  benefit: string;
  description: string;
  image: string;
  category: (typeof INGREDIENT_CATEGORIES)[number];
  clinicalBacking?: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const IngredientSchema = new Schema<IIngredient>(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    amount: { type: String, required: true, trim: true, maxlength: 50 },
    benefit: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true },
    image: { type: String, default: '' },
    category: { type: String, enum: INGREDIENT_CATEGORIES, required: true, index: true },
    clinicalBacking: { type: String, maxlength: 500 },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const IngredientModel = mongoose.model<IIngredient>('Ingredient', IngredientSchema, 'ingredients');
