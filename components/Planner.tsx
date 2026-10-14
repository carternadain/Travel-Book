"use client";

import { Flag } from "./Flag";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import {
  CalendarDays, Check, CloudRain, Dices, ExternalLink, Heart, MapPin, Plane, Share2, Shuffle, Sparkles, Star, Sun, Thermometer,
} from "lucide-react";
import { DESTINATIONS, HOME_AIRPORTS, INTERESTS, type Destination, type Interest, type Style } from "@/lib/data";
import { buildTrip, MONTHS, MONTHS_LONG, rng, suggestDestination, type Trip } from "@/lib/planner";
import { nextWeekend, useClimate, useRates, useWiki } from "@/lib/live";
import { actions, selectMemories, selectSettings, uid, useStore } from "@/lib/store";
import { money } from "@/lib/format";
import { CostBreakdown } from "./CostBreakdown";
import { DestinationPicker } from "./DestinationPicker";
import { PackingList } from "./PackingList";
import { WikiImage } from "./WikiImage";
import { Button, Chip, EASE, Eyebrow, Reveal } from "./ui";
import type { MapStop } from "./TripMap";

const TripMap = dynamic(() => import("./TripMap"), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full" />,
});

const STYLES: { id: Style; label: string; sub: string }[] = [
  { id: "budget", label: "Backpacker", sub: "Hostels, street food" },
  { id: "mid", label: "Comfortable", sub: "3★ hotels, sit-down meals" },
  { id: "comfort", label: "Treat yourself", sub: "4–5★, premium economy" },
];

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "MXN", "JPY", "KRW"];

