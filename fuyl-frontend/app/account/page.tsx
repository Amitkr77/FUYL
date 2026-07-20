"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/lib/store/authStore";
import { updateProfile, forgotPassword } from "@/lib/api/account";
import { getErrorMessage } from "@/lib/api/client";

type Mode = "login" | "register" | "forgot";

export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <AccountPageContent />
    </Suspense>
  );
}

function AccountPageContent() {
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

  const profileComplete = Boolean(
    profileForm.firstName.trim() && profileForm.lastName.trim(),
  );

  const handleSaveProfile = async () => {
    if (!token || !profileComplete) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateProfile(token, profileForm);
      setUser(updated);
      setEditing(false);
    } catch (err: unknown) {
      setSaveError(getErrorMessage(err, "Failed to update profile"));
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

  const loginComplete = Boolean(form.email.trim() && form.password);
  const registerComplete = Boolean(
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.trim() &&
    form.password,
  );
  const submitComplete = mode === "login" ? loginComplete : registerComplete;

  const handleSubmit = async () => {
    if (!submitComplete) return;
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

  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState<
    "idle" | "loading" | "sent" | "error"
  >("idle");
  const [forgotError, setForgotError] = useState<string | null>(null);
  const forgotComplete = Boolean(forgotEmail.trim());

  const handleForgotSubmit = async () => {
    if (!forgotComplete) return;
    setForgotStatus("loading");
    setForgotError(null);
    try {
      await forgotPassword(forgotEmail.trim());
      setForgotStatus("sent");
    } catch (err) {
      setForgotError(
        getErrorMessage(err, "Something went wrong. Please try again."),
      );
      setForgotStatus("error");
    }
  };

  // Logged in state — keyed on `user` (persisted), not the access token, which
  // is re-minted from the refresh cookie shortly after a reload. Gating on
  // token here would briefly show the login form to an already-signed-in user.
  if (user) {
    if (redirectTo) return null; // effect above navigates away

    if (isEditing) {
      return (
        <div className="max-w-md">
          <h1 className="text-display-lg font-display mb-8 text-brand-forest">
            EDIT PROFILE
          </h1>
          <div className="bg-white border border-brand-border rounded-2xl shadow-sm p-6 sm:p-8 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="First Name"
                required
                value={profileForm.firstName}
                onChange={(e) =>
                  setProfileForm((f) => ({ ...f, firstName: e.target.value }))
                }
              />
              <Field
                label="Last Name"
                required
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
                disabled={!profileComplete}
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

    return (
      <div className="max-w-md">
        <h1 className="text-display-lg font-display mb-8 text-brand-forest">
          MY PROFILE
        </h1>
        <div className="bg-white border border-brand-border rounded-2xl shadow-sm p-6 sm:p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-label text-brand-muted mb-1">Name</p>
              <p className="text-body-md font-semibold text-brand-forest">
                {user.firstName} {user.lastName}
              </p>
            </div>
            <button
              onClick={() => setEditing(true)}
              aria-label="Edit profile"
              className="shrink-0 p-2 rounded-full text-brand-olive hover:text-brand-teal hover:bg-brand-sage/40 transition-colors"
            >
              <Pencil size={16} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-label text-brand-muted mb-1">Email</p>
              <p className="text-body-sm text-brand-forest">{user.email}</p>
            </div>
            <div>
              <p className="text-label text-brand-muted mb-1">Phone</p>
              <p className="text-body-sm text-brand-forest">
                {user.phone || "—"}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "forgot") {
    return (
      <div className="container-brand section-py max-w-md mx-auto">
        <h1 className="text-display-lg font-display mb-8 text-center text-brand-forest">
          RESET PASSWORD
        </h1>

        <div className="bg-white border border-brand-border rounded-2xl shadow-sm p-6 sm:p-8">
          {forgotStatus === "sent" ? (
            <div className="text-center space-y-4">
              <p className="text-body-sm text-brand-forest">
                If an account exists for <strong>{forgotEmail}</strong>,
                we&apos;ve sent a password reset link to it. Check your inbox.
              </p>
              <Button
                variant="outline"
                size="lg"
                fullWidth
                onClick={() => {
                  setMode("login");
                  setForgotStatus("idle");
                }}
              >
                Back to Sign In
              </Button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleForgotSubmit();
              }}
              className="space-y-4"
            >
              <p className="text-body-sm text-brand-muted">
                Enter the email on your account and we&apos;ll send you a link
                to reset your password.
              </p>
              <Field
                label="Email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                type="email"
              />

              {forgotStatus === "error" && forgotError && (
                <p className="text-body-xs p-3 rounded-sm bg-red-50 text-red-700">
                  {forgotError}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={forgotStatus === "loading"}
                disabled={!forgotComplete}
              >
                Send Reset Link
              </Button>
              <button
                type="button"
                onClick={() => setMode("login")}
                className="w-full text-center text-body-xs font-semibold text-brand-muted hover:text-brand-forest transition-colors"
              >
                Back to Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className=" section-py max-w-xl mx-auto">
      <h1 className="text-display-lg font-display mb-8 text-center text-brand-forest">
        {mode === "login" ? "WELCOME BACK" : "CREATE ACCOUNT"}
      </h1>

      <div className="bg-white border border-brand-border rounded-2xl shadow-sm p-6 sm:p-8">
        {/* Toggle */}
        <div className="flex bg-brand-cream rounded-full p-1 mb-6">
          {(["login", "register"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
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

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-4"
        >
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
                required
                value={form.firstName}
                onChange={set("firstName")}
              />
              <Field
                label="Last Name"
                required
                value={form.lastName}
                onChange={set("lastName")}
              />
            </div>
          )}
          <Field
            label="Email"
            required
            value={form.email}
            onChange={set("email")}
            type="email"
          />
          <Field
            label="Password"
            required
            value={form.password}
            onChange={set("password")}
            type="password"
          />
          {mode === "login" && (
            <button
              type="button"
              onClick={() => {
                setForgotEmail(form.email);
                setForgotStatus("idle");
                setForgotError(null);
                clearError();
                setMode("forgot");
              }}
              className="block ml-auto text-body-xs font-semibold text-brand-teal hover:text-brand-forest transition-colors -mt-2"
            >
              Forgot password?
            </button>
          )}
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
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={isLoading}
            disabled={!submitComplete}
          >
            {mode === "login" ? "Sign In" : "Create Account"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  return (
    <div>
      <label className="block text-label mb-1.5 text-brand-muted">
        {label}
        {required && <span className="text-brand-teal"> *</span>}
      </label>
      <div className="relative">
        <input
          type={isPassword ? (showPassword ? "text" : "password") : type}
          value={value}
          onChange={onChange}
          required={required}
          className={`w-full h-11 px-3 text-body-sm border border-brand-border rounded-sm outline-none transition-colors focus:border-brand-teal ${
            isPassword ? "pr-10" : ""
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-forest transition-colors"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}
