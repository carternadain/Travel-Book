"use client";

// Live info from free, keyless, CORS-friendly public APIs:
//  - Wikipedia (photos + summaries)       https://www.mediawiki.org/wiki/API:Main_page
//  - open.er-api.com (exchange rates)      https://www.exchangerate-api.com/docs/free
//  - Open-Meteo archive (real past weather) https://open-meteo.com/en/docs/historical-weather-api
// Responses are cached in localStorage so the app stays fast and polite.

import { useEffect, useState } from "react";

const TTL = {
  wiki: 1000 * 60 * 60 * 24 * 7,
  rates: 1000 * 60 * 60 * 12,
  climate: 1000 * 60 * 60 * 24 * 30,
};

function cacheGet<T>(key: string, ttl: number): T | undefined {
  try {
    const raw = localStorage.getItem("tb-cache:" + key);
    if (!raw) return undefined;
    const { t, v } = JSON.parse(raw);
    if (Date.now() - t > ttl) return undefined;
    return v as T;
  } catch {
    return undefined;
  }
}

function cacheSet(key: string, v: unknown) {
  try {
    localStorage.setItem("tb-cache:" + key, JSON.stringify({ t: Date.now(), v }));
  } catch {
    /* storage full or blocked — fine, we just refetch next time */
  }
}

const inflight = new Map<string, Promise<unknown>>();
function once<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (!inflight.has(key)) inflight.set(key, fn().finally(() => inflight.delete(key)));
  return inflight.get(key) as Promise<T>;
}

// ---------- Wikipedia ----------

export type WikiInfo = {
  title: string;
  extract: string;
  image?: string;
  thumb?: string;
  url: string;
};

const WIKI_API = "https://en.wikipedia.org/w/api.php";
const WIKI_PROPS =
  "action=query&format=json&origin=*&redirects=1&prop=extracts|pageimages&exintro=1&explaintext=1&exsentences=4&piprop=original|thumbnail&pithumbsize=900";

type WikiPage = {
  title: string;
  missing?: string;
  extract?: string;
  original?: { source: string };
  thumbnail?: { source: string };
};

function pickPage(json: { query?: { pages?: Record<string, WikiPage> } }): WikiPage | undefined {
  const pages = Object.values(json.query?.pages ?? {});
  return pages.find((p) => !("missing" in p));
}

export async function fetchWiki(title: string): Promise<WikiInfo | null> {
  const key = "wiki:" + title;
  const hit = cacheGet<WikiInfo | null>(key, TTL.wiki);
  if (hit !== undefined) return hit;
  return once(key, async () => {
    try {
      let page = pickPage(await (await fetch(`${WIKI_API}?${WIKI_PROPS}&titles=${encodeURIComponent(title)}`)).json());
      if (!page) {
        // Title drifted? Fall back to the top search hit.
        page = pickPage(
          await (
            await fetch(`${WIKI_API}?${WIKI_PROPS}&generator=search&gsrlimit=1&gsrsearch=${encodeURIComponent(title)}`)
          ).json(),
        );
      }
      const info: WikiInfo | null = page
        ? {
            title: page.title,
            extract: page.extract ?? "",
            image: page.original?.source,
            thumb: page.thumbnail?.source ?? page.original?.source,
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
          }
        : null;
      cacheSet(key, info);
      return info;
    } catch {
      return null;
    }
  });
}

export function useWiki(title: string | undefined) {
  const [info, setInfo] = useState<WikiInfo | null | undefined>(undefined);
  useEffect(() => {
    if (!title) return;
    let live = true;
    setInfo(undefined);
    fetchWiki(title).then((v) => live && setInfo(v));
    return () => {
      live = false;
    };
  }, [title]);
  return info; // undefined = loading, null = unavailable
}

// ---------- Exchange rates ----------

export type Rates = { base: "USD"; rates: Record<string, number>; updated: string; live: boolean };

// Approximate fallback (Oct 2026) used only if the live API is unreachable.
const FALLBACK_RATES: Record<string, number> = {
  USD: 1, CNY: 7.1, JOD: 0.709, BRL: 5.4, PEN: 3.6, MXN: 18.5, EUR: 0.88, INR: 85,
  EGP: 48.5, GEL: 2.7, LAK: 21500, GBP: 0.75, CAD: 1.38, AUD: 1.52, JPY: 148, KRW: 1380,
  ARS: 1450, CLP: 950, BOB: 6.91, CHF: 0.8, ISK: 125, TRY: 42, VND: 26000, IDR: 16300, ZAR: 18,
  MAD: 9.3, NZD: 1.7,
};

export async function fetchRates(): Promise<Rates> {
  const hit = cacheGet<Rates>("rates", TTL.rates);
  if (hit) return hit;
  return once("rates", async () => {
    try {
      const j = await (await fetch("https://open.er-api.com/v6/latest/USD")).json();
      if (j.result !== "success") throw new Error("rates");
      const r: Rates = { base: "USD", rates: j.rates, updated: j.time_last_update_utc, live: true };
      cacheSet("rates", r);
      return r;
    } catch {
      return { base: "USD", rates: FALLBACK_RATES, updated: "offline estimate", live: false };
    }
  });
}

export function useRates() {
  const [rates, setRates] = useState<Rates | null>(null);
  useEffect(() => {
    fetchRates().then(setRates);
  }, []);
  return rates;
}

export function toUSD(amount: number, currency: string, rates: Rates | null) {
  const r = rates?.rates[currency] ?? FALLBACK_RATES[currency] ?? 1;
  return amount / r;
}

