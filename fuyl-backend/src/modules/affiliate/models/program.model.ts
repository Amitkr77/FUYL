import mongoose, { Schema, Document } from 'mongoose';

export interface ICommissionTier {
  minOrderAmount: number;
  rate: number; // percentage or flat rupee value, depending on commissionType
}

export type AffiliateCommissionType = 'percent_of_sale' | 'flat_per_item' | 'flat_per_order';
export interface ISpecialProductCommission { productId: mongoose.Types.ObjectId; rate: number }
export interface IAdvancedCommissionRule { enabled: boolean; rate: number; couponCode?: string }

export interface IAffiliateProgram extends Document {
  name: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  commissionType: AffiliateCommissionType;
  tierBasis: 'order_value' | 'order_count';
  defaultRate: number;
  // What amount the commission is calculated on
  commissionBase: 'subtotal' | 'grand_total';
  // How long attribution persists in days
  attributionWindowDays: number;
  // Optional tiered rates — if order subtotal exceeds a threshold, use that tier's rate
  tiers: ICommissionTier[];
  specialProductCommissions: ISpecialProductCommission[];
  excludedProductIds: mongoose.Types.ObjectId[];
  excludeProductTax: boolean;
  excludeShipping: boolean;
  advancedCommissions: {
    newCustomer: IAdvancedCommissionRule;
    lifetime: IAdvancedCommissionRule;
    specialCoupon: IAdvancedCommissionRule;
  };
  // Minimum payout threshold in rupees
  minPayoutAmount: number;
  // Days after order completion before a PENDING commission can be approved
  autoApproveAfterDays: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const CommissionTierSchema = new Schema<ICommissionTier>(
  {
    minOrderAmount: { type: Number, required: true, min: 0 },
    rate:           { type: Number, required: true, min: 0 },
  },
  { _id: false }
);
const AdvancedRuleSchema = new Schema<IAdvancedCommissionRule>({ enabled:{type:Boolean,default:false},rate:{type:Number,default:0,min:0},couponCode:{type:String,trim:true,uppercase:true} },{_id:false});

const AffiliateProgramSchema = new Schema<IAffiliateProgram>(
  {
    name:                  { type: String, required: true, trim: true },
    description:           { type: String, trim: true },
    isActive:              { type: Boolean, default: true, index: true },
    isDefault:             { type: Boolean, default: false, index: true },
    commissionType:        { type: String, enum: ['percent_of_sale', 'flat_per_item', 'flat_per_order'], default: 'percent_of_sale' },
    tierBasis:             { type: String, enum: ['order_value', 'order_count'], default: 'order_value' },
    defaultRate:           { type: Number, required: true, min: 0 },
    commissionBase:        { type: String, enum: ['subtotal', 'grand_total'], default: 'subtotal' },
    attributionWindowDays: { type: Number, default: 30, min: 1 },
    tiers:                 { type: [CommissionTierSchema], default: [] },
    specialProductCommissions: { type: [{ productId:{type:Schema.Types.ObjectId,ref:'Product',required:true},rate:{type:Number,required:true,min:0} }], default: [] },
    excludedProductIds:    { type: [{type:Schema.Types.ObjectId,ref:'Product'}], default: [] },
    excludeProductTax:     { type: Boolean, default: true },
    excludeShipping:       { type: Boolean, default: true },
    advancedCommissions:   { type: { newCustomer:{type:AdvancedRuleSchema,default:()=>({})},lifetime:{type:AdvancedRuleSchema,default:()=>({})},specialCoupon:{type:AdvancedRuleSchema,default:()=>({})} }, default:()=>({}) },
    minPayoutAmount:       { type: Number, default: 500, min: 0 },
    autoApproveAfterDays:  { type: Number, default: 7, min: 0 },
    metadata:              { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

AffiliateProgramSchema.index({ isDefault: 1 }, { unique: true, partialFilterExpression: { isDefault: true } });

export const AffiliateProgramModel = mongoose.model<IAffiliateProgram>(
  'AffiliateProgram',
  AffiliateProgramSchema,
  'affiliate_programs'
);
