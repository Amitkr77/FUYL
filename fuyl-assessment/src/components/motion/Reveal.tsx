"use client";

import { m, useReducedMotion, type HTMLMotionProps } from "motion/react";

type RevealProps = HTMLMotionProps<"div"> & {
  /** Seconds to wait after the element enters the viewport. */
  delay?: number;
  /** Distance (px) the element rises from. */
  y?: number;
};

/**
 * Scroll-triggered fade-and-rise. Fires once when ~20% of the element is in
 * view. Under reduced motion it renders statically.
 */
export function Reveal({ delay = 0, y = 28, children, ...rest }: RevealProps) {
  const reduce = useReducedMotion();
  if (reduce) return <m.div {...rest}>{children}</m.div>;

  return (
    <m.div
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </m.div>
  );
}
