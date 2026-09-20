import mongoose,{Schema,Document} from 'mongoose';
export interface IAffiliateImpersonation extends Document{tokenHash:string;affiliateId:mongoose.Types.ObjectId;adminUserId:mongoose.Types.ObjectId;expiresAt:Date;usedAt?:Date;createdAt:Date;updatedAt:Date}
const schema=new Schema<IAffiliateImpersonation>({tokenHash:{type:String,required:true,unique:true},affiliateId:{type:Schema.Types.ObjectId,ref:'Affiliate',required:true,index:true},adminUserId:{type:Schema.Types.ObjectId,ref:'User',required:true},expiresAt:{type:Date,required:true},usedAt:{type:Date}},{timestamps:true});
schema.index({expiresAt:1},{name:'affiliate_impersonation_expiry_ttl',expireAfterSeconds:0});
export const AffiliateImpersonationModel=mongoose.model<IAffiliateImpersonation>('AffiliateImpersonation',schema,'affiliate_impersonations');
