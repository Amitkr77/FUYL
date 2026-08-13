import { notFound } from "next/navigation";
import { ProgramForm } from "@/components/affiliates/ProgramForm";
import { getAffiliateProgram } from "@/lib/affiliate";
import { AdminApiError } from "@/lib/api";
export default async function Page({params}:{params:Promise<{id:string}>}){const{id}=await params;let program;try{program=await getAffiliateProgram(id)}catch(error){if(error instanceof AdminApiError&&error.status===404)notFound();throw error}return <div className="space-y-5"><div><h2 className="text-lg font-semibold">Edit affiliate program</h2><p className="text-sm text-slate-500">Changes apply to new commissions only.</p></div><ProgramForm program={program}/></div>}
