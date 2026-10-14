"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Car, Plane, Shuffle } from "lucide-react";
import { Globe, type GlobeArc, type GlobePoint } from "@/components/Globe";
import { DestinationCard, GemCard } from "@/components/Cards";
import { AnimatedNumber, EASE, Eyebrow, Reveal, rise, stagger } from "@/components/ui";
import { BIG_TRIPS, BUCKET, DESTINATIONS, HOME_AIRPORTS, WONDERS, tripSeen } from "@/lib/data";
import { fmtHours, MONTHS, MONTHS_LONG } from "@/lib/planner";
import { PhotoCard } from "@/components/Cards";
import { Enso, InkStroke, SEASON_LABEL, SeasonalParticles, seasonOf } from "@/components/Japan";
import { Magnetic, SplitWords } from "@/components/motion";
import { Chip } from "@/components/ui";
import { Rail } from "@/components/Rail";
import { selectMemories, selectSettings, useStore } from "@/lib/store";

// Globe dots: kincha gold, shu vermilion, rokusho verdigris
const GOLD: [number, number, number] = [0.9, 0.66, 0.23];
const ACCENT: [number, number, number] = [0.85, 0.27, 0.17];
const SEA: [number, number, number] = [0.24, 0.6, 0.53];

export default function Discover() {
  const memories = useStore(selectMemories);
  const settings = useStore(selectSettings);
  const home = HOME_AIRPORTS.find((a) => a.code === settings.home) ?? HOME_AIRPORTS[0];
  const seenIds = new Set(memories.map((m) => m.placeId).filter(Boolean));
  const wondersSeen = WONDERS.filter((w) => seenIds.has(w.id)).length;
  const countries = new Set(memories.map((m) => m.countryCode)).size;
  const bucketSeen = BUCKET.filter((b) => seenIds.has(b.id)).length;
  const [month, setMonth] = useState<number | null>(null);
  useEffect(() => setMonth(((new Date().getMonth() + 2) % 12) + 1), []);
  const inSeason = month ? BIG_TRIPS.filter((d) => d.bestMonths.includes(month)) : [];
  const weekends = DESTINATIONS.filter((d) => d.weekend);
  const [season, setSeason] = useState<ReturnType<typeof seasonOf> | null>(null);
  useEffect(() => setSeason(seasonOf(new Date().getMonth() + 1)), []);

  const points = useMemo<GlobePoint[]>(
    () => [
      ...BUCKET.map((b) => ({ lat: b.lat, lng: b.lng, size: b.kind === "wonder" ? 0.07 : 0.05, color: GOLD })),
      ...DESTINATIONS.filter((d) => d.offbeat).map((d) => ({ lat: d.base.lat, lng: d.base.lng, size: 0.045, color: SEA })),
      ...memories.map((m) => ({ lat: m.lat, lng: m.lng, size: 0.06, color: ACCENT })),
    ],
    [memories],
  );
  const arcs = useMemo<GlobeArc[]>(
    () => memories.map((m) => ({ from: [home.lat, home.lng], to: [m.lat, m.lng], color: ACCENT })),
    [memories, home],
  );

  const gems = BIG_TRIPS.flatMap((d) => d.places.filter((p) => p.kind === "gem").map((p) => ({ p, d })));
  const picks = [0, 5, 9, 14, 21, 27].map((i) => gems[i % gems.length]);
  const offMap = BIG_TRIPS.filter((d) => d.offbeat);

  return (
    <div className="space-y-20 md:space-y-28">
      {/* Hero */}
      <section className="relative">
        <div className="aurora pointer-events-none absolute -inset-x-20 -top-20 bottom-0 -z-10" aria-hidden />
        <SeasonalParticles className="-z-10" />
        <span
          lang="ja"
          aria-hidden
          className="jp vertical pointer-events-none absolute -left-1 top-2 hidden text-[13px] tracking-[0.5em] text-faint lg:block xl:-left-8"
        >
          世界を旅する · 一期一会
        </span>
        <div className="grid items-center gap-6 md:grid-cols-[1.05fr_1fr] md:gap-4">
          <motion.div variants={stagger} initial="hidden" animate="show" className="order-2 md:order-1">
            <motion.div variants={rise}>
              <Eyebrow jp="旅">Your travel book</Eyebrow>
            </motion.div>
            <h1 className="font-display mt-4 text-[clamp(44px,8vw,92px)] leading-[0.98] text-txt">
              <SplitWords text="See the world," delay={0.15} />
              <br />
              <span className="relative inline-block text-accent-ink">
                <SplitWords text="one wonder" delay={0.35} />
                <InkStroke className="absolute -bottom-1 left-0 h-3 w-full text-accent/55" delay={1.1} />
              </span>{" "}
              <SplitWords text="at a time." delay={0.5} />
            </h1>
            <motion.p variants={rise} className="mt-5 max-w-md text-[17px] leading-relaxed text-dim">
              Pick a month and a vibe. Travel Book plans the trip, shows you every stop on a map, and prices it
              with real ticket fares and live exchange rates.
            </motion.p>
            <motion.div variants={rise} className="mt-7 flex flex-wrap gap-3">
              <Magnetic>
                <Link
                  href="/plan?surprise=1"
                  className="shimmer group inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 text-[15px] font-semibold text-on-accent shadow-lift transition-transform active:scale-95"
                >
                  <Shuffle size={18} aria-hidden className="transition-transform duration-500 group-hover:rotate-180" />
                  Surprise me with a trip
                </Link>
              </Magnetic>
              <Link
                href="/weekends"
                className="group inline-flex min-h-12 items-center gap-2 rounded-full border border-edge bg-panel px-6 text-[15px] font-semibold text-txt transition-colors hover:border-edge2"
              >
                <Car size={18} aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5" /> This weekend
              </Link>
            </motion.div>
            <motion.dl variants={rise} className="mt-10 grid max-w-md grid-cols-3 gap-3">
              {[
                { k: "Bucket list", v: bucketSeen, of: `/${BUCKET.length}` },
                { k: "Countries", v: countries, of: "" },
                { k: "Memories", v: memories.length, of: "" },
              ].map((s) => (
                <div key={s.k} className="rounded-2xl border border-edge bg-panel/70 p-3 backdrop-blur transition-colors hover:border-edge2">
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
            className="relative order-1 mx-auto w-full max-w-[520px] md:order-2"
          >
            <Enso className="absolute -inset-[6%] text-accent/25" delay={0.8} />
            <Globe
              points={points}
              arcs={arcs}
              label={`Globe showing ${BUCKET.length} bucket-list places and the ${memories.length} places you've been`}
            />
            {season && (
              <p className="-mt-2 mb-2 text-center text-xs text-faint">
                <span lang="ja" className="jp mr-1.5 text-sm text-accent-ink">{SEASON_LABEL[season].jp}</span>
                It&apos;s {SEASON_LABEL[season].en}
              </p>
            )}
            <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-dim">
              <li className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-marker-gold" aria-hidden /> Bucket list
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
            <Eyebrow jp="七">The New 7 Wonders</Eyebrow>
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
        <div className="mt-5">
          <Rail label="The New 7 Wonders"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}>
          {WONDERS.map((w) => (
            <motion.div key={w.id} variants={rise} className="w-[72%] shrink-0 snap-start sm:w-[300px]">
              <DestinationCard d={w.dest} seen={seenIds.has(w.id)} />
            </motion.div>
          ))}
          </Rail>
        </div>
      </section>

      {/* Where to go this month */}
      <section>
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow jp="季">Perfect timing</Eyebrow>
            <h2 className="font-display mt-2 text-4xl md:text-5xl">
              Where to go in <em className="text-accent-ink">{month ? MONTHS_LONG[month - 1] : "…"}</em>
            </h2>
          </div>
          <Link
            href="/bucket"
            className="group hidden min-h-10 items-center gap-1 text-sm font-semibold text-accent-ink sm:inline-flex"
          >
            See all {BUCKET.length} <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>
        <div className="no-scrollbar -mx-4 mt-5 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="group" aria-label="Month">
          {MONTHS.map((m, i) => (
            <Chip key={m} on={month === i + 1} onClick={() => setMonth(i + 1)} className="shrink-0 !px-3.5">
              {m}
            </Chip>
          ))}
        </div>
        <div className="mt-5">
          <Rail label="Trips in season"
          key={month ?? 0}
          variants={stagger}
          initial="hidden"
          animate="show">
          {inSeason.map((d) => (
            <motion.div key={d.id} variants={rise} className="w-[64%] shrink-0 snap-start sm:w-[260px]">
              <DestinationCard d={d} seen={tripSeen(d, seenIds)} />
            </motion.div>
          ))}
          </Rail>
        </div>
        <p className="text-xs text-dim">
          {inSeason.length} trips are in their best season{month ? ` in ${MONTHS_LONG[month - 1]}` : ""}: good weather and
          fewer crowds.
        </p>
      </section>

      {/* Weekend getaways */}
      <section>
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow jp="週末">Weekend getaways</Eyebrow>
            <h2 className="font-display mt-2 max-w-xl text-4xl md:text-5xl">
              Friday to Sunday, <em className="text-accent-ink">no PTO.</em>
            </h2>
            <p className="mt-2 max-w-lg text-dim">
              Hidden gems a drive away from {home.city}, plus short nonstop flights. Live weekend forecasts, real gas and fares.
            </p>
          </div>
          <Link href="/weekends" className="group inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-accent-ink">
            See all {weekends.length} <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>
        <div className="mt-5">
          <Rail label="Weekend getaways" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}>
            {weekends.map((d) => {
              const w = d.weekend!;
              return (
                <motion.div key={d.id} variants={rise} className="w-[64%] shrink-0 snap-start sm:w-[260px]">
                  <PhotoCard
                    href={`/plan?dest=${d.id}&days=3`}
                    wiki={d.places[0].wiki}
                    photo={d.places[0].photo}
                    title={d.name}
                    kicker={
                      <span className="inline-flex items-center gap-1.5">
                        {w.fly ? <Plane size={12} aria-hidden /> : <Car size={12} aria-hidden />}
                        {w.fly ? `${fmtHours(w.fly.hours)} flight` : `${fmtHours(w.hours ?? 0)} drive`} · {d.country}
                      </span>
                    }
                    sub={d.pitch}
                  />
                </motion.div>
              );
            })}
          </Rail>
        </div>
      </section>

      {/* Hidden gems */}
      <section>
        <Reveal>
          <Eyebrow jp="宝">Hidden gems</Eyebrow>
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
          <Eyebrow jp="道">No wonder required</Eyebrow>
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
