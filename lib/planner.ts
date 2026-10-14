import { BIG_TRIPS, HOME_AIRPORTS, type Destination, type Interest, type Place, type Style } from "./data";
import { toUSD, type Rates } from "./live";

export type DayPlan = {
  day: number;
  kind: "arrive" | "wonder" | "icon" | "gem" | "free" | "depart";
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
  drive: boolean;
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

export function tripDates(month: number, days: number, weekend = false) {
  const now = new Date();
  let year = now.getFullYear();
  if (weekend) {
    // First Friday (Saturday for a 2-day trip) in that month at least 2 days away.
    const dow = days <= 2 ? 6 : 5;
    const soonest = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 2));
    for (let y = year; y <= year + 1; y++) {
      for (let day = 1; day <= 31; day++) {
        const d = new Date(Date.UTC(y, month - 1, day));
        if (d.getUTCMonth() !== month - 1) break;
        if (d.getUTCDay() === dow && d >= soonest) {
          return { start: iso(d), end: iso(new Date(d.getTime() + (days - 1) * 86400000)) };
        }
      }
    }
  }
  // Need at least ~3 weeks of lead time to plan.
  if (month - 1 < now.getMonth() || (month - 1 === now.getMonth() && now.getDate() > 1)) year += 1;
  const start = new Date(Date.UTC(year, month - 1, 10));
  const end = new Date(start.getTime() + (days - 1) * 86400000);
  return { start: iso(start), end: iso(end) };
}

function score(p: Place, interests: Interest[]) {
  return p.tags.filter((t) => interests.includes(t)).length;
}

function dayKind(places: Place[]): DayPlan["kind"] {
  if (places.some((p) => p.kind === "wonder")) return "wonder";
  if (places.some((p) => p.kind === "icon")) return "icon";
  return "gem";
}

/** Under this many miles from home, we price it as a road trip instead of flying. */
export const DRIVE_MILES = 400;

