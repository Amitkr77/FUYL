"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

/** Match bar that fills when scrolled into view. */
export function MatchBar({ value, label }: { value: number; label: string }) {
  const reduce = useReducedMotion();
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-forest/10"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-teal to-forest"
          initial={{ width: reduce ? `${value}%` : "0%" }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        />
      </div>
      <span className="w-10 text-right text-xs tabular-nums text-muted">{value}%</span>
    </div>
  );
}

/** Headline that reveals word by word. */
export function WordReveal({ text, className, accent }: { text: string; className?: string; accent?: string }) {
  const reduce = useReducedMotion();
  return (
    <h1 className={className} aria-label={text}>
      {text.split(" ").map((w, i) => (
        <motion.span
          key={i}
          aria-hidden
          initial={reduce ? false : { opacity: 0, y: 22, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.15 + i * 0.09, ease: [0.22, 1, 0.36, 1] }}
          className={`inline-block ${accent && w.replace(/[^\p{L}]/gu, "") === accent ? "italic text-teal" : ""}`}
        >
          {w}&nbsp;
        </motion.span>
      ))}
    </h1>
  );
}

/** Product image with a gentle scroll parallax. */
export function ParallaxImage({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [40, -40]);
  const rotate = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-3, 3]);
  return (
    <div ref={ref} className="relative aspect-square w-full overflow-hidden rounded-3xl bg-gradient-to-br from-sage/70 to-cream">
      <motion.div style={{ y, rotate }} className="absolute inset-6">
        <Image src={src} alt={alt} fill sizes="(min-width: 768px) 360px, 80vw" className="object-contain drop-shadow-2xl" />
      </motion.div>
    </div>
  );
}

/** Staggered list that reveals children as it enters the viewport. */
export function Stagger({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.ul
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
    >
      {children}
    </motion.ul>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.li
      className={className}
      variants={{ hidden: { opacity: 0, y: 14, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } }}
    >
      {children}
    </motion.li>
  );
}
