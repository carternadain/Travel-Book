"use client";

import { useEffect, useId, useState } from "react";
import { motion } from "motion/react";
import { EASE } from "./ui";

/**
 * 青海波 Seigaiha — overlapping wave scales. Strokes use currentColor and each
 * scale is filled with the page background, so it reads correctly in both themes.
 */
export function Seigaiha({ className = "", size = 40 }: { className?: string; size?: number }) {
  const id = useId().replace(/:/g, "");
  const r = size / 2;
  const scale = (cx: number, cy: number) =>
    [1, 0.75, 0.5, 0.25].map((k) => (
      <circle key={`${cx}-${cy}-${k}`} cx={cx} cy={cy} r={r * k} fill="var(--bg)" stroke="currentColor" strokeWidth={1} />
    ));
  return (
    <svg className={`pointer-events-none ${className}`} aria-hidden width="100%" height="100%">
      <defs>
        <pattern id={id} width={size} height={r} patternUnits="userSpaceOnUse">
          {scale(0, 0)}
          {scale(size, 0)}
          {scale(r, r / 2)}
          {scale(0, r)}
          {scale(size, r)}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** 判子 Hanko — a vermilion name seal. */
export function Hanko({ char = "旅", className = "", size = 28 }: { char?: string; className?: string; size?: number }) {
  return (
    <span
      aria-hidden
      className={`jp relative grid shrink-0 place-items-center rounded-[7px] bg-accent font-bold text-on-accent shadow-[inset_0_0_0_2px_color-mix(in_oklab,var(--on-accent)_35%,transparent)] ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.58, letterSpacing: 0, transform: "rotate(-4deg)" }}
    >
      {char}
    </span>
  );
}

/** 円相 Ensō — a single brush circle that paints itself in. */
export function Enso({ className = "", delay = 0.4 }: { className?: string; delay?: number }) {
  return (
    <svg viewBox="0 0 200 200" className={`pointer-events-none ${className}`} aria-hidden fill="none">
      <motion.path
        d="M118 22 C 62 12, 18 58, 24 110 C 30 160, 82 186, 128 176 C 170 166, 190 124, 180 84 C 172 52, 146 30, 112 28"
        stroke="currentColor"
        strokeLinecap="round"
        initial={{ pathLength: 0, strokeWidth: 9, opacity: 0 }}
        animate={{ pathLength: 0.94, strokeWidth: [9, 7, 3], opacity: 1 }}
        transition={{ duration: 2.2, ease: EASE, delay }}
      />
    </svg>
  );
}

/** A brush stroke that draws under a word when it scrolls into view. */
export function InkStroke({ className = "", delay = 0.6 }: { className?: string; delay?: number }) {
  return (
    <svg viewBox="0 0 300 20" preserveAspectRatio="none" className={`pointer-events-none ${className}`} aria-hidden fill="none">
      <motion.path
        d="M4 13 C 60 6, 140 4, 210 8 C 245 10, 275 12, 296 9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={5}
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.1, ease: EASE, delay }}
      />
    </svg>
  );
}

type Season = "sakura" | "hotaru" | "momiji" | "yuki";
export function seasonOf(month: number): Season {
  if (month >= 3 && month <= 5) return "sakura";
  if (month >= 6 && month <= 8) return "hotaru";
  if (month >= 9 && month <= 11) return "momiji";
  return "yuki";
}
export const SEASON_LABEL: Record<Season, { jp: string; en: string }> = {
  sakura: { jp: "桜", en: "cherry-blossom season" },
  hotaru: { jp: "蛍", en: "firefly season" },
  momiji: { jp: "紅葉", en: "maple season" },
  yuki: { jp: "雪", en: "snow season" },
};

const PETAL = "M12 2c3 3 5 7 4 11-1 4-4 7-4 9 0-2-3-5-4-9-1-4 1-8 4-11z";
const LEAF =
  "M12 1l2 5 4-2-1 5 5 0-4 4 3 3-6 0 1 6-4-4-4 4 1-6-6 0 3-3-4-4 5 0-1-5 4 2z";

/**
 * Drifting seasonal particles: sakura petals in spring, fireflies in summer,
 * maple leaves in autumn, snow in winter. Off for reduced-motion users.
 */
export function SeasonalParticles({ count = 14, className = "" }: { count?: number; className?: string }) {
  const [state, setState] = useState<{ season: Season; items: number[][] } | null>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const season = seasonOf(new Date().getMonth() + 1);
    // [left %, size, duration, delay, drift, sway, hue-pick]
    const items = Array.from({ length: count }, () => [
      Math.random() * 100,
      8 + Math.random() * 12,
      11 + Math.random() * 10,
      -Math.random() * 20,
      -40 + Math.random() * 140,
      10 + Math.random() * 40,
      Math.random(),
    ]);
    setState({ season, items });
  }, [count]);
  if (!state) return null;
  const { season, items } = state;
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      {items.map(([left, size, dur, delay, dx, sway, pick], i) => {
        if (season === "hotaru") {
          return (
            <span
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${left}%`,
                top: `${20 + ((i * 37) % 70)}%`,
                width: size / 3,
                height: size / 3,
                background: "var(--marker-gold)",
                boxShadow: "0 0 12px 4px color-mix(in oklab, var(--marker-gold) 60%, transparent)",
                animation: `float-glow ${dur / 2}s ease-in-out ${delay / 3}s infinite`,
                ["--dx" as string]: `${dx / 3}px`,
              }}
            />
          );
        }
        const color =
          season === "sakura"
            ? pick > 0.5 ? "var(--sakura)" : "color-mix(in oklab, var(--sakura) 60%, white)"
            : season === "momiji"
              ? pick > 0.6 ? "var(--accent)" : pick > 0.3 ? "var(--marker-gold)" : "color-mix(in oklab, var(--accent) 70%, var(--marker-gold))"
              : "color-mix(in oklab, var(--edge2) 40%, white)";
        return (
          <span
            key={i}
            className="absolute top-0"
            style={{
              left: `${left}%`,
              animation: `fall ${dur}s linear ${delay}s infinite, sway ${dur / 3}s ease-in-out ${delay}s infinite`,
              ["--dx" as string]: `${dx}px`,
              ["--sway" as string]: `${sway}px`,
              ["--rot" as string]: `${pick > 0.5 ? 540 : -480}deg`,
              ["--o" as string]: season === "yuki" ? 0.8 : 0.75,
            }}
          >
            {season === "yuki" ? (
              <span className="block rounded-full" style={{ width: size / 2.5, height: size / 2.5, background: color }} />
            ) : (
              <svg width={size} height={size} viewBox="0 0 24 24">
                <path d={season === "sakura" ? PETAL : LEAF} fill={color} />
              </svg>
            )}
          </span>
        );
      })}
    </div>
  );
}

/** Small kanji tag used beside section eyebrows. */
export function Kanji({ children, className = "" }: { children: string; className?: string }) {
  return (
    <span lang="ja" aria-hidden className={`jp text-accent-ink ${className}`}>
      {children}
    </span>
  );
}
