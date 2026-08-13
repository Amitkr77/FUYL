"use client";
import Link from "next/link";
import { useState } from "react";
import { Star, Trash2, Pencil } from "lucide-react";
import { deleteAffiliateProgramAction, setDefaultAffiliateProgramAction } from "@/app/(admin)/affiliates/actions";
export function ProgramActions({ id, isDefault }: { id: string; isDefault: boolean }) {
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  async function run(action:()=>Promise<{error?:string}>) { setBusy(true); setError(""); const result=await action(); setBusy(false); if(result.error)setError(result.error); }
  return <div><div className="flex items-center gap-2"><Link href={`/affiliates/programs/${id}`} title="Edit" className="rounded-lg border p-2 text-slate-500 hover:bg-slate-50"><Pencil className="h-4 w-4" /></Link>{!isDefault&&<button disabled={busy} title="Make default" onClick={()=>run(()=>setDefaultAffiliateProgramAction(id))} className="rounded-lg border p-2 text-amber-600 hover:bg-amber-50"><Star className="h-4 w-4" /></button>}{!isDefault&&<button disabled={busy} title="Delete" onClick={()=>{if(confirm("Delete this affiliate program?"))void run(()=>deleteAffiliateProgramAction(id))}} className="rounded-lg border p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>}</div>{error&&<p className="mt-1 max-w-52 text-xs text-red-600">{error}</p>}</div>;
}
