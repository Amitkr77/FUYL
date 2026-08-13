"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, UserCheck, Loader2 } from "lucide-react";
import { CashbackPolicy, CreatePolicyInput, AllowedUser } from "@/lib/cashback";
import { createPolicyAction, updatePolicyAction, searchCustomersAction } from "@/app/(admin)/discounts-cashback/cashback/actions";

interface Props {
  policy?: CashbackPolicy;
}

export function PolicyForm({ policy }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  // ─── Customer targeting ───────────────────────────────────────────────────
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>(
    policy?.allowedUsers ?? []
  );
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<AllowedUser[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState<CreatePolicyInput>({
    name:            policy?.name ?? "",
    description:     policy?.description ?? "",
    mode:            policy?.mode ?? "standalone",
    couponCode:      policy?.couponCode ?? "",
    type:            policy?.type ?? "percentage",
    value:           policy?.value ?? 5,
    maxCap:          policy?.maxCap,
    minOrderAmount:  policy?.minOrderAmount,
    scope:           policy?.scope ?? "all",
    creditTiming:    policy?.creditTiming ?? "on_delivery",
    creditAfterDays: policy?.creditAfterDays,
    expiryDays:      policy?.expiryDays ?? 90,
    isActive:        policy?.isActive ?? true,
    startDate:       policy?.startDate ? policy.startDate.slice(0, 16) : "",
    endDate:         policy?.endDate   ? policy.endDate.slice(0, 16)   : "",
    maxUsesPerUser:  policy?.maxUsesPerUser ?? 0,
    totalBudget:     policy?.totalBudget ?? 0,
  });

  function set<K extends keyof CreatePolicyInput>(key: K, value: CreatePolicyInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleUserSearch(q: string) {
    setUserQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setUserResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchCustomersAction(q.trim());
        setUserResults(results.filter((r) => !allowedUsers.some((u) => u.id === r.id)));
      } finally {
        setSearching(false);
      }
    }, 350);
  }

  function addUser(user: AllowedUser) {
    setAllowedUsers((prev) => prev.some((u) => u.id === user.id) ? prev : [...prev, user]);
    setUserQuery("");
    setUserResults([]);
  }

  function removeUser(id: string) {
    setAllowedUsers((prev) => prev.filter((u) => u.id !== id));
  }

  function buildBody(): CreatePolicyInput {
    return {
      ...form,
      value:           Number(form.value),
      maxCap:          form.maxCap          ? Number(form.maxCap)          : undefined,
      minOrderAmount:  form.minOrderAmount  ? Number(form.minOrderAmount)  : undefined,
      expiryDays:      Number(form.expiryDays ?? 90),
      maxUsesPerUser:  Number(form.maxUsesPerUser ?? 0),
      totalBudget:     Number(form.totalBudget ?? 0),
      creditAfterDays: form.creditTiming === "after_days" ? Number(form.creditAfterDays) : undefined,
      couponCode:      form.mode === "attached" ? (form.couponCode ?? "").toUpperCase() : undefined,
      startDate:       form.startDate || undefined,
      endDate:         form.endDate   || undefined,
      allowedUserIds:  allowedUsers.map((u) => u.id),
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const body = buildBody();
      if (policy) {
        const result = await updatePolicyAction(policy.id, body);
        if ("error" in result) {
          setError(result.error);
        } else {
          router.push("/discounts-cashback?tab=cashback");
          router.refresh();
        }
      } else {
        const result = await createPolicyAction(body);
        if (result && "error" in result) setError(result.error);
        // On success, createPolicyAction calls redirect() server-side
      }
    });
  }

  const inputCls = "w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#558476]/30 focus:border-[#558476]";
  const labelCls = "block text-xs font-medium text-slate-600 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Basic info */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-800">Basic Info</h3>
        <div>
          <label className={labelCls}>Name *</label>
          <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="e.g. 5% Weekend Cashback" />
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <textarea className={inputCls} rows={2} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="Optional internal note" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Mode *</label>
            <select className={inputCls} value={form.mode} onChange={(e) => set("mode", e.target.value as any)} disabled={!!policy}>
              <option value="standalone">Standalone</option>
              <option value="attached">Attached to coupon</option>
            </select>
          </div>
          {form.mode === "attached" && (
            <div>
              <label className={labelCls}>Coupon Code *</label>
              <input className={`${inputCls} uppercase`} value={form.couponCode ?? ""} onChange={(e) => set("couponCode", e.target.value.toUpperCase())} required placeholder="SAVE20" />
            </div>
          )}
        </div>
      </div>

      {/* Cashback value */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-800">Cashback Value</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Type *</label>
            <select className={inputCls} value={form.type} onChange={(e) => set("type", e.target.value as any)}>
              <option value="percentage">Percentage (%)</option>
              <option value="flat">Flat amount (₹)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>{form.type === "percentage" ? "Percentage *" : "Amount (₹) *"}</label>
            <input type="number" step="0.01" min="0" className={inputCls} value={form.value} onChange={(e) => set("value", Number(e.target.value))} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Max cap (₹)</label>
            <input type="number" step="0.01" min="0" className={inputCls} value={form.maxCap ?? ""} onChange={(e) => set("maxCap", e.target.value ? Number(e.target.value) : undefined)} placeholder="No cap" />
          </div>
          <div>
            <label className={labelCls}>Min order amount (₹)</label>
            <input type="number" step="0.01" min="0" className={inputCls} value={form.minOrderAmount ?? ""} onChange={(e) => set("minOrderAmount", e.target.value ? Number(e.target.value) : undefined)} placeholder="No minimum" />
          </div>
        </div>
      </div>

      {/* Credit timing */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-800">Credit Timing</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Credit when *</label>
            <select className={inputCls} value={form.creditTiming} onChange={(e) => set("creditTiming", e.target.value as any)}>
              <option value="on_order">Immediately on order</option>
              <option value="on_delivery">On delivery</option>
              <option value="after_days">After N days</option>
            </select>
          </div>
          {form.creditTiming === "after_days" && (
            <div>
              <label className={labelCls}>Days after order *</label>
              <input type="number" min="1" className={inputCls} value={form.creditAfterDays ?? ""} onChange={(e) => set("creditAfterDays", Number(e.target.value))} required placeholder="e.g. 7" />
            </div>
          )}
          <div>
            <label className={labelCls}>Credit expires after (days) *</label>
            <input type="number" min="1" className={inputCls} value={form.expiryDays ?? 90} onChange={(e) => set("expiryDays", Number(e.target.value))} required />
          </div>
        </div>
      </div>

      {/* Limits */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-800">Limits &amp; Schedule</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Max uses per user (0 = unlimited)</label>
            <input type="number" min="0" className={inputCls} value={form.maxUsesPerUser ?? 0} onChange={(e) => set("maxUsesPerUser", Number(e.target.value))} />
          </div>
          <div>
            <label className={labelCls}>Total budget ₹ (0 = unlimited)</label>
            <input type="number" min="0" className={inputCls} value={form.totalBudget ?? 0} onChange={(e) => set("totalBudget", Number(e.target.value))} />
          </div>
          <div>
            <label className={labelCls}>Start date &amp; time</label>
            <input type="datetime-local" className={inputCls} value={form.startDate ?? ""} onChange={(e) => set("startDate", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>End date &amp; time</label>
            <input type="datetime-local" className={inputCls} value={form.endDate ?? ""} onChange={(e) => set("endDate", e.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="isActive" checked={form.isActive ?? true} onChange={(e) => set("isActive", e.target.checked)} className="accent-[#558476]" />
          <label htmlFor="isActive" className="text-sm text-slate-700">Active</label>
        </div>
      </div>

      {/* Customer Targeting */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-[#558476]" />
          <h3 className="text-sm font-semibold text-slate-800">Customer Targeting</h3>
          {allowedUsers.length > 0 && (
            <span className="ml-auto text-xs font-medium bg-[#558476]/10 text-[#558476] px-2 py-0.5 rounded-full">
              {allowedUsers.length} customer{allowedUsers.length !== 1 ? "s" : ""} targeted
            </span>
          )}
        </div>

        <p className="text-xs text-slate-500">
          {allowedUsers.length === 0
            ? "This policy applies to all customers. Search below to target specific customers only."
            : "Only the customers listed below will receive this cashback when they order."}
        </p>

        {/* Search input */}
        <div className="relative">
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-[#558476]/30 focus-within:border-[#558476]">
            {searching
              ? <Loader2 className="w-4 h-4 text-slate-400 shrink-0 animate-spin" />
              : <Search className="w-4 h-4 text-slate-400 shrink-0" />}
            <input
              type="text"
              value={userQuery}
              onChange={(e) => handleUserSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="flex-1 text-sm outline-none bg-transparent"
            />
            {userQuery && (
              <button type="button" onClick={() => { setUserQuery(""); setUserResults([]); }}>
                <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>

          {/* Dropdown results */}
          {userResults.length > 0 && (
            <ul className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
              {userResults.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => addUser(u)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#558476]/10 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-[#558476]">
                        {u.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{u.name}</p>
                      <p className="text-xs text-slate-500 truncate">{u.email}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {userQuery.trim() && !searching && userResults.length === 0 && (
            <p className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-2.5 text-sm text-slate-400">
              No customers found
            </p>
          )}
        </div>

        {/* Selected users list */}
        {allowedUsers.length > 0 && (
          <ul className="space-y-1.5">
            {allowedUsers.map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="w-7 h-7 rounded-full bg-[#558476]/10 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-[#558476]">
                    {u.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{u.name}</p>
                  <p className="text-xs text-slate-500 truncate">{u.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeUser(u.id)}
                  className="shrink-0 p-1 text-slate-400 hover:text-red-500 transition-colors"
                  aria-label={`Remove ${u.name}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="px-6 py-2.5 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
        >
          {pending ? "Saving…" : policy ? "Save Changes" : "Create Policy"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
