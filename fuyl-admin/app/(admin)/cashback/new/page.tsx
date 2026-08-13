import { PolicyForm } from "@/components/cashback/PolicyForm";

export default function NewCashbackPolicyPage() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">New Cashback</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Configure rules for rewarding customers with wallet cashback.
        </p>
      </div>
      <PolicyForm />
    </div>
  );
}
