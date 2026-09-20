export default function AffiliateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-slate-900">Affiliate Management</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage affiliate programs, partners, commissions, payouts, and performance.
        </p>
      </header>
      {children}
    </div>
  );
}
