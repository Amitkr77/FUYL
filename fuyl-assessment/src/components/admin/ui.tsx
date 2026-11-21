import clsx from "clsx";

/** Plain, fast admin primitives — same palette as the app, no heavy effects. */

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl text-forest sm:text-4xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className, title, actions }: { children: React.ReactNode; className?: string; title?: string; actions?: React.ReactNode }) {
  return (
    <section className={clsx("rounded-2xl border border-line/60 bg-white p-5 shadow-[0_1px_2px_rgba(18,41,31,0.04)] sm:p-6", className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold text-forest">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

const TONES = {
  neutral: "bg-cream text-muted",
  good: "bg-sage text-forest",
  warn: "bg-[#fdf0e3] text-[#9a5a1c]",
  bad: "bg-[#fde8e4] text-[#a3301e]",
  info: "bg-[#e6f0ec] text-teal-deep",
} as const;

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: keyof typeof TONES }) {
  return <span className={clsx("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", TONES[tone])}>{children}</span>;
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line/60 bg-white p-5">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-forest">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export const btn = (variant: "primary" | "secondary" | "danger" | "ghost" = "secondary", size: "sm" | "md" = "md") =>
  clsx(
    "inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
    variant === "primary" && "bg-forest text-white hover:bg-forest-soft",
    variant === "secondary" && "border border-line bg-white text-forest hover:bg-cream",
    variant === "danger" && "border border-[#f2c9c1] bg-white text-[#a3301e] hover:bg-[#fde8e4]",
    variant === "ghost" && "text-teal-deep hover:bg-cream",
  );

export const inputCls =
  "w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-forest outline-none transition-colors placeholder:text-muted/50 focus:border-teal focus:ring-2 focus:ring-teal/15 aria-[invalid=true]:border-[#d9725f]";

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={clsx("block", className)}>
      <span className="mb-1 block text-xs font-medium text-forest">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-[#a3301e]">{error}</span> : hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">{children}</p>;
}

export const fmtDate = (d: Date | string | undefined | null) =>
  d ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(d)) : "—";
