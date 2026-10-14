"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ExternalLink, Info } from "lucide-react";
import { GAS, type CostLine } from "@/lib/planner";
import type { Rates } from "@/lib/live";
import { money } from "@/lib/format";
import { AnimatedNumber, EASE } from "./ui";

const SERIES: Record<CostLine["key"], string> = {
  flights: "var(--series-1)",
  stay: "var(--series-2)",
  food: "var(--series-3)",
  local: "var(--series-4)",
  tickets: "var(--series-5)",
};

export function CostBreakdown({
  costs,
  total,
  low,
  high,
  days,
  currency,
  rates,
  drive = false,
}: {
  costs: CostLine[];
  total: number;
  low: number;
  high: number;
  days: number;
  currency: string;
  rates: Rates | null;
  drive?: boolean;
}) {
  const [hover, setHover] = useState<CostLine["key"] | null>(null);
  const [open, setOpen] = useState<CostLine["key"] | null>("tickets");
  const fmt = (n: number) => money(n, currency, rates);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="text-sm font-medium text-dim">Estimated total, per person</p>
          <p className="font-display mt-1 text-[56px] leading-none text-txt md:text-[64px]">
            <AnimatedNumber value={total} format={fmt} />
          </p>
          <p className="mt-2 text-sm text-dim tabular-nums">
            Likely range {fmt(low)} – {fmt(high)} · about {fmt(total / days)}/day
          </p>
        </div>
      </div>

      {/* Stacked bar: one row, five categories, 2px surface gaps */}
      <div
        className="relative mt-6 flex h-4 w-full gap-[2px]"
        role="img"
        aria-label={`Cost split: ${costs.map((c) => `${c.label} ${fmt(c.usd)}`).join(", ")}`}
        onMouseLeave={() => setHover(null)}
      >
        {costs.map((c, i) => (
          <motion.div
            key={c.key}
            className="relative h-full first:rounded-l-[4px] last:rounded-r-[4px]"
            style={{ background: SERIES[c.key], opacity: hover && hover !== c.key ? 0.35 : 1 }}
            initial={{ flexGrow: 0.0001 }}
            animate={{ flexGrow: Math.max(c.usd, 0.0001) }}
            transition={{ duration: 1, ease: EASE, delay: 0.08 * i }}
            onMouseEnter={() => setHover(c.key)}
          >
            <AnimatePresence>
              {hover === c.key && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-edge bg-panel px-2.5 py-1.5 text-xs shadow-card"
                >
                  <span className="font-semibold text-txt">{c.label}</span>{" "}
                  <span className="text-dim tabular-nums">
                    {fmt(c.usd)} · {Math.round((c.usd / total) * 100)}%
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Legend doubles as the data table */}
      <ul className="mt-5 divide-y divide-edge">
        {costs.map((c) => {
          const expandable = !!c.items?.length;
          const isOpen = open === c.key;
          return (
            <li key={c.key} onMouseEnter={() => setHover(c.key)} onMouseLeave={() => setHover(null)}>
              <button
                type="button"
                disabled={!expandable}
                onClick={() => setOpen(isOpen ? null : c.key)}
                aria-expanded={expandable ? isOpen : undefined}
                className="flex min-h-14 w-full items-center gap-3 py-2 text-left disabled:cursor-default"
              >
                <span className="h-3 w-3 shrink-0 rounded-[3px]" style={{ background: SERIES[c.key] }} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-txt">{c.label}</span>
                  <span className="block truncate text-xs text-dim">{c.detail}</span>
                </span>
                <span className="text-right">
                  <span className="block text-[15px] font-semibold text-txt tabular-nums">{fmt(c.usd)}</span>
                  <span className="block text-[11px] text-faint tabular-nums">
                    {fmt(c.low)}–{fmt(c.high)}
                  </span>
                </span>
                {expandable && (
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-faint transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                )}
              </button>
              <AnimatePresence initial={false}>
                {expandable && isOpen && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="overflow-hidden"
                  >
                    {c.items!.map((it, i) => (
                      <li key={i} className="flex items-start gap-3 rounded-xl bg-panel2 px-3 py-2.5 text-sm [&:not(:last-child)]:mb-1.5">
                        <span className="min-w-0 flex-1">
                          <span className="block text-txt">{it.label}</span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-dim">
                            {it.local && <span className="tabular-nums">{it.local}</span>}
                            {it.note && <span>{it.note}</span>}
                            {it.source && (
                              <a
                                href={it.source}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-h-6 items-center gap-0.5 font-medium text-accent-ink underline-offset-2 hover:underline"
                              >
                                Source <ExternalLink size={11} aria-hidden />
                              </a>
                            )}
                          </span>
                        </span>
                        <span className="font-semibold text-txt tabular-nums">{fmt(it.usd)}</span>
                      </li>
                    ))}
                    <li className="h-3" aria-hidden />
                  </motion.ul>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 flex gap-2 rounded-xl bg-panel2 p-3 text-xs leading-relaxed text-dim">
        <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          Ticket prices are real 2026 fares (tap a source to check). Exchange rates are{" "}
          {rates?.live ? `live (${rates.updated.replace(/ \+0000$/, "")})` : "approximate — offline"}. {drive
            ? `Gas is this week's AAA Arizona average ($${GAS.usd.toFixed(2)}/gal) at ${GAS.mpg} mpg, split between two people.`
            : "Flights use a researched fare where we have one, otherwise a distance-based model. Tap Google Flights below for today's actual fares."} Stay, food and transport are
          averages from traveler budget guides.
        </span>
      </p>
    </div>
  );
}
