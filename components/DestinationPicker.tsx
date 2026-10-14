"use client";

import { Flag } from "./Flag";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Search, Sun, X } from "lucide-react";
import { CONTINENTS, DESTINATIONS, tripSeen, type Continent, type Destination } from "@/lib/data";
import { WikiImage } from "./WikiImage";
import { Chip, EASE } from "./ui";

/** Button showing the chosen trip; opens a searchable sheet of every destination. */
export function DestinationPicker({
  value,
  month,
  seenIds,
  onChange,
}: {
  value: Destination;
  month: number;
  seenIds: Set<string>;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-full border border-txt bg-txt px-4 text-sm font-semibold text-bg"
      >
        <span aria-hidden><Flag cc={value.countryCode} /></span>
        <span className="truncate">{value.name}</span>
        <ChevronDown size={16} aria-hidden className="shrink-0" />
      </motion.button>
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <Sheet
                value={value}
                month={month}
                seenIds={seenIds}
                onClose={() => setOpen(false)}
                onPick={(id) => {
                  onChange(id);
                  setOpen(false);
                }}
              />
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

function Sheet({
  value,
  month,
  seenIds,
  onClose,
  onPick,
}: {
  value: Destination;
  month: number;
  seenIds: Set<string>;
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [continent, setContinent] = useState<Continent | "all" | "now">("all");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    if (window.matchMedia("(min-width: 640px)").matches) inputRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return DESTINATIONS.filter((d) => {
      if (continent === "now" && !d.bestMonths.includes(month)) return false;
      if (continent !== "all" && continent !== "now" && d.continent !== continent) return false;
      if (!needle) return true;
      return [d.name, d.region, d.country, ...d.places.map((p) => p.name)].some((t) => t.toLowerCase().includes(needle));
    });
  }, [q, continent, month]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <motion.div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Choose a destination"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="relative flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[28px] border border-edge bg-panel shadow-lift sm:rounded-[28px]"
      >
        <div className="shrink-0 border-b border-edge p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <Search size={18} className="text-faint" aria-hidden />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search 40+ trips — Japan, waterfalls, Petra…"
              aria-label="Search destinations"
              className="min-h-11 flex-1 bg-transparent text-[16px] text-txt outline-none placeholder:text-faint focus-visible:outline-none"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-10 w-10 place-items-center rounded-full text-dim hover:bg-panel2"
            >
              <X size={18} />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Chip on={continent === "all"} onClick={() => setContinent("all")} className="shrink-0">
              All
            </Chip>
            <Chip on={continent === "now"} onClick={() => setContinent("now")} className="shrink-0">
              <Sun size={13} aria-hidden /> Great this month
            </Chip>
            {CONTINENTS.map((c) => (
              <Chip key={c} on={continent === c} onClick={() => setContinent(c)} className="shrink-0">
                {c}
              </Chip>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-5">
          {list.length === 0 ? (
            <p className="py-10 text-center text-sm text-dim">Nothing matches. Try a country or a continent.</p>
          ) : (
            <motion.ul layout className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {list.map((d, i) => {
                const hero = d.places[0];
                const on = d.id === value.id;
                const allSeen = tripSeen(d, seenIds);
                return (
                  <motion.li
                    key={d.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: EASE, delay: Math.min(i, 12) * 0.02 }}
                  >
                    <button
                      type="button"
                      onClick={() => onPick(d.id)}
                      aria-pressed={on}
                      className={`group relative block aspect-[4/3] w-full overflow-hidden rounded-2xl text-left ring-offset-2 ring-offset-panel transition-shadow ${
                        on ? "ring-2 ring-accent" : ""
                      }`}
                    >
                      <WikiImage
                        title={hero.wiki}
                        photo={hero.photo}
                        alt=""
                        className="absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                      <div className="absolute left-2 top-2 flex gap-1">
                        {d.bestMonths.includes(month) && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-black">
                            <Sun size={10} aria-hidden /> Good now
                          </span>
                        )}
                        {allSeen && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-black">
                            <Check size={10} strokeWidth={3} aria-hidden /> Seen
                          </span>
                        )}
                      </div>
                      <span className="absolute inset-x-0 bottom-0 p-2.5 text-white">
                        <span className="block text-[11px] text-white/80">
                          <Flag cc={d.countryCode} /> {d.country}
                        </span>
                        <span className="font-display block text-[19px] leading-tight">{d.name}</span>
                      </span>
                    </button>
                  </motion.li>
                );
              })}
            </motion.ul>
          )}
        </div>
      </motion.div>
    </div>
  );
}
