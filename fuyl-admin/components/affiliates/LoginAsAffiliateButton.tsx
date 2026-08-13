"use client";
import { useState } from "react";
import { LogIn } from "lucide-react";
import { createAffiliateImpersonationAction } from "@/app/(admin)/affiliates/actions";
export function LoginAsAffiliateButton({id,disabled}:{id:string;disabled?:boolean}){const[busy,setBusy]=useState(false),[error,setError]=useState("");async function login(){setBusy(true);setError("");const r=await createAffiliateImpersonationAction(id);setBusy(false);if(r.error)return setError(r.error);if(r.url)window.open(r.url,'_blank','noopener,noreferrer')}return <div><button disabled={disabled||busy} onClick={login} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><LogIn className="h-4 w-4"/>{busy?'Preparing…':'Login as affiliate'}</button>{error&&<p className="mt-1 text-xs text-red-600">{error}</p>}</div>}
