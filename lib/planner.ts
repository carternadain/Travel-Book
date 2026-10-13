import { DESTINATIONS, HOME_AIRPORTS, type Destination, type Interest, type Place, type Style } from "./data";
import { toUSD, type Rates } from "./live";

export type DayPlan = {
  day: number;
  kind: "arrive" | "wonder" | "gem" | "free" | "depart";
  title: string;
  note: string;
  places: Place[];
};

export type CostKey = "flights" | "stay" | "food" | "local" | "tickets";

export type CostLine = {
  key: CostKey;
  label: string;
  usd: number;
  low: number;
  high: number;
  detail: string;
  items?: { label: string; usd: number; local?: string; source?: string; note?: string }[];
};

export type Trip = {
  dest: Destination;
  days: number;
  style: Style;
  month: number;
  seed: number;
  start: string; // yyyy-mm-dd
  end: string;
  plan: DayPlan[];
  costs: CostLine[];
  total: number;
  low: number;
  high: number;
  miles: number;
  links: { label: string; href: string; hint: string }[];
};

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function miles(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

function tripDates(month: number, days: number) {
  const now = new Date();
  let year = now.getFullYear();
  // Need at least ~3 weeks of lead time to plan.
  if (month - 1 < now.getMonth() || (month - 1 === now.getMonth() && now.getDate() > 1)) year += 1;
  const start = new Date(Date.UTC(year, month - 1, 10));
  const end = new Date(start.getTime() + (days - 1) * 86400000);
  return { start: iso(start), end: iso(end) };
}

function score(p: Place, interests: Interest[]) {
  return p.tags.filter((t) => interests.includes(t)).length;
}

function buildPlan(dest: Destination, days: number, interests: Interest[], rand: () => number): DayPlan[] {
  const plan: DayPlan[] = [];
  const wonder = dest.places.find((p) => p.kind === "wonder") ?? dest.places[0];
  const gems = dest.places
    .filter((p) => p !== wonder)
    .map((p) => ({ p, s: score(p, interests) + rand() * 0.9 }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p);

  plan.push({
    day: 1,
    kind: "arrive",
    title: `Land in ${dest.base.name}`,
    note: interests.includes("food")
      ? "Check in, then find the nearest market for a first-night food crawl."
      : "Check in, shake off the flight, and take an easy evening walk.",
    places: [],
  });

  if (dest.id === "cusco" && days >= 6) {
    plan.push({
      day: 0,
      kind: "free",
      title: "Acclimatize in Cusco",
      note: "Cusco sits at 3,400m. Go slow: San Pedro market, coca tea, the Plaza de Armas.",
      places: [],
    });
  }

  // Wonder day — pair a half-day wonder with a half-day gem.
  const wonderDay: Place[] = [wonder];
  if (wonder.days < 1) {
    const i = gems.findIndex((g) => g.days < 1);
    if (i >= 0) wonderDay.push(...gems.splice(i, 1));
  }
  plan.push({
    day: 0,
    kind: dest.wonder ? "wonder" : "gem",
    title: wonder.name + (wonderDay[1] ? ` + ${wonderDay[1].name}` : ""),
    note: wonder.tip ?? wonder.blurb,
    places: wonderDay,
  });

  // Fill the middle with gems, packing half-days in pairs.
  const middle = days - 1; // last day is departure
  while (plan.length < middle && gems.length) {
    const first = gems.shift()!;
    const day: Place[] = [first];
    if (first.days < 1) {
      const i = gems.findIndex((g) => g.days < 1);
      if (i >= 0) day.push(...gems.splice(i, 1));
    }
    plan.push({
      day: 0,
      kind: "gem",
      title: day.map((p) => p.name).join(" + "),
      note: first.tip ?? first.blurb,
      places: day,
    });
  }

  const freeIdeas = [
    { title: `Wander ${dest.base.name}`, note: "No plan. Get lost in side streets, sit in a café, people-watch." },
    { title: "Food day", note: "Take a cooking class or a street-food tour with a local." },
    { title: "Slow morning, sunset spot", note: "Sleep in, then find the best sunset view in town." },
    { title: "Day trip of your choice", note: "Ask your host for their favourite place nobody visits." },
  ];
  let f = Math.floor(rand() * freeIdeas.length);
  while (plan.length < middle) {
    const idea = freeIdeas[f++ % freeIdeas.length];
    plan.push({ day: 0, kind: "free", ...idea, places: [] });
  }

  plan.push({
    day: 0,
    kind: "depart",
    title: "Fly home",
    note: "Last breakfast, souvenir run, and off to the airport.",
    places: [],
  });

  return plan.slice(0, Math.max(days, 2)).map((d, i) => ({ ...d, day: i + 1 }));
}

const GEM_FEE: Record<Style, number> = { budget: 6, mid: 18, comfort: 45 };
const FLIGHT_STYLE: Record<Style, number> = { budget: 0.88, mid: 1, comfort: 1.7 };

export function buildTrip(opts: {
  dest: Destination;
  days: number;
  style: Style;
  month: number;
  interests: Interest[];
  home: string;
  seed: number;
  rates: Rates | null;
}): Trip {
  const { dest, days, style, month, interests, seed, rates } = opts;
  const home = HOME_AIRPORTS.find((a) => a.code === opts.home) ?? HOME_AIRPORTS[0];
  const rand = rng(seed);
  const plan = buildPlan(dest, days, interests, rand);
  const { start, end } = tripDates(month, days);
  const d = dest.daily[style];
  const nights = days - 1;

  // Flights: distance-based model calibrated on typical economy round trips.
  const mi = miles(home.lat, home.lng, dest.airportLat, dest.airportLng);
  const peak = [6, 7, 8, 12].includes(month) ? 1.15 : 1;
  const flight = (150 + 0.14 * mi) * FLIGHT_STYLE[style] * peak;

  const visited = plan.flatMap((p) => p.places);
  type Item = NonNullable<CostLine["items"]>[number];
  const ticketItems = visited.flatMap((p): Item[] =>
    p.tickets?.length
      ? p.tickets.map((t) => ({
          label: t.label,
          usd: toUSD(t.amount, t.currency, rates),
          local: t.currency === "USD" ? undefined : `${t.amount.toLocaleString()} ${t.currency}`,
          source: t.source,
          note: t.note,
        }))
      : [{ label: `${p.name} (fees, guide or transport)`, usd: GEM_FEE[style], note: "Estimate" }],
  );
  const tickets = ticketItems.reduce((s, t) => s + t.usd, 0);

  const costs: CostLine[] = [
    {
      key: "flights",
      label: "Flights",
      usd: flight,
      low: flight * 0.75,
      high: flight * 1.35,
      detail: `${home.code} → ${dest.airport} round trip, ${Math.round(mi).toLocaleString()} mi each way${style === "comfort" ? ", premium economy" : ""}`,
    },
    {
      key: "stay",
      label: "Stay",
      usd: d.stay * nights,
      low: d.stay * nights * 0.8,
      high: d.stay * nights * 1.25,
      detail: `${nights} nights × $${d.stay}/night (${style === "budget" ? "hostel / guesthouse" : style === "mid" ? "3★ hotel" : "4–5★ hotel"})`,
    },
    {
      key: "food",
      label: "Food",
      usd: d.food * days,
      low: d.food * days * 0.8,
      high: d.food * days * 1.3,
      detail: `${days} days × $${d.food}/day`,
    },
    {
      key: "local",
      label: "Getting around",
      usd: d.local * days,
      low: d.local * days * 0.8,
      high: d.local * days * 1.3,
      detail: `${days} days × $${d.local}/day (transit, taxis, day-trip transport)`,
    },
    {
      key: "tickets",
      label: "Tickets & tours",
      usd: tickets,
      low: tickets * 0.95,
      high: tickets * 1.15,
      detail: `${ticketItems.length} entries, converted at ${rates?.live ? "today's" : "approximate"} exchange rates`,
      items: ticketItems,
    },
  ];

  const total = costs.reduce((s, c) => s + c.usd, 0);
  const low = costs.reduce((s, c) => s + c.low, 0);
  const high = costs.reduce((s, c) => s + c.high, 0);

  const sq = start.replace(/-/g, "").slice(2);
  const eq = end.replace(/-/g, "").slice(2);
  const links = [
    {
      label: "Google Flights",
      href: `https://www.google.com/travel/flights?q=${encodeURIComponent(`Flights from ${home.code} to ${dest.airport} on ${start} through ${end}`)}`,
      hint: "Live fares",
    },
    {
      label: "Skyscanner",
      href: `https://www.skyscanner.com/transport/flights/${home.code.toLowerCase()}/${dest.airport.toLowerCase()}/${sq}/${eq}/`,
      hint: "Cheapest-month view",
    },
    {
      label: "Booking.com",
      href: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(dest.base.name)}&checkin=${start}&checkout=${end}`,
      hint: `Stays in ${dest.base.name}`,
    },
    {
      label: "Hostelworld",
      href: `https://www.hostelworld.com/find?search_keywords=${encodeURIComponent(dest.base.name)}`,
      hint: "Budget beds",
    },
  ];

  return { dest, days, style, month, seed, start, end, plan, costs, total, low, high, miles: mi, links };
}

/** Pick a destination that fits — favours wonders you haven't seen and good-weather months. */
export function suggestDestination(opts: {
  month: number;
  interests: Interest[];
  visitedPlaceIds: string[];
  rand: () => number;
  wondersOnly?: boolean;
  exclude?: string;
}): Destination {
  const pool = DESTINATIONS.filter((d) => d.id !== opts.exclude && (!opts.wondersOnly || d.wonder));
  const scored = pool.map((d) => {
    let s = opts.rand() * 3;
    if (d.wonder && !opts.visitedPlaceIds.includes(d.wonder)) s += 3;
    if (d.bestMonths.includes(opts.month)) s += 2.5;
    s += d.places.reduce((acc, p) => acc + score(p, opts.interests), 0) / d.places.length;
    return { d, s };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored[0].d;
}
