"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Package,
  RotateCcw,
  Wallet as WalletIcon,
  MapPin,
  Heart,
  Pencil,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/lib/store/authStore";
import { updateProfile } from "@/lib/api/account";

const ACCOUNT_LINKS = [
  { label: "Orders", href: "/account/orders", icon: Package },
  { label: "Subscriptions", href: "/account/subscriptions", icon: RotateCcw },
  { label: "Wallet", href: "/account/wallet", icon: WalletIcon },
  { label: "Addresses", href: "/account/addresses", icon: MapPin },
  { label: "Wishlist", href: "/account/wishlist", icon: Heart },
] as const;

type Mode = "login" | "register";

export default function AccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const referralCode = searchParams.get("ref");

  const [mode, setMode] = useState<Mode>(referralCode ? "register" : "login");
  const {
    login,
    register,
    isLoading,
    error,
    clearError,
    user,
    token,
    logout,
    setUser,
  } = useAuthStore();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
  });

  const [isEditing, setEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [isSaving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone ?? "",
      });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!token) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateProfile(token, profileForm);
      setUser(updated);
      setEditing(false);
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to update profile",
      );
    } finally {
      setSaving(false);
    }
  };
  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
      clearError();
      setForm((f) => ({ ...f, [k]: e.target.value }));
    };

  // Bounce back to wherever the user came from (e.g. checkout) once signed in.
  useEffect(() => {
    if (token && user && redirectTo) router.replace(redirectTo);
  }, [token, user, redirectTo, router]);

  const handleSubmit = async () => {
    if (mode === "login") {
      await login(form.email, form.password);
    } else {
      // BUG FIXED (found live-testing): the backend's phone field is
      // `z.string().regex(...).optional()` — `.optional()` only permits
      // `undefined`, not an empty string, so leaving phone blank (the
      // common case, since it's optional in this form) always failed
      // registration with "Validation failed". Omit it entirely when empty.
      await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        phone: form.phone.trim() || undefined,
        referralCode: referralCode ?? undefined,
      });
    }
  };

  // Logged in state
  if (token && user) {
    if (redirectTo) return null; // effect above navigates away

    if (isEditing) {
      return (
        <div className="container-brand section-py max-w-md mx-auto">
          <h1 className="text-display-lg font-display mb-8 text-center text-brand-forest">
            EDIT PROFILE
          </h1>
          <div className="bg-white border border-brand-border rounded-2xl shadow-sm p-6 sm:p-8 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="First Name"
                value={profileForm.firstName}
                onChange={(e) =>
                  setProfileForm((f) => ({ ...f, firstName: e.target.value }))
                }
              />
              <Field
                label="Last Name"
                value={profileForm.lastName}
                onChange={(e) =>
                  setProfileForm((f) => ({ ...f, lastName: e.target.value }))
                }
              />
            </div>
            <Field
              label="Phone"
              value={profileForm.phone}
              onChange={(e) =>
                setProfileForm((f) => ({ ...f, phone: e.target.value }))
              }
              type="tel"
            />

            {saveError && (
              <p className="text-body-xs p-3 rounded-sm bg-red-50 text-red-700">
                {saveError}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                loading={isSaving}
                onClick={handleSaveProfile}
              >
                Save
              </Button>
              <Button
                variant="outline"
                size="lg"
                fullWidth
                onClick={() => {
                  setEditing(false);
                  setSaveError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      );
    }

    const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();

    return (
      <div className="container-brand section-py max-w-lg mx-auto">
        {/* Profile summary */}
        <div className="flex items-center gap-4 bg-brand-cream rounded-2xl p-6 sm:p-8 mb-6">
          <div className="shrink-0 w-14 h-14 rounded-full bg-brand-forest text-white flex items-center justify-center text-body-lg font-display font-bold">
            {initials || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-body-md font-semibold text-brand-forest truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-body-xs text-brand-muted truncate">
              {user.email}
              {user.phone && <> · {user.phone}</>}
            </p>
          </div>
          <button
            onClick={() => setEditing(true)}
            aria-label="Edit profile"
            className="shrink-0 p-2 rounded-full text-brand-olive hover:text-brand-teal hover:bg-white transition-colors"
          >
            <Pencil size={16} />
          </button>
        </div>

        {/* Account links */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {ACCOUNT_LINKS.map(({ label, href, icon: Icon }) => (
            <button
              key={href}
              onClick={() => (window.location.href = href)}
              className="group flex flex-col items-start gap-3 p-4 rounded-xl border border-brand-border bg-white hover:border-brand-teal hover:shadow-sm transition-all text-left"
            >
              <span className="w-10 h-10 rounded-full bg-brand-sage/60 text-brand-forest flex items-center justify-center group-hover:bg-brand-teal group-hover:text-white transition-colors">
                <Icon size={18} />
              </span>
              <span className="flex items-center gap-1 text-body-sm font-semibold text-brand-forest">
                {label}
                <ChevronRight size={14} className="text-brand-muted group-hover:translate-x-0.5 transition-transform" />
              </span>
            </button>
          ))}
        </div>

        {/* Sign out */}
        <button
          onClick={logout}
          className="flex items-center gap-2 text-body-sm font-semibold text-brand-muted hover:text-brand-forest transition-colors border-t border-brand-border w-full pt-5"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="container-brand section-py max-w-md mx-auto">
      <h1 className="text-display-lg font-display mb-8 text-center text-brand-forest">
        {mode === "login" ? "WELCOME BACK" : "CREATE ACCOUNT"}
      </h1>

      <div className="bg-white border border-brand-border rounded-2xl shadow-sm p-6 sm:p-8">
        {/* Toggle */}
        <div className="flex bg-brand-cream rounded-full p-1 mb-6">
          {(["login", "register"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                clearError();
              }}
              className={`flex-1 py-2.5 rounded-full text-label transition-colors ${
                mode === m
                  ? "bg-brand-forest text-white"
                  : "text-brand-muted hover:text-brand-forest"
              }`}
            >
              {m === "login" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {mode === "register" && referralCode && (
            <p className="text-body-xs p-3 rounded-sm bg-brand-cream text-brand-forest">
              Referral code <strong>{referralCode}</strong> will be applied when
              you create your account.
            </p>
          )}
          {mode === "register" && (
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="First Name"
                value={form.firstName}
                onChange={set("firstName")}
              />
              <Field
                label="Last Name"
                value={form.lastName}
                onChange={set("lastName")}
              />
            </div>
          )}
          <Field
            label="Email"
            value={form.email}
            onChange={set("email")}
            type="email"
          />
          <Field
            label="Password"
            value={form.password}
            onChange={set("password")}
            type="password"
          />
          {mode === "register" && (
            <Field
              label="Phone (optional)"
              value={form.phone}
              onChange={set("phone")}
              type="tel"
            />
          )}

          {error && (
            <p className="text-body-xs p-3 rounded-sm bg-red-50 text-red-700">
              {error}
            </p>
          )}

          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={isLoading}
            onClick={handleSubmit}
          >
            {mode === "login" ? "Sign In" : "Create Account"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-label mb-1.5 text-brand-muted">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="w-full h-11 px-3 text-body-sm border border-brand-border rounded-sm outline-none transition-colors focus:border-brand-teal"
      />
    </div>
  );
}
