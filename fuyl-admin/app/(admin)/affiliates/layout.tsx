import { AffiliateNav } from "@/components/affiliates/AffiliateNav";

export default function AffiliateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Affiliate management</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage affiliate programs, partners, commissions, payouts, and performance.
        </p>
      </header>
      <AffiliateNav />
      {children}
    </div>
  );
}
