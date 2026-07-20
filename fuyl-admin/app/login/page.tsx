"use client";

import { useActionState } from "react";
import { login } from "./actions";
import { Leaf, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#12291F] flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#558476]/10" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[#558476]/10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#558476]/5" />
        </div>

        <div className="relative z-10 text-center max-w-md">
          {/* Logo */}
          {/* <div className="flex items-center justify-center gap-3 mb-12">
            <div className="w-12 h-12 bg-[#558476] rounded-xl flex items-center justify-center">
              <Leaf className="w-7 h-7 text-white" />
            </div>
            <div className="text-left">
              <div className="text-3xl font-bold text-white tracking-widest">FUYL</div>
              <div className="text-xs font-medium text-[#558476] tracking-[0.3em] uppercase">Admin</div>
            </div>
          </div> */}
          <Link href="/" className="inline-flex justify-center mb-12">
            {/* The brand logo is dark forest-green artwork; invert it to white
                so it reads against the dark #12291F panel. */}
            <Image
              src="/images/logo.webp"
              alt="FUYL"
              width={160}
              height={58}
              priority
              className="h-16 w-auto object-contain brightness-0 invert"
            />
          </Link>

          <p className="text-white/60 text-lg leading-relaxed mb-12">
            Manage your FUYL business — products, orders, customers, and content
            — all from one place.
          </p>

          {/* Feature highlights */}
          <div className="space-y-4 text-left">
            {[
              "Real-time order & revenue tracking",
              "Product inventory management",
              "Customer insights & analytics",
              "Content & blog management",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#558476]/20 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-[#558476]" />
                </div>
                <span className="text-white/70 text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tag */}
        <div className="relative z-10 mt-auto flex items-center gap-2 text-white/40 text-xs">
          <ShieldCheck className="w-4 h-4" />
          <span>Secured admin portal </span>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-[#12291F] rounded-xl flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#12291F] tracking-widest">
                FUYL
              </div>
              <div className="text-xs text-[#558476] tracking-[0.3em] uppercase font-medium">
                Admin
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">
              Welcome back
            </h2>
            <p className="text-slate-500">Sign in to your admin account</p>
          </div>

          <form action={formAction} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                defaultValue="admin@fuyl.in"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent transition-all text-sm"
                placeholder="admin@fuyl.in"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="w-full px-4 py-3 pr-12 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent transition-all text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {state?.error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
                <div className="w-4 h-4 rounded-full bg-red-100 flex-shrink-0 flex items-center justify-center">
                  <span className="text-red-600 text-xs font-bold">!</span>
                </div>
                {state.error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 px-4 bg-[#558476] hover:bg-[#457366] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-[#558476] focus:ring-offset-2"
            >
              {isPending ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            Protected admin portal. Unauthorized access is prohibited.
          </p>
        </div>
      </div>
    </div>
  );
}
