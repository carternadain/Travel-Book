"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Check, Gem, Plus, Ticket } from "lucide-react";
import { WikiImage } from "@/components/WikiImage";
import { EASE, Eyebrow, Reveal, Stamp } from "@/components/ui";
import { WONDERS } from "@/lib/data";
import { toUSD, useRates } from "@/lib/live";
import { flag, money } from "@/lib/format";
import { MONTHS } from "@/lib/planner";
import { selectMemories, selectSettings, useStore } from "@/lib/store";
import { toggleVisited } from "@/lib/visited";

export default function WondersPage() {
  const memories = useStore(selectMemories);
  const settings = useStore(selectSettings);
  const rates = useRates();
  const seen = new Set(memories.map((m) => m.placeId).filter(Boolean));
  const count = WONDERS.filter((w) => seen.has(w.id)).length;

  const toggle = (w: (typeof WONDERS)[number]) => toggleVisited(w, w.dest, memories);

  const R = 70;
  const C = 2 * Math.PI * R;

  return (
    <div className="space-y-16">
      <header className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
        <div className="aurora pointer-events-none absolute -inset-x-20 -top-24 h-80 -z-10" aria-hidden />
        <div>
          <Eyebrow>The New 7 Wonders of the World</Eyebrow>
          <h1 className="font-display mt-2 text-[clamp(44px,8vw,84px)] leading-[0.92]">
            {count === 7 ? (
              <>You did it. <em className="text-accent-ink">All seven.</em></>
            ) : (
              <>
                The big seven, <em className="text-accent-ink">plus the gems</em> next door.
              </>
            )}
          </h1>
          <p className="mt-4 max-w-lg text-[16px] text-dim">
            Voted in 2007 by over 100 million people. Tick one off when you&apos;ve been — it goes straight into your
            memory book.
          </p>
        </div>
        <div className="relative mx-auto h-48 w-48" role="img" aria-label={`${count} of 7 wonders seen`}>
          <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
            <circle cx="80" cy="80" r={R} fill="none" stroke="var(--edge)" strokeWidth="10" />
            <motion.circle
              cx="80"
              cy="80"
              r={R}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={C}
              initial={{ strokeDashoffset: C }}
              animate={{ strokeDashoffset: C - (C * count) / 7 }}
              transition={{ duration: 1.4, ease: EASE }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="font-display text-6xl leading-none tabular-nums">
                {count}
                <span className="text-3xl text-faint">/7</span>
              </p>
              <p className="mt-1 text-xs font-medium text-dim">wonders seen</p>
            </div>
          </div>
        </div>
      </header>

      <ol className="space-y-16 md:space-y-24">
        {WONDERS.map((w, i) => {
          const isSeen = seen.has(w.id);
          const ticketUSD = (w.tickets ?? []).filter((t) => !/train|bus/i.test(t.label)).reduce((s, t) => s + toUSD(t.amount, t.currency, rates), 0);
          const gems = w.dest.places.filter((p) => p.kind === "gem");
          return (
            <li key={w.id} className="grid items-center gap-6 md:grid-cols-2 md:gap-12">
              <Reveal className={`relative ${i % 2 ? "md:order-2" : ""}`}>
                <Link
                  href={`/plan?dest=${w.dest.id}`}
                  className="group relative block aspect-[4/3] overflow-hidden rounded-[28px] shadow-lift"
                  aria-label={`Plan a trip to ${w.name}`}
                >
                  <WikiImage
                    title={w.wiki}
                    photo={w.photo}
                    alt={w.name}
                    large
                    className="h-full w-full transition-transform duration-[1.4s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  {isSeen && (
                    <div className="absolute right-5 top-5 text-white drop-shadow-lg">
                      <Stamp label="Visited" className="bg-black/20 text-base backdrop-blur-sm" />
                    </div>
                  )}
                </Link>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="font-display text-7xl leading-none text-edge2 tabular-nums" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p className="mt-3 text-sm font-medium text-dim">
                  {flag(w.dest.countryCode)} {w.dest.country}
                </p>
                <h2 className="font-display mt-1 text-5xl leading-[0.95]">{w.name}</h2>
                <p className="mt-3 max-w-md text-[16px] leading-relaxed text-dim">{w.blurb}</p>

                <dl className="mt-5 flex flex-wrap gap-2 text-sm">
                  <div className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-panel2 px-3">
                    <Ticket size={14} className="text-faint" aria-hidden />
                    <dt className="sr-only">Entry</dt>
                    <dd className="font-medium text-txt tabular-nums">{money(ticketUSD, settings.currency, rates)} entry</dd>
                  </div>
                  <div className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-panel2 px-3">
                    <dt className="text-faint">Best</dt>
                    <dd className="font-medium text-txt">{w.dest.bestMonths.map((m) => MONTHS[m - 1]).join(", ")}</dd>
                  </div>
                </dl>

                <div className="mt-5">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-faint">
                    <Gem size={13} aria-hidden /> Hidden gems nearby
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {gems.map((g) => (
                      <li key={g.id} className="rounded-full border border-edge px-3 py-1.5 text-sm text-dim">
                        {g.name}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  <Link
                    href={`/plan?dest=${w.dest.id}`}
                    className="group inline-flex min-h-11 items-center gap-2 rounded-full bg-txt px-5 text-sm font-semibold text-bg transition-transform hover:-translate-y-0.5"
                  >
                    Plan this trip <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden />
                  </Link>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => toggle(w)}
                    aria-pressed={isSeen}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition-colors ${
                      isSeen ? "border-accent bg-accent text-on-accent" : "border-edge bg-panel text-txt hover:border-edge2"
                    }`}
                  >
                    {isSeen ? <Check size={16} aria-hidden /> : <Plus size={16} aria-hidden />}
                    {isSeen ? "Been there" : "I've been here"}
                  </motion.button>
                </div>
              </Reveal>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
