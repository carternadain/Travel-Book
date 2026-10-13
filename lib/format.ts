import { fromUSD, type Rates } from "./live";

export function money(usd: number, currency: string, rates: Rates | null, compact = false) {
  const v = fromUSD(usd, currency, rates);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    notation: compact && v >= 10000 ? "compact" : "standard",
  }).format(v);
}

export function asset(path: string) {
  return (process.env.NEXT_PUBLIC_BASE_PATH || "") + path;
}

export function flag(cc: string) {
  return cc
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}
