"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import {
  ArrowRight, Car, Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSun, Info, Moon, Plane, Snowflake, Sun,
} from "lucide-react";
import { DESTINATIONS, HOME_AIRPORTS, type Destination } from "@/lib/data";
import { VIBES, type Vibe } from "@/lib/weekends";
import { buildTrip, fmtHours, GAS, MONTHS_LONG, type Trip } from "@/lib/planner";
import { moonIllumination, nextWeekend, niceScore, useRates, useWeekendForecast, weatherLabel, type DayForecast } from "@/lib/live";
import { selectSettings, useStore } from "@/lib/store";
import { money } from "@/lib/format";
import { Chip, EASE, Eyebrow, Reveal } from "./ui";
import { SplitWords, Tilt } from "./motion";
import { InkStroke, Seigaiha, SeasonalParticles } from "./Japan";
import { WikiImage } from "./WikiImage";
import { Flag } from "./Flag";
import type { MapStop } from "./TripMap";

const TripMap = dynamic(() => import("./TripMap"), { ssr: false, loading: () => <div className="skeleton h-full w-full" /> });

export const WEEKEND_TRIPS = DESTINATIONS.filter((d) => d.weekend);

type Mode = "all" | "drive" | "fly";
type Sort = "weather" | "price" | "near";

export function WeatherIcon({ code, size = 14, className = "" }: { code: number; size?: number; className?: string }) {
  const I =
    code === 0 ? Sun
    : code <= 2 ? CloudSun
    : code === 3 ? Cloud
    : code <= 48 ? CloudFog
    : code <= 57 ? CloudDrizzle
    : code <= 67 || (code >= 80 && code <= 82) ? CloudRain
    : code <= 86 ? Snowflake
    : CloudLightning;
  return <I size={size} className={className} aria-label={weatherLabel(code)} />;
}

const fmtDay = (iso: string, opts: Intl.DateTimeFormatOptions) => new Date(iso + "T12:00:00").toLocaleDateString("en-US", opts);

/** Shared data for the weekend views: forecasts, per-person cost, moon. */
export function useWeekendData() {
  const settings = useStore(selectSettings);
  const rates = useRates();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  const days = useMemo(() => (now ? nextWeekend(now) : null), [now]);
  const spots = useMemo(() => WEEKEND_TRIPS.map((d) => ({ id: d.id, lat: d.base.lat, lng: d.base.lng })), []);
  const forecast = useWeekendForecast(spots);
  const month = (now?.getMonth() ?? 9) + 1;
  const trips = useMemo(() => {
    const m: Record<string, Trip> = {};
    for (const d of WEEKEND_TRIPS) {
      m[d.id] = buildTrip({ dest: d, days: 3, style: settings.style, month, interests: ["nature", "food", "culture"], home: settings.home, seed: 1, rates });
    }
    return m;
  }, [settings.style, settings.home, month, rates]);
  const moon = days ? moonIllumination(new Date(days[1] + "T22:00:00")) : 0.5;
  return { settings, rates, days, forecast, trips, month, moon };
}