export function Planner() {
  const params = useSearchParams();
  const settings = useStore(selectSettings);
  const memories = useStore(selectMemories);
  const rates = useRates();

  const [ready, setReady] = useState(false);
  const [destId, setDestId] = useState<string>(DESTINATIONS[0].id);
  const [month, setMonth] = useState(5);
  const [days, setDays] = useState(9);
  const [interests, setInterests] = useState<Interest[]>(["history", "nature", "food"]);
  const [seed, setSeed] = useState(1);
  const [saved, setSaved] = useState(false);
  const [rolling, setRolling] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const visitedPlaceIds = useMemo(() => memories.map((m) => m.placeId).filter(Boolean) as string[], [memories]);

  function surprise(scroll = true) {
    const s = Math.floor(Math.random() * 1e9);
    const r = rng(s);
    const d = suggestDestination({ month, interests, visitedPlaceIds, rand: r, exclude: destId });
    setRolling(true);
    setTimeout(() => setRolling(false), 650);
    setDestId(d.id);
    setSeed(s);
    if (scroll) setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  }

  // Initial state from the URL (client-only, so static export stays happy).
  useEffect(() => {
    const now = new Date();
    const m = ((now.getMonth() + 3) % 12) + 1; // ~3 months out
    setMonth(m);
    const want = params.get("dest");
    if (want && DESTINATIONS.some((d) => d.id === want)) {
      setDestId(want);
      const d = DESTINATIONS.find((x) => x.id === want)!;
      if (d.weekend) setMonth(Number(nextWeekend()[0].slice(5, 7)));
      else if (!d.bestMonths.includes(m)) setMonth(d.bestMonths[0]);
      const pd = Number(params.get("days"));
      const pm = Number(params.get("month"));
      const ps = Number(params.get("seed"));
      if (d.weekend) setDays(3);
      if (pd >= 2 && pd <= 21) setDays(pd);
      if (pm >= 1 && pm <= 12) setMonth(pm);
      if (ps) setSeed(ps);
    } else if (params.get("surprise")) {
      const s = Math.floor(Math.random() * 1e9);
      const d = suggestDestination({ month: m, interests, visitedPlaceIds, rand: rng(s) });
      setDestId(d.id);
      setSeed(s);
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dest = DESTINATIONS.find((d) => d.id === destId)!;
  const trip = useMemo(
    () => buildTrip({ dest, days, style: settings.style, month, interests, home: settings.home, seed, rates }),
    [dest, days, settings.style, month, interests, settings.home, seed, rates],
  );

  useEffect(() => setSaved(false), [destId, days, month, seed, settings.style]);

  const toggleInterest = (i: Interest) =>
    setInterests((cur) => (cur.includes(i) ? (cur.length > 1 ? cur.filter((x) => x !== i) : cur) : [...cur, i]));

  return (
    <div className="space-y-10">
      <header className="relative">
        <div className="aurora pointer-events-none absolute -inset-x-20 -top-24 h-72 -z-10" aria-hidden />
        <Eyebrow jp="計画">Trip planner</Eyebrow>
        <h1 className="font-display mt-2 text-[clamp(40px,7vw,72px)] leading-[0.95]">
          Where should you <em className="text-accent-ink">go next?</em>
        </h1>
        <p className="mt-3 max-w-lg text-[16px] text-dim">
          Not sure? Hit the dice. Every trip pairs a headline sight with hidden gems nearby — priced out with real
          fares.
        </p>
      </header>

      {/* Controls */}
      <section className="rounded-[28px] border border-edge bg-panel p-4 shadow-card sm:p-6" aria-label="Trip options">
        <div className="flex flex-col gap-6">
          <Field label="Destination">
            <div className="flex flex-wrap gap-2">
              <motion.button
                type="button"
                onClick={() => surprise()}
                whileTap={{ scale: 0.92 }}
                className="shimmer inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-on-accent"
              >
                <motion.span animate={rolling ? { rotate: [0, 200, 360] } : { rotate: 0 }} transition={{ duration: 0.6 }}>
                  <Dices size={16} aria-hidden />
                </motion.span>
                Surprise me
              </motion.button>
              <DestinationPicker
                value={dest}
                month={month}
                seenIds={new Set(visitedPlaceIds)}
                onChange={(id) => {
                  const next = DESTINATIONS.find((x) => x.id === id)!;
                  if (next.weekend && days > 4) setDays(3);
                  if (!next.weekend && days < 5) setDays(9);
                  setDestId(id);
                  setSeed(1);
                }}
              />
            </div>
          </Field>

          <Field label="When">
            <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
              {MONTHS.map((m, i) => {
                const best = dest.bestMonths.includes(i + 1);
                return (
                  <Chip key={m} on={month === i + 1} onClick={() => setMonth(i + 1)} className="shrink-0 !px-3.5">
                    {m}
                    {best && (
                      <Sun
                        size={12}
                        className={month === i + 1 ? "text-bg" : "text-gold"}
                        aria-label="Best time to go"
                      />
                    )}
                  </Chip>
                );
              })}
            </div>
          </Field>

          <div className="grid gap-6 md:grid-cols-2">
            <Field label={`How long · ${days} days`}>
              <input
                type="range"
                min={2}
                max={21}
                value={days}
                onChange={(e) => setDays(+e.target.value)}
                aria-label="Trip length in days"
                className="h-10 w-full cursor-pointer accent-[var(--accent)]"
              />
              <div className="flex justify-between text-[11px] text-faint tabular-nums">
                <span>Weekend</span>
                <span>1 week</span>
                <span>2 weeks</span>
                <span>21</span>
              </div>
            </Field>

            <Field label="Travel style">
              <div className="grid grid-cols-3 gap-1 rounded-2xl bg-panel2 p-1" role="radiogroup" aria-label="Travel style">
                {STYLES.map((s) => {
                  const on = settings.style === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => actions.setSettings({ style: s.id })}
                      className="relative min-h-14 rounded-xl px-2 py-1.5 text-center"
                    >
                      {on && (
                        <motion.span
                          layoutId="style-pill"
                          className="absolute inset-0 rounded-xl bg-panel shadow-card"
                          transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        />
                      )}
                      <span className={`relative block text-sm font-semibold ${on ? "text-txt" : "text-dim"}`}>{s.label}</span>
                      <span className="relative hidden text-[11px] text-faint sm:block">{s.sub}</span>
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>

          <Field label="You're into">
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <Chip key={i.id} on={interests.includes(i.id)} onClick={() => toggleInterest(i.id)}>
                  {i.label}
                </Chip>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3 sm:max-w-md">
            <Select
              label="Flying from"
              value={settings.home}
              onChange={(v) => actions.setSettings({ home: v })}
              options={HOME_AIRPORTS.map((a) => ({ value: a.code, label: `${a.city} (${a.code})` }))}
            />
            <Select
              label="Show prices in"
              value={settings.currency}
              onChange={(v) => actions.setSettings({ currency: v })}
              options={CURRENCIES.map((c) => ({ value: c, label: c }))}
            />
          </div>
        </div>
      </section>

      <div ref={resultRef} className="scroll-mt-6 md:scroll-mt-28" />
      <AnimatePresence mode="wait">
        {ready && (
          <motion.div
            key={dest.id + seed}
            initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, filter: "blur(8px)" }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <TripResult
              trip={trip}
              currency={settings.currency}
              rates={rates}
              saved={saved}
              onShuffle={() => setSeed(Math.floor(Math.random() * 1e9))}
              shareUrl={`/plan?dest=${dest.id}&days=${days}&month=${month}&seed=${seed}`}
              onSurprise={() => surprise(false)}
              onSave={() => {
                actions.saveTrip({
                  id: uid(),
                  destId: dest.id,
                  days,
                  style: settings.style,
                  month,
                  seed,
                  totalUSD: trip.total,
                  createdAt: Date.now(),
                });
                setSaved(true);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint">{label}</p>
      {children}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-faint">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 w-full rounded-xl border border-edge bg-panel2 px-3 text-sm font-medium text-txt"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TripResult({
  trip,
  currency,
  rates,
  saved,
  onShuffle,
  onSurprise,
  onSave,
  shareUrl,
}: {
  trip: Trip;
  currency: string;
  rates: ReturnType<typeof useRates>;
  saved: boolean;
  shareUrl: string;
  onShuffle: () => void;
  onSurprise: () => void;
  onSave: () => void;
}) {
  const { dest } = trip;
  const hero = dest.places[0];
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  const stops: MapStop[] = useMemo(() => {
    const s: MapStop[] = [{ lat: dest.base.lat, lng: dest.base.lng, label: `Base: ${dest.base.name}`, kind: "base", n: "⌂" }];
    trip.plan.forEach((d) =>
      d.places.forEach((p) =>
        s.push({ lat: p.lat, lng: p.lng, label: `Day ${d.day} · ${p.name}`, kind: p.kind === "gem" ? "gem" : "wonder", n: d.day }),
      ),
    );
    return s;
  }, [trip, dest]);

  return (
    <div className="space-y-6">
      {/* Cinematic hero */}
      <div ref={heroRef} className="relative overflow-hidden rounded-[28px] shadow-lift">
        <motion.div style={{ y }} className="absolute -inset-y-[10%] inset-x-0">
          <WikiImage title={hero.wiki} photo={hero.photo} alt={hero.name} large className="h-full w-full" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
        <div className="relative flex aspect-[4/5] flex-col justify-end p-5 text-white sm:aspect-[16/8] sm:p-8">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: EASE }}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-medium text-white/85"
          >
            <span>
              <Flag cc={dest.countryCode} /> {dest.country}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={14} aria-hidden /> {MONTHS_LONG[trip.month - 1]} · {trip.days} days
            </span>
            {dest.bestMonths.includes(trip.month) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 backdrop-blur">
                <Sun size={12} aria-hidden /> Great time to go
              </span>
            )}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: EASE }}
            className="font-display mt-2 text-[clamp(44px,8vw,96px)] leading-[0.92]"
          >
            {dest.name}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/90 sm:text-[17px]"
          >
            {dest.pitch}
          </motion.p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={onSave} disabled={saved} className="!bg-white !text-black">
              <motion.span animate={saved ? { scale: [1, 1.5, 1] } : {}} transition={{ duration: 0.4 }}>
                <Heart size={16} className={saved ? "fill-current text-accent" : ""} aria-hidden />
              </motion.span>
              {saved ? "Saved to wishlist" : "Save trip"}
            </Button>
            <Button variant="soft" onClick={onShuffle} className="!bg-white/15 !text-white backdrop-blur hover:!bg-white/25">
              <Shuffle size={16} aria-hidden /> Shuffle stops
            </Button>
            <Button variant="soft" onClick={onSurprise} className="!bg-white/15 !text-white backdrop-blur hover:!bg-white/25">
              <Sparkles size={16} aria-hidden /> Somewhere else
            </Button>
            <ShareButton url={shareUrl} title={`${dest.name}: ${trip.days}-day trip`} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Reveal className="rounded-[28px] border border-edge bg-panel p-5 shadow-card sm:p-7">
          <CostBreakdown
            costs={trip.costs}
            total={trip.total}
            low={trip.low}
            high={trip.high}
            days={trip.days}
            currency={currency}
            rates={rates}
            drive={trip.drive}
          />
        </Reveal>

        <div className="space-y-6">
          <Reveal delay={0.08}>
            <Weather dest={dest} month={trip.month} />
          </Reveal>
          <Reveal delay={0.1}>
            <PackingList trip={trip} />
          </Reveal>
          <Reveal delay={0.12} className="rounded-[28px] border border-edge bg-panel p-5 shadow-card sm:p-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-txt">
              <Plane size={16} aria-hidden /> Check live prices
            </h3>
            <p className="mt-1 text-xs text-dim tabular-nums">
              Pre-filled for {trip.start} → {trip.end}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {trip.links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex min-h-14 flex-col justify-center rounded-2xl bg-panel2 px-3.5 py-2 transition-colors hover:bg-edge"
                >
                  <span className="flex items-center gap-1 text-sm font-semibold text-txt">
                    {l.label}
                    <ExternalLink
                      size={12}
                      className="text-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                  <span className="text-[11px] text-dim">{l.hint}</span>
                </a>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.16}>
            <About title={hero.wiki} />
          </Reveal>
        </div>
      </div>

      <Reveal className="overflow-hidden rounded-[28px] border border-edge bg-panel shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5 sm:px-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-txt">
            <MapPin size={16} aria-hidden /> Your route
          </h3>
          <ul className="flex gap-3 text-xs text-dim">
            <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-txt" aria-hidden />Base</li>
            <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-gold" aria-hidden />Bucket list</li>
            <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sea" aria-hidden />Hidden gem</li>
          </ul>
        </div>
        <div className="mt-4 h-[360px] sm:h-[440px]">
          <TripMap stops={stops} className="h-full w-full" />
        </div>
      </Reveal>

      <section aria-label="Day by day">
        <Reveal>
          <h3 className="font-display text-4xl md:text-5xl">Day by day</h3>
        </Reveal>
        <ol className="relative mt-6 space-y-4 before:absolute before:bottom-6 before:left-[19px] before:top-6 before:w-px before:bg-edge2">
          {trip.plan.map((d, i) => (
            <motion.li
              key={d.day + d.title}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, ease: EASE, delay: Math.min(i, 4) * 0.04 }}
              className="relative flex gap-4"
            >
              <span
                className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold tabular-nums ring-4 ring-bg ${
                  d.kind === "wonder" || d.kind === "icon"
                    ? "bg-gold text-on-mark"
                    : d.kind === "gem"
                      ? "bg-sea text-on-mark"
                      : "bg-panel2 text-dim"
                }`}
              >
                {d.kind === "wonder" || d.kind === "icon" ? <Star size={16} className="fill-current" aria-label={`Day ${d.day}`} /> : d.day}
              </span>
              <div className="min-w-0 flex-1 overflow-hidden rounded-[22px] border border-edge bg-panel shadow-card">
                {d.places.length > 0 && (
                  <div className={`grid h-36 gap-[2px] sm:h-44 ${d.places.length > 1 ? "grid-cols-2" : ""}`}>
                    {d.places.map((p) => (
                      <WikiImage key={p.id} title={p.wiki} photo={p.photo} alt={p.name} className="h-full w-full" />
                    ))}
                  </div>
                )}
                <div className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">
                    Day {d.day}
                    {d.kind === "wonder" && <span className="text-gold"> · Wonder of the world</span>}
                    {d.kind === "icon" && <span className="text-gold"> · Bucket list</span>}
                    {d.kind === "gem" && <span className="text-sea"> · Hidden gem</span>}
                  </p>
                  <h4 className="mt-1 text-lg font-semibold leading-snug text-txt">{d.title}</h4>
                  <p className="mt-1 text-sm leading-relaxed text-dim">{d.note}</p>
                  {d.places.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {d.places.map((p) => (
                        <li key={p.id} className="text-sm text-dim">
                          <span className="font-medium text-txt">{p.name}</span> — {p.blurb}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </motion.li>
          ))}
        </ol>
      </section>

      <p className="text-center text-xs text-faint">
        {trip.drive ? "Gas estimate" : "Flight estimate"} {money(trip.costs[0].usd, currency, rates)} for{" "}
        {Math.round(trip.miles).toLocaleString()} mi each way · photos &amp; summaries from Wikipedia
      </p>
    </div>
  );
}

function ShareButton({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const full = window.location.origin + (process.env.NEXT_PUBLIC_BASE_PATH || "") + url;
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title, url: full });
        return;
      }
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* user cancelled the share sheet */
    }
  };
  return (
    <Button variant="soft" onClick={share} className="!bg-white/15 !text-white backdrop-blur hover:!bg-white/25" aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={copied ? "y" : "n"}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="inline-flex"
        >
          {copied ? <Check size={16} aria-hidden /> : <Share2 size={16} aria-hidden />}
        </motion.span>
      </AnimatePresence>
      {copied ? "Link copied" : "Share"}
    </Button>
  );
}

function Weather({ dest, month }: { dest: Destination; month: number }) {
  const c = useClimate(dest.base.lat, dest.base.lng, month);
  const f = (x: number) => Math.round((x * 9) / 5 + 32);
  return (
    <div className="rounded-[28px] border border-edge bg-panel p-5 shadow-card sm:p-6">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-txt">
        <Thermometer size={16} aria-hidden /> Weather in {MONTHS_LONG[month - 1]}
      </h3>
      {c === undefined ? (
        <div className="mt-3 space-y-2">
          <div className="skeleton h-10 w-40 rounded-lg" />
          <div className="skeleton h-4 w-56 rounded" />
        </div>
      ) : c === null ? (
        <p className="mt-2 text-sm text-dim">Couldn&apos;t load weather right now.</p>
      ) : (
        <>
          <div className="mt-3 flex items-end gap-5">
            <p className="font-display text-5xl leading-none text-txt tabular-nums">
              {f(c.high)}°<span className="text-2xl text-faint">/{f(c.low)}°F</span>
            </p>
            <p className="flex items-center gap-1.5 pb-1 text-sm text-dim tabular-nums">
              <CloudRain size={16} aria-hidden /> {c.rainDays} rainy days
            </p>
          </div>
          <p className="mt-2 text-xs text-dim tabular-nums">
            Average high/low in {dest.base.name}, {MONTHS_LONG[month - 1]} {c.year} ({Math.round(c.high)}°/{Math.round(c.low)}°C).
            Real observations via Open-Meteo.
          </p>
        </>
      )}
      <div className="mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">Best months</p>
        <div className="mt-2 grid grid-cols-12 gap-1" role="list" aria-label="Best months to visit">
          {MONTHS.map((m, i) => {
            const best = dest.bestMonths.includes(i + 1);
            const on = i + 1 === month;
            return (
              <div key={m} role="listitem" className="text-center" aria-label={`${m}${best ? ", best time" : ""}`}>
                <div
                  className={`h-6 rounded-[4px] ${best ? "bg-gold" : "bg-panel2"} ${on ? "ring-2 ring-txt ring-offset-2 ring-offset-panel" : ""}`}
                />
                <span className={`mt-1 block text-[10px] ${on ? "font-bold text-txt" : "text-faint"}`}>{m[0]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function About({ title }: { title: string }) {
  const info = useWiki(title);
  if (info === null) return null;
  return (
    <div className="rounded-[28px] border border-edge bg-panel p-5 shadow-card sm:p-6">
      <h3 className="text-sm font-semibold text-txt">About {info?.title ?? "…"}</h3>
      {info ? (
        <>
          <p className="mt-2 line-clamp-6 text-sm leading-relaxed text-dim">{info.extract}</p>
          <a
            href={info.url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-accent-ink hover:underline"
          >
            Read more on Wikipedia <ExternalLink size={13} aria-hidden />
          </a>
        </>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="skeleton h-3 rounded" />
          <div className="skeleton h-3 rounded" />
          <div className="skeleton h-3 w-2/3 rounded" />
        </div>
      )}
    </div>
  );
}