export function fromUSD(usd: number, currency: string, rates: Rates | null) {
  const r = rates?.rates[currency] ?? FALLBACK_RATES[currency] ?? 1;
  return usd * r;
}

// ---------- Weather (real observations from the same month last year) ----------

export type Climate = { month: number; year: number; high: number; low: number; rainDays: number; rainMm: number };

export async function fetchClimate(lat: number, lng: number, month: number): Promise<Climate | null> {
  const now = new Date();
  // Most recent full occurrence of `month` that is safely in the archive.
  let year = now.getFullYear();
  if (month >= now.getMonth() + 1) year -= 1;
  const key = `climate:${lat.toFixed(2)},${lng.toFixed(2)}:${year}-${month}`;
  const hit = cacheGet<Climate>(key, TTL.climate);
  if (hit) return hit;
  return once(key, async () => {
    try {
      const mm = String(month).padStart(2, "0");
      const last = new Date(year, month, 0).getDate();
      const url =
        `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}` +
        `&start_date=${year}-${mm}-01&end_date=${year}-${mm}-${last}` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
      const j = await (await fetch(url)).json();
      const hi: number[] = j.daily.temperature_2m_max.filter((x: number | null) => x != null);
      const lo: number[] = j.daily.temperature_2m_min.filter((x: number | null) => x != null);
      const pr: number[] = j.daily.precipitation_sum.filter((x: number | null) => x != null);
      const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
      const c: Climate = {
        month,
        year,
        high: avg(hi),
        low: avg(lo),
        rainDays: pr.filter((x) => x >= 1).length,
        rainMm: pr.reduce((s, x) => s + x, 0),
      };
      cacheSet(key, c);
      return c;
    } catch {
      return null;
    }
  });
}

export function useClimate(lat: number, lng: number, month: number) {
  const [c, setC] = useState<Climate | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    setC(undefined);
    fetchClimate(lat, lng, month).then((v) => live && setC(v));
    return () => {
      live = false;
    };
  }, [lat, lng, month]);
  return c;
}

// ---------- This weekend's forecast (Open-Meteo, one batched request) ----------

export type DayForecast = { date: string; code: number; high: number; low: number; rain: number };

/** The coming Fri/Sat/Sun as yyyy-mm-dd (this weekend if it's Fri–Sun now). */
export function nextWeekend(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = d.getDay(); // 0 Sun … 6 Sat
  const back = dow === 6 ? 1 : dow === 0 ? 2 : 0;
  const fwd = dow === 5 || back ? 0 : (5 - dow + 7) % 7;
  d.setDate(d.getDate() - back + fwd);
  const iso = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  return [0, 1, 2].map((i) => iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + i)));
}

export async function fetchWeekendForecast(spots: { id: string; lat: number; lng: number }[]) {
  const days = nextWeekend();
  const key = `forecast:${days[0]}:${spots.map((s) => s.id).join(",")}`;
  const hit = cacheGet<Record<string, DayForecast[]>>(key, 1000 * 60 * 60 * 3);
  if (hit) return hit;
  return once(key, async () => {
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${spots.map((s) => s.lat.toFixed(3)).join(",")}` +
        `&longitude=${spots.map((s) => s.lng.toFixed(3)).join(",")}` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
        `&temperature_unit=fahrenheit&timezone=auto&start_date=${days[0]}&end_date=${days[2]}`;
      const j = await (await fetch(url)).json();
      const arr = Array.isArray(j) ? j : [j];
      const out: Record<string, DayForecast[]> = {};
      spots.forEach((s, i) => {
        const d = arr[i]?.daily;
        if (!d) return;
        out[s.id] = d.time.map((date: string, k: number) => ({
          date,
          code: d.weather_code[k] ?? 0,
          high: d.temperature_2m_max[k] ?? 0,
          low: d.temperature_2m_min[k] ?? 0,
          rain: d.precipitation_probability_max[k] ?? 0,
        }));
      });
      cacheSet(key, out);
      return out;
    } catch {
      return null;
    }
  });
}

export function useWeekendForecast(spots: { id: string; lat: number; lng: number }[]) {
  const [f, setF] = useState<Record<string, DayForecast[]> | null | undefined>(undefined);
  const sig = spots.map((s) => s.id).join(",");
  useEffect(() => {
    let live = true;
    fetchWeekendForecast(spots).then((v) => live && setF(v));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  return f; // undefined = loading, null = unavailable
}

/** 0–100: how nice a weekend looks — mild highs, low rain chance. */
export function niceScore(days: DayForecast[] | undefined) {
  if (!days?.length) return 0;
  const per = days.map((d) => {
    const temp = Math.max(0, 1 - Math.max(0, Math.abs(d.high - 74) - 6) / 25);
    const dry = 1 - d.rain / 100;
    const storm = d.code >= 95 ? 0.5 : d.code >= 71 && d.code <= 77 ? 0.8 : 1;
    return temp * 0.55 + dry * 0.45 * storm;
  });
  return Math.round((per.reduce((s, x) => s + x, 0) / per.length) * 100);
}

/** WMO weather code → short label. */
export function weatherLabel(code: number) {
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Cloudy";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow showers";
  return "Thunderstorms";
}

/** Fraction of the moon lit (0 = new, 1 = full) on a given date. */
export function moonIllumination(date: Date) {
  const synodic = 29.530588853;
  const knownNew = Date.UTC(2000, 0, 6, 18, 14);
  const age = ((((date.getTime() - knownNew) / 86400000) % synodic) + synodic) % synodic;
  return (1 - Math.cos((2 * Math.PI * age) / synodic)) / 2;
}
