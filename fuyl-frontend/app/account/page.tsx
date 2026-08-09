"use client";

import { Suspense, useEffect, useId, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, Eye, EyeOff, ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/lib/store/authStore";
import { updateProfile, forgotPassword, requestOtp, verifyOtp } from "@/lib/api/account";
import { getErrorMessage } from "@/lib/api/client";

type Mode = "login" | "register" | "forgot";
type LoginMethod = "otp" | "password";
type OtpStep = "request" | "verify";

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
    setSession,
  } = useAuthStore();

  // ─── Profile editing ───────────────────────────────────────────────────────
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

  // Bounce back to wherever the user came from once signed in.
  useEffect(() => {
    if (token && user && redirectTo) router.replace(redirectTo);
  }, [token, user, redirectTo, router]);

  // ─── OTP state ─────────────────────────────────────────────────────────────
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("otp");
  const [otpStep, setOtpStep] = useState<OtpStep>("request");
  const [otpIdentifier, setOtpIdentifier] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpResendCountdown, setOtpResendCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = () => {
    setOtpResendCountdown(60);
    countdownRef.current = setInterval(() => {
      setOtpResendCountdown((n) => {
        if (n <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return n - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  const resetOtpFlow = () => {
    setOtpStep("request");
    setOtpCode("");
    setOtpError(null);
  };

  const handleSwitchLoginMethod = (method: LoginMethod) => {
    setLoginMethod(method);
    resetOtpFlow();
    clearError();
  };

  const handleOtpRequest = async () => {
    if (!otpIdentifier.trim()) return;
    setOtpLoading(true);
    setOtpError(null);
    try {
      await requestOtp(otpIdentifier.trim());
      setOtpStep("verify");
      startCountdown();
    } catch (err: unknown) {
      setOtpError(getErrorMessage(err, "Failed to send OTP. Please try again."));
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpVerify = async () => {
    if (otpCode.length !== 6) return;
    setOtpLoading(true);
    setOtpError(null);
    try {
      const result = await verifyOtp(otpIdentifier.trim(), otpCode);
      setSession(result.accessToken, result.user);
    } catch (err: unknown) {
      setOtpError(getErrorMessage(err, "Invalid OTP. Please try again."));
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpResend = async () => {
    if (otpResendCountdown > 0) return;
    setOtpCode("");
    setOtpError(null);
    setOtpLoading(true);
    try {
      await requestOtp(otpIdentifier.trim());
      startCountdown();
    } catch (err: unknown) {
      setOtpError(getErrorMessage(err, "Failed to resend OTP."));
    } finally {
      setOtpLoading(false);
    }
  };

  // ─── Password login ────────────────────────────────────────────────────────
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

  // ─── Forgot password ───────────────────────────────────────────────────────
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

  // ─── Logged-in view ────────────────────────────────────────────────────────
  if (user) {
    if (redirectTo) return null;

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

  // ─── Forgot password view ──────────────────────────────────────────────────
  if (mode === "forgot") {
    return (
      <div className="section-py max-w-md mx-auto">
        <div className="bg-white border border-brand-border rounded-3xl shadow-xl shadow-brand-forest/5 overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-brand-border/60 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-forest/8 mb-4">
              <ShieldCheck size={22} className="text-brand-forest" />
            </div>
            <h1 className="text-display-md font-display text-brand-forest">RESET PASSWORD</h1>
            <p className="text-body-xs text-brand-muted mt-1">
              We&apos;ll send a reset link to your inbox
            </p>
          </div>

          <div className="p-8">
            {forgotStatus === "sent" ? (
              <div className="text-center space-y-5">
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                  <ShieldCheck size={24} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-body-sm font-semibold text-brand-forest mb-1">Check your inbox</p>
                  <p className="text-body-xs text-brand-muted">
                    If an account exists for <strong className="text-brand-forest">{forgotEmail}</strong>,
                    we&apos;ve sent a reset link to it.
                  </p>
                </div>
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
                onSubmit={(e) => { e.preventDefault(); handleForgotSubmit(); }}
                className="space-y-5"
              >
                <Field
                  label="Email address"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  type="email"
                />

                {forgotStatus === "error" && forgotError && (
                  <p className="text-body-xs p-3 rounded-xl bg-red-50 text-red-700 border border-red-100">
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
                  className="w-full flex items-center justify-center gap-1.5 text-body-xs font-semibold text-brand-muted hover:text-brand-forest transition-colors"
                >
                  <ArrowLeft size={13} />
                  Back to Sign In
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Login / Register view ─────────────────────────────────────────────────
  return (
    <div className="section-py max-w-md mx-auto">
      <div className="bg-white border border-brand-border rounded-3xl shadow-xl shadow-brand-forest/5 overflow-hidden">

        {/* ── Brand header ── */}
        <div className="px-8 pt-8 pb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-forest flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-display font-bold tracking-tight">F</span>
            </div>
            <div>
              <p className="text-display-sm font-display text-brand-forest leading-none">
                {mode === "login" ? "WELCOME BACK" : "JOIN FUYL"}
              </p>
              <p className="text-body-xs text-brand-muted mt-0.5">
                {mode === "login"
                  ? "Sign in to continue your journey"
                  : "Create your account to get started"}
              </p>
            </div>
          </div>

          {/* ── Mode tabs (Sign In / Create Account) ── */}
          <div className="flex border-b border-brand-border/70">
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  clearError();
                  resetOtpFlow();
                }}
                className={`relative flex-1 pb-3 text-label font-semibold transition-colors ${
                  mode === m
                    ? "text-brand-forest"
                    : "text-brand-muted hover:text-brand-forest/70"
                }`}
              >
                {m === "login" ? "Sign In" : "Create Account"}
                {mode === m && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-forest rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Form body ── */}
        <div className="px-8 pb-8">

          {/* ── OTP login flow ── */}
          {mode === "login" && loginMethod === "otp" && (
            <>
              {otpStep === "request" ? (
                <form
                  onSubmit={(e) => { e.preventDefault(); handleOtpRequest(); }}
                  className="space-y-5"
                >
                  <PremiumField
                    label="Email or Phone"
                    required
                    value={otpIdentifier}
                    onChange={(e) => {
                      setOtpIdentifier(e.target.value);
                      setOtpError(null);
                    }}
                    type="text"
                    autoComplete="email"
                    placeholder="Enter your email or phone number"
                  />

                  {otpError && <ErrorMessage>{otpError}</ErrorMessage>}

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={otpLoading}
                    disabled={!otpIdentifier.trim()}
                  >
                    Send OTP
                  </Button>

                  <p className="text-body-xs text-brand-muted text-center">
                    Prefer password?{" "}
                    <button
                      type="button"
                      onClick={() => handleSwitchLoginMethod("password")}
                      className="font-semibold text-brand-teal hover:text-brand-forest transition-colors"
                    >
                      Sign in with password
                    </button>
                  </p>
                </form>
              ) : (
                /* ── OTP verify step ── */
                <div className="space-y-5">
                  {/* Identifier badge */}
                  <div className="flex items-center gap-2 p-3 bg-brand-cream/60 rounded-xl border border-brand-border/60">
                    <button
                      type="button"
                      onClick={resetOtpFlow}
                      className="p-1 rounded-lg hover:bg-brand-sage/40 text-brand-muted hover:text-brand-forest transition-colors shrink-0"
                      aria-label="Change identifier"
                    >
                      <ArrowLeft size={14} />
                    </button>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted mb-0.5">
                        Code sent to
                      </p>
                      <p className="text-body-xs font-semibold text-brand-forest truncate">
                        {otpIdentifier}
                      </p>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-body-sm text-brand-muted">
                      Enter the 6-digit verification code
                    </p>
                  </div>

                  <OtpCodeInput
                    value={otpCode}
                    onChange={setOtpCode}
                    onComplete={handleOtpVerify}
                    disabled={otpLoading}
                  />

                  {otpError && <ErrorMessage>{otpError}</ErrorMessage>}

                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={otpLoading}
                    disabled={otpCode.length !== 6}
                    onClick={handleOtpVerify}
                  >
                    Verify &amp; Sign In
                  </Button>

                  <div className="text-center">
                    {otpResendCountdown > 0 ? (
                      <p className="text-body-xs text-brand-muted">
                        Resend code in{" "}
                        <span className="font-semibold text-brand-forest tabular-nums">
                          {otpResendCountdown}s
                        </span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleOtpResend}
                        disabled={otpLoading}
                        className="text-body-xs font-semibold text-brand-teal hover:text-brand-forest transition-colors disabled:opacity-50"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Password login / Register form ── */}
          {(mode === "register" || (mode === "login" && loginMethod === "password")) && (
            <form
              onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
              className="space-y-5"
            >
              {mode === "register" && referralCode && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-brand-cream border border-brand-border/60">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-teal shrink-0" />
                  <p className="text-body-xs text-brand-forest">
                    Referral code <strong>{referralCode}</strong> will be applied
                  </p>
                </div>
              )}

              {mode === "register" && (
                <div className="grid grid-cols-2 gap-3">
                  <PremiumField
                    label="First Name"
                    required
                    value={form.firstName}
                    onChange={set("firstName")}
                    autoComplete="given-name"
                    placeholder="First"
                  />
                  <PremiumField
                    label="Last Name"
                    required
                    value={form.lastName}
                    onChange={set("lastName")}
                    autoComplete="family-name"
                    placeholder="Last"
                  />
                </div>
              )}

              <PremiumField
                label="Email address"
                required
                value={form.email}
                onChange={set("email")}
                type="email"
                autoComplete="email"
                placeholder="your@email.com"
              />

              <PremiumField
                label="Password"
                required
                value={form.password}
                onChange={set("password")}
                type="password"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                placeholder={mode === "register" ? "Create a password" : "Enter your password"}
              />

              {mode === "login" && (
                <div className="-mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(form.email);
                      setForgotStatus("idle");
                      setForgotError(null);
                      clearError();
                      setMode("forgot");
                    }}
                    className="text-body-xs font-semibold text-brand-teal hover:text-brand-forest transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {mode === "register" && (
                <PremiumField
                  label="Phone (optional)"
                  value={form.phone}
                  onChange={set("phone")}
                  type="tel"
                  autoComplete="tel"
                  placeholder="+91 00000 00000"
                />
              )}

              {error && <ErrorMessage>{error}</ErrorMessage>}

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

              {mode === "login" && (
                <p className="text-body-xs text-brand-muted text-center">
                  Prefer OTP?{" "}
                  <button
                    type="button"
                    onClick={() => handleSwitchLoginMethod("otp")}
                    className="font-semibold text-brand-teal hover:text-brand-forest transition-colors"
                  >
                    Sign in with OTP
                  </button>
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 6-digit OTP input ─────────────────────────────────────────────────────
function OtpCodeInput({
  value,
  onChange,
  onComplete,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete: () => void;
  disabled?: boolean;
}) {
  const boxes = Array.from({ length: 6 });
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (i: number, char: string) => {
    const digit = char.replace(/\D/, "").slice(-1);
    const next = value.split("");
    next[i] = digit;
    const updated = next.join("").padEnd(6, " ").slice(0, 6).trimEnd();
    onChange(updated.replace(/ /g, ""));
    if (digit && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!value[i] && i > 0) {
        refs.current[i - 1]?.focus();
        const next = value.split("");
        next[i - 1] = "";
        onChange(next.join(""));
      }
    } else if (e.key === "Enter" && value.length === 6) {
      onComplete();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
      {boxes.map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          className={`w-11 h-14 text-center text-body-lg font-bold border-2 rounded-xl outline-none transition-all disabled:opacity-40 ${
            value[i]
              ? "border-brand-forest bg-brand-forest/5 text-brand-forest"
              : "border-brand-border bg-brand-cream/40 text-brand-forest focus:border-brand-teal focus:bg-white focus:ring-4 focus:ring-brand-teal/10"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Premium field (for login/register) ────────────────────────────────────
function PremiumField({
  label,
  value,
  onChange,
  type = "text",
  required,
  autoComplete,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
}) {
  const fieldId = `field-${useId()}`;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  return (
    <div>
      <label htmlFor={fieldId} className="block text-[11px] font-semibold uppercase tracking-wider text-brand-muted/80 mb-1.5">
        {label}{required && <span className="text-brand-teal ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          id={fieldId}
          type={isPassword ? (showPassword ? "text" : "password") : type}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={`w-full h-12 px-4 text-body-sm bg-brand-cream/40 border border-brand-border rounded-xl outline-none transition-all placeholder:text-brand-muted/40 focus:bg-white focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10 ${
            isPassword ? "pr-11" : ""
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-muted/60 hover:text-brand-forest transition-colors"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Shared field component (for profile edit / forgot) ────────────────────
function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  const fieldId = `field-${useId()}`;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  return (
    <div>
      <label
        htmlFor={fieldId}
        className="block text-label mb-1.5 text-brand-muted"
      >
        {label}
        {required && <span className="text-brand-teal"> *</span>}
      </label>
      <div className="relative">
        <input
          id={fieldId}
          type={isPassword ? (showPassword ? "text" : "password") : type}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          className={`w-full h-11 px-3 text-body-sm border border-brand-border rounded-sm outline-none transition-colors focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/30 ${
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

// ─── Error message ──────────────────────────────────────────────────────────
function ErrorMessage({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-body-xs p-3 rounded-xl bg-red-50 text-red-700 border border-red-100">
      {children}
    </p>
  );
}