export function Weekends() {
  const { settings, rates, days, forecast, trips, month, moon } = useWeekendData();
  const router = useRouter();
  const home = HOME_AIRPORTS.find((a) => a.code === settings.home) ?? HOME_AIRPORTS[0];
  const [mode, setMode] = useState<Mode>("all");
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [sort, setSort] = useState<Sort>("weather");

  const scored = useMemo(
    () => WEEKEND_TRIPS.map((d) => ({ d, nice: niceScore(forecast?.[d.id]), cost: trips[d.id]?.total ?? 0, time: d.weekend!.fly ? d.weekend!.fly.hours + 1.5 : (d.weekend!.hours ?? 9) })),
    [forecast, trips],
  );
  const best = useMemo(() => (forecast ? [...scored].sort((a, b) => b.nice - a.nice)[0] : undefined), [scored, forecast]);

  const list = useMemo(() => {
    const l = scored.filter(({ d }) => {
      const w = d.weekend!;
      if (mode === "drive" && w.fly) return false;
      if (mode === "fly" && !w.fly) return false;
      if (vibe && !w.vibes.includes(vibe)) return false;
      return true;
    });
    l.sort((a, b) =>
      sort === "price" ? a.cost - b.cost : sort === "near" ? a.time - b.time : b.nice - a.nice || a.time - b.time,
    );
    return l;
  }, [scored, mode, vibe, sort]);

  const stops = useMemo<MapStop[]>(
    () => [
      { lat: home.lat, lng: home.lng, label: `Home: ${home.city}`, kind: "base", n: "⌂" },
      ...WEEKEND_TRIPS.map((d) => ({
        lat: d.base.lat,
        lng: d.base.lng,
        label: `${d.name} · ${d.weekend!.fly ? `✈ ${fmtHours(d.weekend!.fly.hours)}` : `${fmtHours(d.weekend!.hours ?? 0)} drive`}`,
        kind: d.weekend!.fly ? ("wonder" as const) : ("gem" as const),
        n: d.weekend!.fly ? "✈" : "",
        id: d.id,
      })),
    ],
    [home],
  );

  const range = days ? `${fmtDay(days[0], { weekday: "short", month: "short", day: "numeric" })} – ${fmtDay(days[2], { weekday: "short", day: "numeric" })}` : "…";

  return (
    <div className="space-y-14 md:space-y-20">
      {/* Hero */}
      <header className="relative -mx-4 overflow-hidden px-4 pb-6 pt-6 sm:-mx-6 sm:px-6 md:pt-10">
        <div className="aurora pointer-events-none absolute -inset-x-20 -top-24 h-[420px] -z-10" aria-hidden />
        <SeasonalParticles count={10} className="-z-10" />
        <Eyebrow jp="週末">Weekend getaways</Eyebrow>
        <h1 className="font-display mt-3 max-w-3xl text-[clamp(40px,7.5vw,84px)] leading-[0.98] text-txt">
          <SplitWords text="Don't spend another weekend" />{" "}
          <span className="relative inline-block text-accent-ink">
            <SplitWords text="on the couch." delay={0.28} />
            <InkStroke className="absolute -bottom-1 left-0 h-3 w-full text-accent/60" delay={0.9} />
          </span>
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.5 }}
          className="mt-5 max-w-xl text-[16px] leading-relaxed text-dim sm:text-[17px]"
        >
          {WEEKEND_TRIPS.filter((d) => !d.weekend!.fly).length} hidden gems you can drive to on a Friday afternoon, and{" "}
          {WEEKEND_TRIPS.filter((d) => d.weekend!.fly).length} short nonstop flights from {home.code === "PHX" ? "Phoenix" : home.city}.
          Priced with this week&apos;s Arizona gas, real fares and real entry fees.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.65 }}
          className="mt-6 flex flex-wrap gap-2 text-sm"
        >
          <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-edge bg-panel px-4 font-medium text-txt tabular-nums">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden /> This weekend · {range}
          </span>
          <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-edge bg-panel px-4 text-dim tabular-nums">
            <Moon size={14} aria-hidden /> Moon {Math.round(moon * 100)}% lit{moon < 0.25 ? " · great for stars" : ""}
          </span>
          <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-edge bg-panel px-4 text-dim tabular-nums">
            <Car size={14} aria-hidden /> Gas ${GAS.usd.toFixed(2)}/gal
          </span>
        </motion.div>
      </header>

      {/* Best bet */}
      <section aria-label="Best bet this weekend">
        <Reveal>
          <Eyebrow jp="壱">Best bet this weekend</Eyebrow>
        </Reveal>
        <div className="mt-4">
          {best ? (
            <FeaturedWeekend d={best.d} trip={trips[best.d.id]} days={forecast?.[best.d.id]} nice={best.nice} currency={settings.currency} rates={rates} />
          ) : forecast === null ? (
            <p className="rounded-[28px] border border-edge bg-panel p-6 text-sm text-dim">Couldn&apos;t load this weekend&apos;s forecast. Everything below still works.</p>
          ) : (
            <div className="skeleton h-[420px] rounded-[28px] sm:h-[360px]" />
          )}
        </div>
      </section>

      {/* Browse */}
      <section aria-label="All weekend getaways">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow jp="弐">Pick your escape</Eyebrow>
            <h2 className="font-display mt-2 text-4xl md:text-5xl">Two days. No PTO.</h2>
          </div>
          <label className="flex items-center gap-2 text-sm text-dim">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="min-h-10 rounded-full border border-edge bg-panel px-3 text-sm font-medium text-txt"
            >
              <option value="weather">Best weather</option>
              <option value="price">Cheapest</option>
              <option value="near">Closest</option>
            </select>
          </label>
        </Reveal>

        <div className="mt-5 flex flex-col gap-3">
          <div className="grid w-full max-w-sm grid-cols-3 gap-1 rounded-full bg-panel2 p-1" role="radiogroup" aria-label="How you get there">
            {([
              ["all", "All", null],
              ["drive", "Drive", Car],
              ["fly", "Short flight", Plane],
            ] as const).map(([id, label, Icon]) => {
              const on = mode === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setMode(id)}
                  className="relative flex min-h-10 items-center justify-center gap-1.5 rounded-full text-sm font-semibold"
                >
                  {on && (
                    <motion.span layoutId="wk-mode" className="absolute inset-0 rounded-full bg-panel shadow-card" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                  )}
                  {Icon && <Icon size={14} className={`relative ${on ? "text-accent-ink" : "text-faint"}`} aria-hidden />}
                  <span className={`relative ${on ? "text-txt" : "text-dim"}`}>{label}</span>
                </button>
              );
            })}
          </div>
          <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="group" aria-label="Vibe">
            <Chip on={vibe === null} onClick={() => setVibe(null)} className="shrink-0">
              Any vibe
            </Chip>
            {VIBES.map((v) => (
              <Chip key={v.id} on={vibe === v.id} onClick={() => setVibe(vibe === v.id ? null : v.id)} className="shrink-0">
                <span lang="ja" aria-hidden className="jp text-[13px] tracking-normal">{v.jp}</span> {v.label}
              </Chip>
            ))}
          </div>
        </div>

        <LayoutGroup>
          <motion.ul layout className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {list.map(({ d, nice }, i) => (
                <motion.li
                  key={d.id}
                  layout
                  initial={{ opacity: 0, y: 24, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.6, ease: EASE, delay: Math.min(i, 8) * 0.04 }}
                >
                  <WeekendCard
                    d={d}
                    trip={trips[d.id]}
                    days={forecast?.[d.id]}
                    loading={forecast === undefined}
                    nice={nice}
                    best={best?.d.id === d.id}
                    month={month}
                    moon={moon}
                    currency={settings.currency}
                    rates={rates}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
          {list.length === 0 && <p className="py-10 text-center text-sm text-dim">Nothing matches that combo. Try another vibe.</p>}
        </LayoutGroup>
      </section>

      {/* Map */}
      <Reveal className="relative overflow-hidden rounded-[28px] border border-edge bg-panel shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5 sm:px-6">
          <div>
            <Eyebrow jp="参">The map</Eyebrow>
            <h2 className="font-display mt-1 text-2xl sm:text-3xl">All within a weekend of {home.city}</h2>
          </div>
          <ul className="flex gap-3 text-xs text-dim">
            <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sea" aria-hidden />Drive</li>
            <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-gold" aria-hidden />Short flight</li>
          </ul>
        </div>
        <div className="mt-4 h-[380px] sm:h-[480px]">
          <TripMap stops={stops} route={false} className="h-full w-full" onSelect={(id) => router.push(`/plan?dest=${id}&days=3`)} />
        </div>
      </Reveal>

      <p className="flex gap-2 rounded-2xl bg-panel2 p-4 text-xs leading-relaxed text-dim">
        <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          Costs are per person for a Fri–Sun trip in {MONTHS_LONG[month - 1]}, two people sharing a room and a car, in your
          travel style ({settings.style === "budget" ? "backpacker" : settings.style === "mid" ? "comfortable" : "treat yourself"}).
          Gas is this week&apos;s AAA Arizona average at {GAS.mpg} mpg. Fares are researched nonstop prices from PHX (tap
          a trip, then the Flights line, for the source). Forecasts are live from Open-Meteo.
        </span>
      </p>
    </div>
  );
}

function Forecast({ days, loading, dense = false }: { days?: DayForecast[]; loading?: boolean; dense?: boolean }) {
  if (loading) return <div className="skeleton h-12 rounded-xl" />;
  if (!days?.length) return <p className="text-xs text-faint">Forecast unavailable</p>;
  return (
    <ul className={`grid grid-cols-3 gap-1.5 ${dense ? "" : "sm:gap-2"}`} aria-label="Forecast this weekend">
      {days.map((d) => (
        <li key={d.date} className="flex flex-col items-center rounded-xl bg-panel2 px-1 py-1.5 text-center">
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-faint">{fmtDay(d.date, { weekday: "short" })}</span>
          <WeatherIcon code={d.code} size={16} className="my-0.5 text-dim" />
          <span className="text-[13px] font-semibold text-txt tabular-nums">
            {Math.round(d.high)}°<span className="font-normal text-faint">/{Math.round(d.low)}°</span>
          </span>
          {d.rain >= 20 && <span className="text-[10px] text-ai tabular-nums">{d.rain}% rain</span>}
        </li>
      ))}
    </ul>
  );
}

function Getting({ d }: { d: Destination }) {
  const w = d.weekend!;
  return w.fly ? (
    <span className="inline-flex items-center gap-1.5">
      <Plane size={13} aria-hidden /> {fmtHours(w.fly.hours)} nonstop
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 tabular-nums">
      <Car size={13} aria-hidden /> {fmtHours(w.hours ?? 0)} · {w.miles} mi
    </span>
  );
}

function WeekendCard({
  d, trip, days, loading, nice, best, month, moon, currency, rates,
}: {
  d: Destination;
  trip?: Trip;
  days?: DayForecast[];
  loading: boolean;
  nice: number;
  best: boolean;
  month: number;
  moon: number;
  currency: string;
  rates: ReturnType<typeof useRates>;
}) {
  const hero = d.places[0];
  const w = d.weekend!;
  const stars = w.vibes.includes("stars") && moon < 0.3;
  return (
    <Tilt max={5} className="h-full">
      <Link
        href={`/plan?dest=${d.id}&days=3`}
        className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-edge bg-panel shadow-card transition-shadow duration-500 hover:shadow-lift"
      >
        <div className="relative aspect-[16/10] overflow-hidden">
          <WikiImage title={hero.wiki} photo={hero.photo} alt={hero.name} className="h-full w-full transition-transform duration-[1.2s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.06]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/10" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
              <Getting d={d} />
            </span>
            {best && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-on-accent">
                <Sun size={11} aria-hidden /> Best this weekend
              </span>
            )}
          </div>
          <div className="absolute inset-x-0 bottom-0 p-3.5 text-white">
            <p className="text-[11px] font-medium text-white/85">
              <Flag cc={d.countryCode} /> {d.country}
            </p>
            <h3 className="font-display text-[26px] leading-tight">{d.name}</h3>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-3 p-4">
          <p className="line-clamp-2 text-sm leading-snug text-dim">{d.pitch}</p>
          <Forecast days={days} loading={loading} />
          <div className="mt-auto flex items-end justify-between gap-2 pt-1">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-faint">Fri–Sun, per person</p>
              <p className="font-display text-2xl leading-tight text-txt tabular-nums">
                {trip ? money(trip.total, currency, rates) : "…"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 text-[11px] font-medium">
              {stars && (
                <span className="inline-flex items-center gap-1 text-ai">
                  <Moon size={11} aria-hidden /> Dark skies
                </span>
              )}
              {d.bestMonths.includes(month) ? (
                <span className="text-matcha">Great in {MONTHS_LONG[month - 1].slice(0, 3)}</span>
              ) : (
                <span className="text-faint">Best {d.bestMonths.slice(0, 3).map((m) => MONTHS_LONG[m - 1].slice(0, 3)).join(", ")}</span>
              )}
              {!loading && days?.length ? <span className="text-faint tabular-nums">Weather {nice}/100</span> : null}
            </div>
          </div>
        </div>
      </Link>
    </Tilt>
  );
}

function FeaturedWeekend({
  d, trip, days, nice, currency, rates,
}: {
  d: Destination;
  trip?: Trip;
  days?: DayForecast[];
  nice: number;
  currency: string;
  rates: ReturnType<typeof useRates>;
}) {
  const hero = d.places[0];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: EASE }}
      className="relative grid overflow-hidden rounded-[28px] border border-edge bg-panel shadow-lift md:grid-cols-[1.25fr_1fr]"
    >
      <div className="relative min-h-[260px] overflow-hidden md:min-h-[380px]">
        <motion.div className="absolute inset-0" initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: 2.4, ease: EASE }}>
          <WikiImage title={hero.wiki} photo={hero.photo} alt={hero.name} large className="h-full w-full" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-black/10" />
        <span className="jp vertical absolute right-4 top-4 hidden text-2xl font-bold text-white/90 drop-shadow md:block" lang="ja" aria-hidden>
          今週末
        </span>
        <div className="absolute bottom-4 left-4 right-4 text-white md:hidden">
          <h3 className="font-display text-4xl leading-none">{d.name}</h3>
        </div>
      </div>
      <div className="relative flex flex-col gap-4 p-5 sm:p-7">
        <Seigaiha className="absolute inset-0 text-edge opacity-50 [mask-image:linear-gradient(to_top,black,transparent_60%)]" />
        <div className="relative">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-medium text-dim">
            <span><Flag cc={d.countryCode} /> {d.region}</span>
          </p>
          <h3 className="font-display mt-1 hidden text-5xl leading-none text-txt md:block">{d.name}</h3>
          <p className="mt-3 text-[15px] leading-relaxed text-dim">{d.pitch}</p>
        </div>
        <div className="relative">
          <Forecast days={days} />
        </div>
        <dl className="relative grid grid-cols-3 gap-2 text-center">
          {[
            { k: "Per person", v: trip ? money(trip.total, currency, rates) : "…" },
            { k: d.weekend!.fly ? "Flight" : "Drive", v: d.weekend!.fly ? fmtHours(d.weekend!.fly.hours) : fmtHours(d.weekend!.hours ?? 0) },
            { k: "Weather", v: `${nice}/100` },
          ].map((s) => (
            <div key={s.k} className="rounded-2xl border border-edge bg-panel px-2 py-2.5">
              <dd className="font-display text-xl text-txt tabular-nums">{s.v}</dd>
              <dt className="text-[11px] text-faint">{s.k}</dt>
            </div>
          ))}
        </dl>
        <Link
          href={`/plan?dest=${d.id}&days=3`}
          className="shimmer group relative mt-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 text-[15px] font-semibold text-on-accent shadow-card transition-transform hover:-translate-y-0.5 active:scale-95"
        >
          Plan this weekend <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" aria-hidden />
        </Link>
      </div>
    </motion.div>
  );
}
