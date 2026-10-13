"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion } from "motion/react";
import { ArrowRight, BookHeart, Shuffle } from "lucide-react";
import { Globe, type GlobeArc, type GlobePoint } from "@/components/Globe";
import { DestinationCard, GemCard } from "@/components/Cards";
import { AnimatedNumber, EASE, Eyebrow, Reveal, rise, stagger } from "@/components/ui";
import { DESTINATIONS, HOME_AIRPORTS, WONDERS } from "@/lib/data";
import { selectMemories, selectSettings, useStore } from "@/lib/store";

const GOLD: [number, number, number] = [0.95, 0.68, 0.2];
const ACCENT: [number, number, number] = [0.92, 0.36, 0.12];
const SEA: [number, number, number] = [0.2, 0.75, 0.7];

export default function Discover() {
  const memories = useStore(selectMemories);
  const settings = useStore(selectSettings);
  const home = HOME_AIRPORTS.find((a) => a.code === settings.home) ?? HOME_AIRPORTS[0];
  const seenIds = new Set(memories.map((m) => m.placeId).filter(Boolean));
  const wondersSeen = WONDERS.filter((w) => seenIds.has(w.id)).length;
  const countries = new Set(memories.map((m) => m.countryCode)).size;

  const points = useMemo<GlobePoint[]>(
    () => [
      ...WONDERS.map((w) => ({ lat: w.lat, lng: w.lng, size: 0.07, color: GOLD })),
      ...DESTINATIONS.filter((d) => !d.wonder).map((d) => ({ lat: d.base.lat, lng: d.base.lng, size: 0.045, color: SEA })),
      ...memories.map((m) => ({ lat: m.lat, lng: m.lng, size: 0.06, color: ACCENT })),
    ],
    [memories],
  );
  const arcs = useMemo<GlobeArc[]>(
    () => memories.map((m) => ({ from: [home.lat, home.lng], to: [m.lat, m.lng], color: ACCENT })),
    [memories, home],
  );

  const gems = DESTINATIONS.flatMap((d) => d.places.filter((p) => p.kind === "gem").map((p) => ({ p, d })));
  const picks = [0, 5, 9, 14, 21, 27].map((i) => gems[i % gems.length]);
  const offMap = DESTINATIONS.filter((d) => !d.wonder);

  return (
    <div className="space-y-20 md:space-y-28">
      {/* Hero */}
      <section className="relative">
        <div className="aurora pointer-events-none absolute -inset-x-20 -top-20 bottom-0 -z-10" aria-hidden />
        <div className="grid items-center gap-6 md:grid-cols-[1.05fr_1fr] md:gap-4">
          <motion.div variants={stagger} initial="hidden" animate="show" className="order-2 md:order-1">
            <motion.div variants={rise}>
              <Eyebrow>Your travel book</Eyebrow>
            </motion.div>
            <motion.h1
              variants={rise}
              className="font-display mt-3 text-[clamp(44px,8vw,92px)] leading-[0.95] text-txt"
            >
              See the world,
              <br />
              <em className="bg-gradient-to-r from-accent via-gold to-sea bg-clip-text pr-2 text-transparent">
                one wonder
              </em>{" "}
              at a time.
            </motion.h1>
            <motion.p variants={rise} className="mt-5 max-w-md text-[17px] leading-relaxed text-dim">
              Pick a month and a vibe. Travel Book plans the trip, shows you every stop on a map, and prices it
              with real ticket fares and live exchange rates.
            </motion.p>
            <motion.div variants={rise} className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/plan?surprise=1"
                className="shimmer group inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 text-[15px] font-semibold text-on-accent shadow-lift transition-transform hover:-translate-y-0.5 active:scale-95"
              >
                <Shuffle size={18} aria-hidden className="transition-transform duration-500 group-hover:rotate-180" />
                Surprise me with a trip
              </Link>
              <Link
                href="/memories"
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-edge bg-panel px-6 text-[15px] font-semibold text-txt transition-colors hover:border-edge2"
              >
                <BookHeart size={18} aria-hidden /> Memory book
              </Link>
            </motion.div>
            <motion.dl variants={rise} className="mt-10 grid max-w-md grid-cols-3 gap-3">
              {[
                { k: "Wonders seen", v: wondersSeen, of: "/7" },
                { k: "Countries", v: countries, of: "" },
                { k: "Memories", v: memories.length, of: "" },
              ].map((s) => (
                <div key={s.k} className="rounded-2xl border border-edge bg-panel/70 p-3 backdrop-blur">
                  <dd className="font-display text-4xl leading-none text-txt">
                    <AnimatedNumber value={s.v} format={(n) => String(Math.round(n))} />
                    <span className="text-xl text-faint">{s.of}</span>
                  </dd>
                  <dt className="mt-1.5 text-xs font-medium text-dim">{s.k}</dt>
                </div>
              ))}
            </motion.dl>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1.6, ease: EASE }}
            className="order-1 mx-auto w-full max-w-[520px] md:order-2"
          >
            <Globe
              points={points}
              arcs={arcs}
              label={`Globe showing the 7 wonders and the ${memories.length} places you've been`}
            />
            <ul className="-mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-dim">
              <li className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-gold" aria-hidden /> Wonders
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-hidden /> Where you&apos;ve been
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-sea" aria-hidden /> Hidden-gem trips
              </li>
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Wonders rail */}
      <section>
        <Reveal className="flex items-end justify-between gap-4">
          <div>
            <Eyebrow>The New 7 Wonders</Eyebrow>
            <h2 className="font-display mt-2 text-4xl md:text-5xl">
              {wondersSeen === 0 ? "Seven to go." : `${7 - wondersSeen} to go.`}
            </h2>
          </div>
          <Link
            href="/wonders"
            className="group hidden min-h-10 items-center gap-1 text-sm font-semibold text-accent-ink sm:inline-flex"
          >
            Track your progress <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          className="no-scrollbar -mx-4 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6"
        >
          {WONDERS.map((w) => (
            <motion.div key={w.id} variants={rise} className="w-[72%] shrink-0 snap-start sm:w-[300px]">
              <DestinationCard d={w.dest} seen={seenIds.has(w.id)} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Hidden gems */}
      <section>
        <Reveal>
          <Eyebrow>Hidden gems</Eyebrow>
          <h2 className="font-display mt-2 max-w-xl text-4xl md:text-5xl">Places your friends haven&apos;t posted yet.</h2>
        </Reveal>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {picks.map(({ p, d }) => (
            <motion.div key={p.id} variants={rise}>
              <GemCard p={p} d={d} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Off-the-map trips */}
      <section>
        <Reveal>
          <Eyebrow>No wonder required</Eyebrow>
          <h2 className="font-display mt-2 text-4xl md:text-5xl">Whole trips off the beaten path.</h2>
        </Reveal>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5"
        >
          {offMap.map((d) => (
            <motion.div key={d.id} variants={rise}>
              <DestinationCard d={d} />
            </motion.div>
          ))}
        </motion.div>
      </section>
    </div>
  );
}
