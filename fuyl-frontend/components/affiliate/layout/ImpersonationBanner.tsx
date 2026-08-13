"use client";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { useAffiliateStore } from "@/lib/store/affiliateStore";
export function ImpersonationBanner(){const active=useAuthStore(s=>s.isAffiliateImpersonation),exit=useAuthStore(s=>s.exitAffiliateImpersonation),router=useRouter();if(!active)return null;return <div className="flex flex-wrap items-center justify-center gap-3 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900"><span>You are viewing the portal as this affiliate. This session is read/write and expires in 15 minutes.</span><button onClick={()=>{exit();useAffiliateStore.getState().clear();router.replace('/')}} className="rounded-md bg-amber-900 px-3 py-1 text-xs font-semibold text-white">Exit affiliate login</button></div>}
