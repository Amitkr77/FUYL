import mongoose,{Schema,Document}from'mongoose';
export interface IStorefrontSection extends Document{key:string;title:string;isActive:boolean;data:Record<string,unknown>;createdAt:Date;updatedAt:Date}
const schema=new Schema<IStorefrontSection>({key:{type:String,required:true,unique:true,index:true},title:{type:String,required:true},isActive:{type:Boolean,default:true},data:{type:Schema.Types.Mixed,default:{}}},{timestamps:true});
export const StorefrontSectionModel=mongoose.model<IStorefrontSection>('StorefrontSection',schema,'storefront_sections');
