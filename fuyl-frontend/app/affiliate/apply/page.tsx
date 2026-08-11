"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle } from "lucide-react";
import { applyAffiliate } from "@/lib/api/affiliate";
import { getErrorMessage } from "@/lib/api/client";

const BENEFITS = [
  {
    label: "Commission type",
    value: "Percent of sale",
  },
  {
    label: "Commission amount",
    value: "10–15% per order (tiered by volume)",
  },
  {
    label: "Additional terms",
    value:
      "You will earn a commission on every successful referral sale whenever a customer purchases through your affiliate link.",
  },
];

export default function AffiliateApplyPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const setField =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
    if (!name || !form.email.trim()) return;
    setLoading(true);
    setError("");
    try {
      await applyAffiliate({
        name,
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        channels: [],
      });
      setDone(true);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Could not submit your application. Please try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div
        className="flex"
        style={{ minHeight: "calc(100vh - var(--header-height, 64px))" }}
      >
        {/* Left panel — success */}
        <div className="hidden lg:flex flex-col items-center justify-center bg-brand-sage w-[42%] shrink-0 px-12 py-16 text-center">
          <Image
            src="/logo.webp"
            alt="FUYL"
            width={210}
            height={44}
            className="mb-8 object-contain"
          />
          <p className="text-label tracking-[0.3em] text-brand-muted mb-6">
            LONGER · STRONGER · YOU
          </p>
          <h1 className="text-display-lg font-display text-brand-forest">
            BECOME OUR465
            <br />
            AMBASSADOR
          </h1>
          <div className="mt-5 w-28 border-b-2 border-dashed border-brand-teal/50" />
        </div>

        {/* Right panel — confirmation */}
        <div className="flex-1 flex flex-col items-center justify-center bg-white px-8 py-16 text-center">
          <CheckCircle className="w-14 h-14 text-brand-teal mb-6" />
          <h2 className="text-display-lg font-display text-brand-forest mb-3">
            APPLICATION RECEIVED
          </h2>
          <p className="text-body-md text-brand-muted max-w-sm">
            Thank you for applying! We review applications within 2–3 business
            days and will reach out to{" "}
            <strong className="text-brand-forest">{form.email}</strong> with our
            decision.
          </p>
          <Link
            href="/"
            className="mt-8 inline-block px-8 py-3 bg-brand-forest text-white text-label tracking-[0.15em] uppercase hover:bg-brand-olive transition-colors"
          >
            Back to Store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex"
      style={{ minHeight: "calc(100vh - var(--header-height, 64px))" }}
    >
      {/* ── Left brand panel ── */}
      <div className="hidden lg:flex flex-col items-center justify-center bg-brand-sage w-[42%] shrink-0 px-12 py-16 text-center">
        <Image
          src="/logo.webp"
          alt="FUYL"
          width={110}
          height={44}
          className="mb-8 object-contain"
        />
        <p className="text-label tracking-[0.3em] text-brand-muted mb-6">
          LONGER · STRONGER · YOU
        </p>
        <h1 className="text-display-xl font-display text-brand-forest">
          BECOME OUR
          <br />
          AMBASSADOR
        </h1>
        <div className="mt-5 w-28 border-b-2 border-dashed border-brand-teal/50" />
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col bg-white overflow-y-auto">
        {/* Top bar */}
        <div className="flex items-center justify-end px-8 pt-6">
          <Link
            href="/account"
            className="px-5 py-2 text-label tracking-wider text-brand-forest border border-brand-forest rounded-full hover:bg-brand-forest hover:text-white transition-colors"
          >
            Login
          </Link>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 py-10 w-full max-w-[520px] mx-auto">
          {/* Right panel logo (mobile only — hidden on desktop where left panel already shows it) */}
          <Image
            src="/logo.webp"
            alt="FUYL"
            width={72}
            height={28}
            className="mb-5 object-contain lg:hidden"
          />

          <h2 className="text-[11px] font-bold tracking-[0.28em] uppercase text-brand-forest text-center mb-8">
            JOIN OUR AFFILIATE PROGRAM
          </h2>

          {/* Benefits table */}
          <div className="w-full mb-8 border border-brand-border divide-y divide-brand-border">
            {BENEFITS.map((b) => (
              <div
                key={b.label}
                className="grid grid-cols-[1fr_1.4fr] gap-4 px-4 py-3 items-start"
              >
                <span className="text-body-xs text-brand-muted">{b.label}</span>
                <div className="flex items-start gap-2">
                  <span className="text-brand-teal shrink-0 text-[13px] leading-tight mt-px">
                    ✓
                  </span>
                  <span className="text-body-xs text-brand-forest">
                    {b.value}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Application form */}
          <form onSubmit={handleSubmit} className="w-full space-y-6">
            <div className="grid grid-cols-2 gap-5">
              <LineField
                label="First Name"
                required
                value={form.firstName}
                onChange={setField("firstName")}
              />
              <LineField
                label="Last Name"
                required
                value={form.lastName}
                onChange={setField("lastName")}
              />
            </div>
            <LineField
              label="Phone"
              type="tel"
              value={form.phone}
              onChange={setField("phone")}
            />
            <LineField
              label="Email"
              required
              type="email"
              value={form.email}
              onChange={setField("email")}
            />

            {error && <p className="text-body-xs text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading || !form.firstName.trim() || !form.email.trim()}
              className="w-full py-4 bg-brand-forest text-white text-label tracking-[0.22em] uppercase transition-colors hover:bg-brand-olive disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Submitting…" : "JOIN"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function LineField({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  required?: boolean;
  type?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold tracking-[0.18em] uppercase text-brand-muted mb-2">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full py-2 bg-transparent border-b border-brand-border outline-none text-body-sm text-brand-forest transition-colors focus:border-brand-forest placeholder:text-brand-muted/30"
      />
    </div>
  );
}
