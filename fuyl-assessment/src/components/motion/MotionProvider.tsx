"use client";

import { LazyMotion, domAnimation } from "motion/react";

/**
 * Loads only the animation features the app uses (animations, exit
 * transitions, hover/tap, in-view) once, instead of the full Motion bundle in
 * every component. `strict` makes any accidental full `motion.*` import an
 * error, so the bundle can't silently grow back.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}
