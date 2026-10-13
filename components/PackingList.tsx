"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Backpack, Check } from "lucide-react";
import type { Destination } from "@/lib/data";
import { useClimate } from "@/lib/live";
import type { Trip } from "@/lib/planner";

type Item = { id: string; label: string; why?: string };

const HIGH_ALTITUDE = new Set(["cusco", "uyuni", "swiss-alps"]);
const MODEST_DRESS = /\b(temple|hagia|taj|angkor|fushimi|sagrada|wat|mosque|church|chapelle|monastery|stupa|pagoda)\b/i;
const WATER = /beach|reef|bay|lagoon|pool|falls|cenote|island|coast|sound|lake/i;

function buildList(dest: Destination, trip: Trip, climate: { high: number; low: number; rainDays: number } | null | undefined): Item[] {
  const items: Item[] = [];
  const add = (id: string, label: string, why?: string) => items.push({ id, label, why });
  const stops = trip.plan.flatMap((d) => d.places);
  const tags = new Set(stops.flatMap((p) => p.tags));
  const names = stops.map((p) => `${p.name} ${p.wiki}`).join(" ");
  const domestic = dest.countryCode === "US";

  if (!domestic) add("passport", "Passport (6+ months validity)", "Most countries require it");
  if (!["US", "CA", "MX", "JP"].includes(dest.countryCode)) add("adapter", "Universal plug adapter", `${dest.country} uses different outlets`);
  add("shoes", "Broken-in walking shoes");
  add("charger", "Phone, charger & power bank");
  if (!domestic) add("card", "No-foreign-fee card + a little cash", `${dest.currency} for small vendors`);

  if (climate) {
    if (climate.high >= 27) {
      add("sun", "Sunscreen, sunglasses & a hat", `Highs around ${Math.round((climate.high * 9) / 5 + 32)}°F`);
      add("light", "Light, breathable clothes");
    }
    if (climate.low <= 8) add("warm", "Warm layer or puffer jacket", `Lows around ${Math.round((climate.low * 9) / 5 + 32)}°F`);
    if (climate.low <= 0) add("winter", "Beanie & gloves", "Below freezing at night");
    if (climate.rainDays >= 6) add("rain", "Packable rain jacket", `${climate.rainDays} rainy days last year`);
  }
  if (tags.has("adventure") || tags.has("nature")) {
    add("daypack", "Daypack & refillable water bottle");
    add("hiking", "Trail shoes or hiking boots", "There are hikes on this trip");
  }
  if (WATER.test(names)) add("swim", "Swimsuit & quick-dry towel", "Water stops on the itinerary");
  if (MODEST_DRESS.test(names)) add("modest", "Something that covers shoulders & knees", "Required at religious sites");
  if (HIGH_ALTITUDE.has(dest.id)) add("altitude", "Altitude meds (ask your doctor) & strong sunscreen", "You'll be above 3,000 m");
  if (dest.id === "serengeti") add("safari", "Neutral-colored clothes & binoculars", "Bright colors spook wildlife");
  if (dest.id === "iceland" || dest.id === "skye") add("waterproof", "Waterproof pants", "Sideways rain is normal here");
  if (tags.has("photo")) add("camera", "Camera & a spare memory card");
  if (trip.drive) {
    add("offline", "Offline maps downloaded", "Patchy signal in the parks");
    add("snacks", "Road snacks & a cooler");
  }
  return items;
}

export function PackingList({ trip }: { trip: Trip }) {
  const { dest } = trip;
  const climate = useClimate(dest.base.lat, dest.base.lng, trip.month);
  const items = useMemo(() => buildList(dest, trip, climate), [dest, trip, climate]);
  const key = `tb-pack:${dest.id}`;
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      setDone(new Set(JSON.parse(localStorage.getItem(key) ?? "[]")));
    } catch {
      setDone(new Set());
    }
  }, [key]);

  const toggle = (id: string) => {
    setDone((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(key, JSON.stringify([...next]));
      } catch {
        /* storage blocked — the list still works for this visit */
      }
      return next;
    });
  };

  const packed = items.filter((i) => done.has(i.id)).length;

  return (
    <div className="rounded-[28px] border border-edge bg-panel p-5 shadow-card sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-txt">
          <Backpack size={16} aria-hidden /> Pack for this trip
        </h3>
        <span className="text-xs text-dim tabular-nums">
          {packed}/{items.length} packed
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-panel2" aria-hidden>
        <motion.div
          className="h-full rounded-full bg-sea"
          animate={{ width: `${items.length ? (packed / items.length) * 100 : 0}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 30 }}
        />
      </div>
      <ul className="mt-3 space-y-0.5">
        {items.map((it) => {
          const on = done.has(it.id);
          return (
            <li key={it.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(it.id)}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 text-left transition-colors hover:bg-panel2"
              >
                <motion.span
                  animate={{ scale: on ? [1, 1.25, 1] : 1 }}
                  transition={{ duration: 0.3 }}
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 ${
                    on ? "border-sea bg-sea text-bg" : "border-edge2"
                  }`}
                >
                  {on && <Check size={13} strokeWidth={3.5} aria-hidden />}
                </motion.span>
                <span className="min-w-0">
                  <span className={`block text-sm transition-colors ${on ? "text-faint line-through" : "text-txt"}`}>{it.label}</span>
                  {it.why && <span className="block text-[11px] text-dim">{it.why}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
