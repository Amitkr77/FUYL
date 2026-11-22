"use client";

import { m, type HTMLMotionProps } from "motion/react";
import clsx from "clsx";

type Props = HTMLMotionProps<"button"> & {
  variant?: "primary" | "glass" | "ghost";
  loading?: boolean;
  size?: "md" | "lg";
};

/** Pill button with a soft press. Primary = forest; glass = frosted. */
export function Button({ variant = "primary", loading, size = "md", className, children, disabled, ...rest }: Props) {
  return (
    <m.button
      whileHover={disabled || loading ? undefined : { y: -1 }}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        "relative inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-[0.01em] transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-45",
        size === "lg" ? "h-14 px-9 text-[15px]" : "h-12 px-7 text-sm",
        variant === "primary" && "bg-forest text-white shadow-[0_12px_30px_-12px_rgba(18,41,31,0.6)] hover:bg-forest-soft",
        variant === "glass" && "glass text-forest hover:bg-white/70",
        variant === "ghost" && "text-teal-deep hover:text-forest",
        className,
      )}
      {...rest}
    >
      <span className={clsx("inline-flex items-center gap-2", loading && "opacity-0")}>{children as React.ReactNode}</span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </span>
      )}
    </m.button>
  );
}
