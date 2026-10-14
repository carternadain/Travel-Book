"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform, type HTMLMotionProps } from "motion/react";

export const EASE = [0.16, 1, 0.3, 1] as const;

/** Fades + lifts children into view as you scroll. */
export function Reveal({
  children,
  delay = 0,
  className = "",
  ...rest
}: { children: React.ReactNode; delay?: number; className?: string } & HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.8, ease: EASE, delay }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
export const rise = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: EASE } },
};

/** A number that counts to its new value. */
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const mv = useMotionValue(value * 0.6);
  const text = useTransform(mv, (v) => format(v));
  useEffect(() => {
    const c = animate(mv, value, { duration: 1.1, ease: EASE });
    return () => c.stop();
  }, [value, mv]);
  return <motion.span className="tabular-nums">{text}</motion.span>;
}

export function Eyebrow({ children, jp, className = "" }: { children: React.ReactNode; jp?: string; className?: string }) {
  return (
    <p className={`flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-accent-ink ${className}`}>
      {jp ? (
        <span lang="ja" aria-hidden className="jp text-[15px] font-bold normal-case tracking-[0.1em]">
          {jp}
        </span>
      ) : null}
      <motion.span
        aria-hidden
        className="h-px w-6 origin-left bg-current opacity-60"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
      />
      <span>{children}</span>
    </p>
  );
}

export function Chip({
  on,
  children,
  onClick,
  className = "",
}: {
  on: boolean;
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      aria-pressed={on}
      className={`relative inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors duration-200 ${
        on ? "border-txt bg-txt text-bg" : "border-edge bg-panel text-dim hover:border-edge2 hover:text-txt"
      } ${className}`}
    >
      {children}
    </motion.button>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...rest
}: { variant?: "primary" | "ghost" | "soft" } & HTMLMotionProps<"button">) {
  const styles = {
    primary: "bg-accent text-on-accent shadow-card hover:brightness-110",
    soft: "bg-panel2 text-txt hover:bg-edge",
    ghost: "border border-edge bg-panel text-txt hover:border-edge2",
  }[variant];
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-[filter,background-color,border-color] disabled:opacity-50 ${styles} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

/** A passport-style stamp for places you've been. */
export function Stamp({ label = "Visited", className = "" }: { label?: string; className?: string }) {
  return (
    <motion.span
      initial={{ scale: 2.2, opacity: 0, rotate: -30 }}
      animate={{ scale: 1, opacity: 1, rotate: -12 }}
      transition={{ type: "spring", stiffness: 380, damping: 16 }}
      className={`inline-flex items-center rounded-md border-2 border-current px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.2em] ${className}`}
    >
      {label}
    </motion.span>
  );
}
