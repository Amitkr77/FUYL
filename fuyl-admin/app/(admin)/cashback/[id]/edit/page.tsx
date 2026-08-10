import { notFound } from "next/navigation";
import { PolicyForm } from "@/components/cashback/PolicyForm";
import { getCashbackPolicy } from "@/lib/cashback";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditCashbackPolicyPage({ params }: Props) {
  const { id } = await params;
  const policy = await getCashbackPolicy(id);
  if (!policy) notFound();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Edit Policy</h2>
        <p className="text-sm text-slate-500 mt-0.5">{policy.name}</p>
      </div>
      <PolicyForm policy={policy} />
    </div>
  );
}
