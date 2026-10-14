"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, BookHeart, Car, Compass, CornerDownLeft, ListChecks, Plane, Search, Sparkles, Tent } from "lucide-react";
import { DESTINATIONS } from "@/lib/data";
import { fmtHours } from "@/lib/planner";
import { Flag } from "./Flag";
import { WikiImage } from "./WikiImage";
import { EASE } from "./ui";

type Item = {
  id: string;
  title: string;
  sub: string;
  href: string;
  group: "Pages" | "Weekends" | "Trips";
  icon?: React.ReactNode;
  wiki?: string;
  photo?: string;
  cc?: string;
  haystack: string;
};

const PAGES: Item[] = [
  { id: "p-discover", title: "Discover", sub: "Globe, wonders, what's in season", href: "/", group: "Pages", icon: <Compass size={16} />, haystack: "home discover" },
  { id: "p-weekends", title: "Weekend getaways", sub: "Drives & short flights from Phoenix", href: "/weekends", group: "Pages", icon: <Tent size={16} />, haystack: "weekend getaway short trip" },
  { id: "p-plan", title: "Plan a trip", sub: "Build an itinerary & price it", href: "/plan", group: "Pages", icon: <Sparkles size={16} />, haystack: "plan planner itinerary" },
  { id: "p-surprise", title: "Surprise me", sub: "Roll the dice on a big trip", href: "/plan?surprise=1", group: "Pages", icon: <Sparkles size={16} />, haystack: "random surprise dice" },
  { id: "p-bucket", title: "Bucket list", sub: "40 must-see places", href: "/bucket", group: "Pages", icon: <ListChecks size={16} />, haystack: "bucket list wonders" },
  { id: "p-memories", title: "Memory book", sub: "Your trips, photos & wishlist", href: "/memories", group: "Pages", icon: <BookHeart size={16} />, haystack: "memories photos wishlist" },
];

/** ⌘K: jump to any trip, weekend or page. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (typeof document === "undefined") return null;
  return createPortal(<AnimatePresence>{open && <Palette onClose={onClose} />}</AnimatePresence>, document.body);
}

function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const all = useMemo<Item[]>(
    () => [
      ...PAGES,
      ...DESTINATIONS.map((d): Item => {
        const w = d.weekend;
        return {
          id: d.id,
          title: d.name,
          sub: w
            ? w.fly
              ? `✈ ${fmtHours(w.fly.hours)} nonstop · ${d.region}`
              : `${fmtHours(w.hours ?? 0)} drive · ${d.region}`
            : `${d.country} · ${d.region}`,
          href: `/plan?dest=${d.id}${w ? "&days=3" : ""}`,
          group: w ? "Weekends" : "Trips",
          wiki: d.places[0].wiki,
          photo: d.places[0].photo,
          cc: d.countryCode,
          haystack: [d.name, d.region, d.country, ...d.places.map((p) => p.name), ...(w?.vibes ?? [])].join(" ").toLowerCase(),
        };
      }),
    ],
    [],
  );

  const results = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return [...PAGES, ...all.filter((i) => i.group === "Weekends").slice(0, 4), ...all.filter((i) => i.group === "Trips").slice(0, 4)];
    const words = n.split(/\s+/);
    return all
      .map((i) => {
        const t = i.title.toLowerCase();
        if (!words.every((w) => i.haystack.includes(w) || t.includes(w))) return null;
        return { i, s: t.startsWith(n) ? 3 : t.includes(n) ? 2 : 1 };
      })
      .filter((x): x is { i: Item; s: number } => !!x)
      .sort((a, b) => b.s - a.s)
      .slice(0, 30)
      .map((x) => x.i);
  }, [q, all]);

  useEffect(() => setSel(0), [q]);
  useEffect(() => {
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  const go = (it: Item | undefined) => {
    if (!it) return;
    onClose();
    router.push(it.href);
  };

  const groups = ["Pages", "Weekends", "Trips"] as const;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center px-3 pt-[10vh] sm:pt-[14vh]">
      <motion.div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Search trips"
        initial={{ opacity: 0, scale: 0.96, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -6 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="relative flex max-h-[72dvh] w-full max-w-xl flex-col overflow-hidden rounded-[24px] border border-edge bg-panel shadow-lift"
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          else if (e.key === "ArrowDown") {
            e.preventDefault();
            setSel((s) => Math.min(results.length - 1, s + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSel((s) => Math.max(0, s - 1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            go(results[sel]);
          }
        }}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-edge px-4">
          <Search size={18} className="text-faint" aria-hidden />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search trips, weekends, places…"
            aria-label="Search"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={results[sel] ? `pal-${results[sel].id}` : undefined}
            className="min-h-14 flex-1 bg-transparent text-[16px] text-txt outline-none placeholder:text-faint focus-visible:outline-none"
          />
          <kbd className="rounded-md bg-panel2 px-1.5 py-0.5 text-[11px] text-faint">Esc</kbd>
        </div>
        <ul id="palette-list" ref={listRef} role="listbox" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
          {results.length === 0 && <li className="px-3 py-10 text-center text-sm text-dim">No trips match “{q}”.</li>}
          {groups.map((g) => {
            const items = results.filter((r) => r.group === g);
            if (!items.length) return null;
            return (
              <li key={g} role="presentation">
                <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">{g}</p>
                <ul role="presentation">
                  {items.map((it) => {
                    const myIdx = results.indexOf(it);
                    const on = myIdx === sel;
                    return (
                      <li
                        key={it.id}
                        id={`pal-${it.id}`}
                        role="option"
                        aria-selected={on}
                        data-idx={myIdx}
                        onMouseMove={() => setSel(myIdx)}
                        onClick={() => go(it)}
                        className="relative flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl px-3 py-2"
                      >
                        {on && (
                          <motion.span
                            layoutId="palette-sel"
                            className="absolute inset-0 rounded-2xl bg-panel2"
                            transition={{ type: "spring", stiffness: 500, damping: 38 }}
                          />
                        )}
                        <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-panel2 text-dim">
                          {it.wiki ? <WikiImage title={it.wiki} photo={it.photo} alt="" className="h-full w-full" /> : it.icon}
                        </span>
                        <span className="relative min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-[15px] font-semibold text-txt">
                            {it.cc && <Flag cc={it.cc} />}
                            <span className="truncate">{it.title}</span>
                          </span>
                          <span className="block truncate text-xs text-dim">{it.sub}</span>
                        </span>
                        {it.group === "Weekends" &&
                          (it.sub.startsWith("✈") ? (
                            <Plane size={14} className="relative shrink-0 text-faint" aria-hidden />
                          ) : (
                            <Car size={14} className="relative shrink-0 text-faint" aria-hidden />
                          ))}
                        {on ? (
                          <CornerDownLeft size={14} className="relative shrink-0 text-faint" aria-hidden />
                        ) : (
                          <ArrowRight size={14} className="relative shrink-0 text-transparent" aria-hidden />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      </motion.div>
    </div>
  );
}
