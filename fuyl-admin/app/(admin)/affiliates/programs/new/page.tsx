import { ProgramForm } from "@/components/affiliates/ProgramForm";
import { listAdminProducts } from "@/lib/products";
export default async function Page(){const products=await listAdminProducts();return <div className="space-y-5"><div><h2 className="text-lg font-semibold">Create affiliate program</h2><p className="text-sm text-slate-500">Define the commission and payout rules for this program.</p></div><ProgramForm products={products.map(p=>({id:p.id,name:p.name}))}/></div>}