/** A Fri-Sun shape: a stop on the way in, the headline day(s), one more stop on the way out. */
function buildWeekend(dest: Destination, days: number, interests: Interest[], rand: () => number, drive: boolean): DayPlan[] {
  const ranked = dest.places
    .slice(1)
    .map((p) => ({ p, s: score(p, interests) + rand() * 0.9 }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p);
  const head = dest.places[0];
  const take = (half = true) => {
    const i = ranked.findIndex((p) => !half || p.days < 1);
    return i >= 0 ? ranked.splice(i, 1)[0] : undefined;
  };
  const plan: DayPlan[] = [];
  const firstStop = days > 2 ? take() : undefined;
  plan.push({
    day: 1,
    kind: "arrive",
    title: `${drive ? "Drive" : "Fly"} to ${dest.base.name}${firstStop ? ` · ${firstStop.name}` : ""}`,
    note: drive
      ? "Leave after lunch on Friday to beat the traffic. Get there for golden hour."
      : "Take the earliest flight you can stand, pick up the car, and you're there by lunch.",
    places: firstStop ? [firstStop] : [],
  });
  const middle = Math.max(1, days - 1);
  let first = true;
  while (plan.length < middle) {
    const lead = first ? head : take(false);
    first = false;
    if (!lead) {
      plan.push({
        day: 0,
        kind: "free",
        title: `Slow day in ${dest.base.name}`,
        note: "Sleep in, find the best breakfast in town, and ask a local for their favourite spot.",
        places: [],
      });
      continue;
    }
    const day: Place[] = [lead];
    if (lead.days < 1) {
      const pair = take();
      if (pair) day.push(pair);
    }
    plan.push({ day: 0, kind: dayKind(day), title: day.map((p) => p.name).join(" + "), note: lead.tip ?? lead.blurb, places: day });
  }
  const last = take() ?? take(false);
  plan.push({
    day: 0,
    kind: "depart",
    title: last ? `${last.name}, then home` : drive ? "Drive home" : "Fly home",
    note: drive ? "One more stop on the way out, and home before Sunday night." : "Morning stop, then back to the airport. Home for dinner.",
    places: last ? [last] : [],
  });
  return plan.map((d, i) => ({ ...d, day: i + 1 }));
}

function buildPlan(dest: Destination, days: number, interests: Interest[], rand: () => number, drive = false): DayPlan[] {
  if (dest.weekend) return buildWeekend(dest, days, interests, rand, drive);
  const plan: DayPlan[] = [];
  // The headline sight is always first; other bucket-list icons come next.
  const wonder = dest.places[0];
  const gems = dest.places
    .filter((p) => p !== wonder)
    .map((p) => ({ p, s: score(p, interests) + rand() * 0.9 + (p.kind === "gem" ? 0 : 100) }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p);

  plan.push({
    day: 1,
    kind: "arrive",
    title: drive ? `Drive to ${dest.base.name}` : `Land in ${dest.base.name}`,
    note: drive
      ? "Hit the road early, stop for snacks, and catch your first view before sunset."
      : interests.includes("food")
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
    kind: dayKind(wonderDay),
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
      kind: dayKind(day),
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
    title: drive ? "Drive home" : "Fly home",
    note: drive ? "Last breakfast, one more viewpoint, and road snacks for the drive." : "Last breakfast, souvenir run, and off to the airport.",
    places: [],
  });

  return plan.slice(0, Math.max(days, 2)).map((d, i) => ({ ...d, day: i + 1 }));
}

const GEM_FEE: Record<Style, number> = { budget: 6, mid: 18, comfort: 45 };
const FLIGHT_STYLE: Record<Style, number> = { budget: 0.88, mid: 1, comfort: 1.7 };
// A researched fare is a "book ahead" price; pad it for normal booking.
const FARE_STYLE: Record<Style, number> = { budget: 1, mid: 1.15, comfort: 1.8 };

/** Arizona regular unleaded, AAA average via azfamily.com, early October 2026. */
export const GAS = {
  usd: 4.75,
  mpg: 27,
  riders: 2,
  source: "https://www.azfamily.com/2026/10/04/gas-prices-dipped-slightly-arizona-last-week/",
};

/** Cost of driving `roundTripMiles`, per person (two people sharing one car). */
export const gasCost = (roundTripMiles: number) => ((roundTripMiles / GAS.mpg) * GAS.usd) / GAS.riders;

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
  const wk = dest.weekend;
  const fromPHX = home.code === "PHX";
  const mi = miles(home.lat, home.lng, dest.airportLat, dest.airportLng);
  const baseMi = miles(home.lat, home.lng, dest.base.lat, dest.base.lng);
  // Fly-in weekends always fly; otherwise drive anything under DRIVE_MILES from home.
  const drive = wk?.fly ? false : wk && fromPHX ? true : baseMi < DRIVE_MILES;
  const plan = buildPlan(dest, days, interests, rand, drive);
  const { start, end } = tripDates(month, days, !!wk);
  const d = dest.daily[style];
  const nights = days - 1;

  // Flights: a researched nonstop fare when we have one, else a distance-based
  // model calibrated on typical economy round trips.
  // Road trips: real road miles from Phoenix when known (else ~1.3x straight-line)
  // at this week's Arizona gas price, split between two people in the car.
  const roadMi = wk?.miles && fromPHX ? wk.miles : baseMi * 1.3;
  const peak = [6, 7, 8, 12].includes(month) ? 1.15 : 1;
  const knownFare = wk?.fly && fromPHX ? wk.fly : undefined;
  const flight = drive
    ? gasCost(roadMi * 2)
    : knownFare
      ? knownFare.fare * FARE_STYLE[style] * peak
      : (150 + 0.14 * mi) * FLIGHT_STYLE[style] * peak;

  const visited = plan.flatMap((p) => p.places);
  type Item = NonNullable<CostLine["items"]>[number];
  const ticketItems = visited.flatMap((p): Item[] =>
    p.tickets?.length
      ? p.tickets.map((t) => ({
          label: t.perDay ? `${t.label} × ${days} days` : t.label,
          usd: toUSD(t.amount * (t.perDay ? days : 1), t.currency, rates),
          local:
            t.currency === "USD"
              ? undefined
              : `${(t.amount * (t.perDay ? days : 1)).toLocaleString()} ${t.currency}`,
          source: t.source,
          note: t.note,
        }))
      : dest.weekend
        ? [{ label: p.name, usd: 0, note: "Free" }]
        : [{ label: `${p.name} (fees, guide or transport)`, usd: GEM_FEE[style], note: "Estimate" }],
  );
  const tickets = ticketItems.reduce((s, t) => s + t.usd, 0);

  const costs: CostLine[] = [
    {
      key: "flights",
      label: drive ? "Gas (road trip)" : "Flights",
      usd: flight,
      low: flight * (drive ? 0.85 : 0.75),
      high: flight * (drive ? 1.25 : 1.35),
      detail: drive
        ? `${Math.round(roadMi).toLocaleString()} mi each way${wk?.hours && fromPHX ? ` (${fmtHours(wk.hours)})` : ""} · $${GAS.usd.toFixed(2)}/gal, ${GAS.mpg} mpg, split 2 ways`
        : `${home.code} → ${dest.airport} round trip${knownFare ? `, nonstop from $${knownFare.fare}` : `, ${Math.round(mi).toLocaleString()} mi each way`}${style === "comfort" ? ", premium economy" : ""}`,
      items: drive
        ? [{
            label: `${Math.round(roadMi * 2).toLocaleString()} mi ÷ ${GAS.mpg} mpg × $${GAS.usd.toFixed(2)} ÷ ${GAS.riders} people`,
            usd: flight,
            note: "AAA Arizona average this week",
            source: GAS.source,
          }]
        : knownFare
          ? [{ label: `Researched fare ${home.code} ⇄ ${dest.airport}`, usd: knownFare.fare, note: knownFare.note, source: knownFare.source }]
          : undefined,
    },
    {
      key: "stay",
      label: "Stay",
      usd: d.stay * nights,
      low: d.stay * nights * 0.8,
      high: d.stay * nights * 1.25,
      detail: wk
        ? `${nights} night${nights === 1 ? "" : "s"} × $${d.stay * 2} room incl. tax, split 2 ways (${style === "budget" ? "motel / campsite" : style === "mid" ? "inn or 3★ hotel" : "boutique hotel"})`
        : `${nights} nights × $${d.stay}/night (${style === "budget" ? "hostel / guesthouse" : style === "mid" ? "3★ hotel" : "4–5★ hotel"})`,
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
      detail: wk?.fly
        ? `${days} days × $${d.local}/day (rental car split 2 ways + gas)`
        : wk
          ? `${days} days × $${d.local}/day (local driving, parking${dest.countryCode === "MX" ? ", Mexican car insurance" : ""})`
          : `${days} days × $${d.local}/day (transit, taxis, day-trip transport)`,
    },
    {
      key: "tickets",
      label: "Tickets & tours",
      usd: tickets,
      low: tickets * 0.95,
      high: tickets * 1.15,
      detail: `${ticketItems.filter((t) => t.usd > 0).length} paid, ${ticketItems.filter((t) => t.usd === 0).length} free · ${rates?.live ? "today's" : "approximate"} exchange rates`,
      items: ticketItems,
    },
  ];

  const total = costs.reduce((s, c) => s + c.usd, 0);
  const low = costs.reduce((s, c) => s + c.low, 0);
  const high = costs.reduce((s, c) => s + c.high, 0);

  const sq = start.replace(/-/g, "").slice(2);
  const eq = end.replace(/-/g, "").slice(2);
  const links = drive
    ? [
        {
          label: "Google Maps",
          href: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(home.city)}&destination=${encodeURIComponent(`${dest.base.lat},${dest.base.lng}`)}`,
          hint: "Driving route",
        },
        {
          label: "Recreation.gov",
          href: "https://www.recreation.gov/",
          hint: "Campsites & permits",
        },
      ]
    : [];
  links.push(
    ...[
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
    ].filter((l) => !(drive && /Flights|Skyscanner/.test(l.label))),
  );

  return { dest, days, style, month, seed, start, end, plan, costs, total, low, high, miles: drive ? roadMi : mi, drive, links };
}

/** Pick a destination that fits — favours wonders you haven't seen and good-weather months. */
export const fmtHours = (h: number) => {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return mm ? `${hh}h ${mm}m` : `${hh}h`;
};

export function suggestDestination(opts: {
  month: number;
  interests: Interest[];
  visitedPlaceIds: string[];
  rand: () => number;
  wondersOnly?: boolean;
  exclude?: string;
}): Destination {
  const pool = BIG_TRIPS.filter((d) => d.id !== opts.exclude && (!opts.wondersOnly || d.wonder));
  const scored = pool.map((d) => {
    let s = opts.rand() * 3;
    const icons = d.places.filter((p) => p.kind !== "gem");
    if (icons.some((p) => !opts.visitedPlaceIds.includes(p.id))) s += d.wonder ? 3 : 2.5;
    if (d.bestMonths.includes(opts.month)) s += 2.5;
    s += d.places.reduce((acc, p) => acc + score(p, opts.interests), 0) / d.places.length;
    return { d, s };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored[0].d;
}
