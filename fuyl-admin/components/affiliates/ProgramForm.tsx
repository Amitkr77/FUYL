"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type { AffiliateProgram, AffiliateProgramInput } from "@/lib/affiliate";
import { saveAffiliateProgramAction } from "@/app/(admin)/affiliates/actions";
import { AffiliateInfoTip } from "./AffiliateInfoTip";
import { Input, Textarea, Select, Checkbox, FormSection } from "@/components/ui/form";

type CType=AffiliateProgram["commissionType"];
function Help({children,text}:{children:React.ReactNode;text:string}){return <span className="inline-flex items-center gap-1.5">{children}<AffiliateInfoTip text={text}/></span>}

export function ProgramForm({program,products=[]}:{program?:AffiliateProgram;products?:{id:string;name:string}[]}){
 const baseCondition=program?.tierBasis==='order_count'?1:0;
 const savedLevels=[...(program?.tiers??[])].sort((a,b)=>a.minOrderAmount-b.minOrderAmount);
 const savedBase=savedLevels.find(level=>level.minOrderAmount===baseCondition);
 const initialLevels=[{minOrderAmount:baseCondition,rate:savedBase?.rate??program?.defaultRate??10},...savedLevels.filter(level=>level.minOrderAmount!==baseCondition)];
 const router=useRouter(),[tiers,setTiers]=useState(initialLevels),[type,setType]=useState<CType>(program?.commissionType??"percent_of_sale"),[tierBasis,setTierBasis]=useState(program?.tierBasis??"order_value");
 const [productRules,setProductRules]=useState(program?.specialProductCommissions??[]),[excluded,setExcluded]=useState(program?.excludedProductIds??[]);
 const [advanced,setAdvanced]=useState(program?.advancedCommissions??{newCustomer:{enabled:false,rate:0},lifetime:{enabled:false,rate:0},specialCoupon:{enabled:false,rate:0,couponCode:""}}),[saving,setSaving]=useState(false),[error,setError]=useState("");
 const percent=type==="percent_of_sale", unit=percent?"%":"₹";
 async function submit(data:FormData){setSaving(true);setError("");const firstLevel=tiers[0]??{minOrderAmount:tierBasis==='order_count'?1:0,rate:0};const input:AffiliateProgramInput={name:String(data.get("name")),description:String(data.get("description")||""),isActive:data.get("isActive")==="on",isDefault:data.get("isDefault")==="on",commissionType:type,tierBasis,defaultRate:firstLevel.rate,commissionBase:"subtotal",tiers,specialProductCommissions:productRules.filter(r=>r.productId),excludedProductIds:excluded,excludeProductTax:true,excludeShipping:true,advancedCommissions:advanced,attributionWindowDays:Number(data.get("attributionWindowDays")),autoApproveAfterDays:Number(data.get("autoApproveAfterDays")),minPayoutAmount:Number(data.get("minPayoutAmount"))};const result=await saveAffiliateProgramAction(program?._id??null,input);setSaving(false);if(result.error)return setError(result.error);router.push("/affiliates/programs");router.refresh()}
 return <form action={submit} className="grid gap-5 xl:grid-cols-[1fr_340px]"><div className="space-y-5">
  <FormSection title="General information"><div className="grid gap-4 sm:grid-cols-2">
   <Input label="Program name" required name="name" defaultValue={program?.name}/>
   <div className="flex items-end gap-5 pb-2">
    <Checkbox label="Active" name="isActive" defaultChecked={program?.isActive??true} description="Inactive programs remain saved but cannot be assigned for new activity."/>
    <Checkbox label="Default" name="isDefault" defaultChecked={program?.isDefault} description="Automatically assigned to new affiliates unless another program is selected."/>
   </div>
   <Textarea label="Description" name="description" rows={3} defaultValue={program?.description} className="sm:col-span-2"/>
  </div></FormSection>

  <FormSection title="Default commission" description="Set a base commission that affiliates earn for every eligible referral."><div className="space-y-4">
   <div><label className="block text-sm font-medium text-slate-700 mb-1.5"><Help text="Choose whether commission levels are based on the current order value or the affiliate's referred-order count.">Rule</Help></label><Select value={tierBasis} onChange={e=>{const next=e.target.value as 'order_value'|'order_count';setTierBasis(next);setTiers(tiers.map((level,index)=>index===0?{...level,minOrderAmount:next==='order_count'?1:0}:level))}} options={[{value:"order_value",label:"Advanced — commissions on order values"},{value:"order_count",label:"Advanced — commissions on number of orders"}]}/></div>
   <div><label className="block text-sm font-medium text-slate-700 mb-1.5"><Help text="Percent pays a share of product value; per item multiplies by quantity; per order pays once.">Type</Help></label><Select value={type} onChange={e=>setType(e.target.value as CType)} options={[{value:"percent_of_sale",label:"Percent of sale"},{value:"flat_per_item",label:"Flat rate per item"},{value:"flat_per_order",label:"Flat rate per order"}]}/></div>
  </div>
   <div className="mt-3 flex justify-between"><h4 className="inline-flex gap-1 text-sm font-semibold">Level <AffiliateInfoTip text="The highest qualifying level supplies the commission value. Level 1 is the base commission."/></h4><button type="button" onClick={()=>{const highest=Math.max(...tiers.map(t=>t.minOrderAmount));setTiers([...tiers,{minOrderAmount:highest+(tierBasis==='order_count'?1:1000),rate:0}])}} className="inline-flex gap-1 text-sm font-medium text-[#315f52]"><Plus className="h-4 w-4"/>Add new level</button></div>
   <div className="mt-3 space-y-3">{tiers.map((t,i)=><div key={i} className="rounded-lg border bg-slate-50"><div className="flex items-center justify-between border-b px-4 py-2"><b className="text-sm">Level {i+1}</b>{i>0&&<button type="button" aria-label="Delete level" onClick={()=>setTiers(tiers.filter((_,n)=>n!==i))} className="text-red-500"><Trash2 className="h-4 w-4"/></button>}</div><div className="grid gap-4 p-4 sm:grid-cols-2">
    <div>
     <label className="block text-sm font-medium text-slate-700 mb-1.5"><Help text={tierBasis==='order_value'?"Minimum eligible product value for this commission level.":"Referral number from which this commission level starts."}>{tierBasis==='order_value'?'Order value condition':'Order number condition'}</Help></label>
     <Input type="number" min={tierBasis==='order_count'?1:0} step={tierBasis==='order_count'?1:.01} readOnly={i===0} value={t.minOrderAmount} onChange={e=>setTiers(tiers.map((x,n)=>n===i?{...x,minOrderAmount:+e.target.value}:x))} suffix={tierBasis==='order_value'?'₹':'#'} className={i===0?'[&_input]:bg-slate-100':''}/>
    </div>
    <div>
     <label className="block text-sm font-medium text-slate-700 mb-1.5"><Help text="Commission paid when this level qualifies.">Commission value</Help></label>
     <Input type="number" min="0" max={percent?100:undefined} step=".01" value={t.rate} onChange={e=>setTiers(tiers.map((x,n)=>n===i?{...x,rate:+e.target.value}:x))} suffix={unit}/>
    </div>
   </div></div>)}</div>
  </FormSection>

  <FormSection title="Special product commission" description="Set a different commission for selected products."><div className="space-y-3">{productRules.map((r,i)=><div key={i} className="grid grid-cols-[1fr_150px_auto] items-end gap-3">
   <Select label="Product" value={r.productId} onChange={e=>setProductRules(productRules.map((x,n)=>n===i?{...x,productId:e.target.value}:x))} options={[{value:"",label:"Select product"},...products.map(p=>({value:p.id,label:p.name}))]}/>
   <Input label={`Commission (${unit})`} type="number" min="0" max={percent?100:undefined} step=".01" value={r.rate} onChange={e=>setProductRules(productRules.map((x,n)=>n===i?{...x,rate:+e.target.value}:x))}/>
   <button type="button" aria-label="Delete product rule" onClick={()=>setProductRules(productRules.filter((_,n)=>n!==i))} className="mb-2 text-red-500"><Trash2 className="h-4 w-4"/></button>
  </div>)}<button type="button" onClick={()=>setProductRules([...productRules,{productId:"",rate:0}])} className="inline-flex gap-1 text-sm font-medium text-[#315f52]"><Plus className="h-4 w-4"/>Add product rate</button></div></FormSection>

  <FormSection title="Exclusions" description="Shipping and product tax are always excluded from affiliate commission."><div><p className="text-sm font-medium">Products that never earn commission</p><div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">{products.map(p=><Checkbox key={p.id} label={p.name} checked={excluded.includes(p.id)} onChange={e=>setExcluded((e.target as HTMLInputElement).checked?[...excluded,p.id]:excluded.filter(id=>id!==p.id))}/>)}{!products.length&&<p className="p-2 text-sm text-slate-400">No products available.</p>}</div></div></FormSection>

  <FormSection title="Advanced commission" description="Use different values when specific conditions are met."><div className="space-y-3">{([['newCustomer','New customer'],['lifetime','Lifetime customer'],['specialCoupon','Special coupon']] as const).map(([key,label])=><div key={key} className="grid items-center gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_140px_1fr]">
   <Checkbox label={label} checked={advanced[key].enabled} onChange={e=>setAdvanced({...advanced,[key]:{...advanced[key],enabled:(e.target as HTMLInputElement).checked}})}/>
   <Input label={`Commission (${unit})`} type="number" min="0" max={percent?100:undefined} step=".01" value={advanced[key].rate} onChange={e=>setAdvanced({...advanced,[key]:{...advanced[key],rate:+e.target.value}})}/>
   {key==="specialCoupon"?<Input label="Coupon code" value={advanced.specialCoupon.couponCode??""} onChange={e=>setAdvanced({...advanced,specialCoupon:{...advanced.specialCoupon,couponCode:e.target.value.toUpperCase()}})}/>:<span/>}
  </div>)}</div></FormSection>

  <FormSection title="Attribution and payouts"><div className="grid gap-4 sm:grid-cols-3">
   <div><label className="block text-sm font-medium text-slate-700 mb-1.5"><Help text="Days after a click during which an order can be attributed.">Attribution window</Help></label><Input required min="1" type="number" name="attributionWindowDays" defaultValue={program?.attributionWindowDays??30}/></div>
   <div><label className="block text-sm font-medium text-slate-700 mb-1.5"><Help text="Delay before commission is eligible for approval.">Approval delay</Help></label><Input required min="0" type="number" name="autoApproveAfterDays" defaultValue={program?.autoApproveAfterDays??7}/></div>
   <div><label className="block text-sm font-medium text-slate-700 mb-1.5"><Help text="Balance required before payout.">Minimum payout</Help></label><Input required min="0" step=".01" type="number" name="minPayoutAmount" defaultValue={program?.minPayoutAmount??500} prefix="₹"/></div>
  </div></FormSection>
 </div><aside><section className="rounded-xl border border-slate-100 bg-white p-5 sticky top-5"><h3 className="font-semibold">Rule summary</h3><ul className="mt-4 space-y-2 text-sm text-slate-600"><li>{type.replaceAll('_',' ')}</li><li>{tiers.length} levels</li><li>{productRules.length} product overrides</li><li>{excluded.length} excluded products</li><li>Historical commissions stay unchanged</li></ul>{error&&<p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-600">{error}</p>}<div className="mt-5 grid gap-2"><button disabled={saving} className="rounded-lg bg-[#558476] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#457366] disabled:opacity-50">{saving?"Saving…":program?"Save changes":"Create program"}</button><button type="button" onClick={()=>router.push('/affiliates/programs')} className="rounded-lg border px-4 py-2.5 text-sm">Cancel</button></div></section></aside></form>
}
