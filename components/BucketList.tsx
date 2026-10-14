"use client";

import { Flag } from "./Flag";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Plus, Sparkles } from "lucide-react";
import { BUCKET, CONTINENTS, type Continent } from "@/lib/data";
import { selectMemories, useStore } from "@/lib/store";
import { toggleVisited } from "@/lib/visited";
import { WikiImage } from "./WikiImage";
import { AnimatedNumber, Chip, EASE, Eyebrow, Reveal, Stamp } from "./ui";

type Filter = "all" | "wonders" | "todo" | Continent;

export function BucketList() {
  const memories = useStore(selectMemories);
  const seen = useMemo(() => new Set(memories.map((m) => m.placeId).filter(Boolean)), [memories]);
  const [filter, setFilter] = useState<Filter>("all");

  const total = BUCKET.length;
  const count = BUCKET.filter((b) => seen.has(b.id)).length;
  const wondersSeen = BUCKET.filter((b) => b.kind === "wonder" && seen.has(b.id)).length;

  const list = BUCKET.filter((b) => {
    if (filter === "all") return true;
    if (filter === "wonders") return b.kind === "wonder";
    if (filter === "todo") return !seen.has(b.id);
    return b.dest.continent === filter;
  });

  const R = 70;
  const C = 2 * Math.PI * R;

  return (
    <div className="space-y-10">
      <header className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
        <div className="aurora pointer-events-none absolute -inset-x-20 -top-24 -z-10 h-80" aria-hidden />
        <div>
          <Eyebrow>The bucket list</Eyebrow>
          <h1 className="font-display mt-2 text-[clamp(44px,8vw,84px)] leading-[0.92]">
            {total} places to see <em className="text-accent-ink">before you die.</em>
          </h1>
          <p className="mt-4 max-w-lg text-[16px] text-dim">
            The New 7 Wonders plus the world&apos;s other icons, each paired with hidden gems nearby. Tick one off and
            it goes straight into your memory book.
          </p>
          <Link
            href="/wonders"
            className="group mt-4 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-accent-ink"
          >
            The 7 Wonders, up close · {wondersSeen}/7
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>

        <div className="flex items-center gap-6 md:flex-col">
          <div className="relative h-40 w-40 shrink-0 md:h-48 md:w-48" role="img" aria-label={`${count} of ${total} seen`}>
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
                animate={{ strokeDashoffset: C - (C * count) / total }}
                transition={{ duration: 1.4, ease: EASE }}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="font-display text-5xl leading-none md:text-6xl">
                  <AnimatedNumber value={count} format={(n) => String(Math.round(n))} />
                  <span className="text-2xl text-faint md:text-3xl">/{total}</span>
                </p>
                <p className="mt-1 text-xs font-medium text-dim">seen</p>
              </div>
            </div>
          </div>
          {/* Per-continent progress */}
          <ul className="w-full min-w-0 space-y-1.5 md:w-56">
            {CONTINENTS.map((c) => {
              const all = BUCKET.filter((b) => b.dest.continent === c);
              const n = all.filter((b) => seen.has(b.id)).length;
              return (
                <li key={c} className="text-xs">
                  <div className="flex justify-between text-dim">
                    <span>{c}</span>
                    <span className="tabular-nums">
                      {n}/{all.length}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-panel2">
                    <motion.div
                      className="h-full rounded-full bg-accent"
                      initial={{ width: 0 }}
                      animate={{ width: `${(n / all.length) * 100}%` }}
                      transition={{ duration: 1, ease: EASE }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </header>

      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="group" aria-label="Filter">
        <Chip on={filter === "all"} onClick={() => setFilter("all")} className="shrink-0">
          All {total}
        </Chip>
        <Chip on={filter === "todo"} onClick={() => setFilter("todo")} className="shrink-0">
          Still to see · {total - count}
        </Chip>
        <Chip on={filter === "wonders"} onClick={() => setFilter("wonders")} className="shrink-0">
          <Sparkles size={13} aria-hidden /> 7 Wonders
        </Chip>
        {CONTINENTS.map((c) => (
          <Chip key={c} on={filter === c} onClick={() => setFilter(c)} className="shrink-0">
            {c}
          </Chip>
        ))}
      </div>

      {list.length === 0 ? (
        <Reveal className="rounded-[28px] border border-dashed border-edge2 p-10 text-center">
          <p className="font-display text-3xl">You&apos;ve seen them all here.</p>
          <p className="mt-2 text-dim">Legend. Pick another filter or plan a hidden-gem trip.</p>
        </Reveal>
      ) : (
        <motion.ul layout className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {list.map((b, i) => {
              const isSeen = seen.has(b.id);
              const n = BUCKET.indexOf(b) + 1;
              return (
                <motion.li
                  key={b.id}
                  layout
                  initial={{ opacity: 0, scale: 0.94, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.45, ease: EASE, delay: Math.min(i, 8) * 0.03 }}
                  className="group relative"
                >
                  <Link
                    href={`/plan?dest=${b.dest.id}`}
                    className="relative block aspect-[4/5] overflow-hidden rounded-[22px] bg-panel2 shadow-card transition-shadow duration-500 hover:shadow-lift"
                    aria-label={`Plan a trip to ${b.name}`}
                  >
                    <WikiImage
                      title={b.wiki}
                      photo={b.photo}
                      alt=""
                      className="h-full w-full transition-transform duration-1000 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
                    <span className="font-display absolute left-3 top-2.5 text-xl text-white/85 tabular-nums drop-shadow">
                      {String(n).padStart(2, "0")}
                    </span>
                    {b.kind === "wonder" && (
                      <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
                        Wonder
                      </span>
                    )}
                    {isSeen && (
                      <span className="absolute inset-x-0 top-[38%] flex justify-center text-white drop-shadow-lg">
                        <Stamp label="Visited" className="bg-black/25 backdrop-blur-sm" />
                      </span>
                    )}
                    <span className="absolute inset-x-0 bottom-0 p-3 pb-14 text-white">
                      <span className="block text-[11px] text-white/80">
                        <Flag cc={b.dest.countryCode} /> {b.dest.country}
                      </span>
                      <span className="font-display mt-0.5 block text-[22px] leading-[1.05]">{b.name}</span>
                    </span>
                  </Link>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    onClick={() => toggleVisited(b, b.dest, memories)}
                    aria-pressed={isSeen}
                    aria-label={isSeen ? `Unmark ${b.name} as visited` : `Mark ${b.name} as visited`}
                    className={`absolute inset-x-3 bottom-3 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold backdrop-blur-md transition-colors ${
                      isSeen ? "bg-accent text-on-accent" : "bg-white/20 text-white hover:bg-white/30"
                    }`}
                  >
                    {isSeen ? <Check size={15} aria-hidden /> : <Plus size={15} aria-hidden />}
                    {isSeen ? "Been there" : "I've been"}
                  </motion.button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  );
}
