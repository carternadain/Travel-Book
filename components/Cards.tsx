"use client";

import { Flag } from "./Flag";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { WikiImage } from "./WikiImage";
import { Tilt } from "./motion";
import type { Destination, Place } from "@/lib/data";

/** Tall cinematic photo card. */
export function PhotoCard({
  href,
  wiki,
  photo,
  title,
  kicker,
  sub,
  seen,
  className = "",
  tall = true,
}: {
  href: string;
  wiki: string;
  photo?: string;
  title: string;
  kicker?: React.ReactNode;
  sub?: string;
  seen?: boolean;
  className?: string;
  tall?: boolean;
}) {
  return (
    <Tilt className={className}>
    <motion.div
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
      initial="rest"
      animate="rest"
      className="group relative rounded-[22px]"
    >
      <Link
        href={href}
        className={`relative block overflow-hidden rounded-[22px] bg-panel2 shadow-card transition-shadow duration-500 hover:shadow-lift ${
          tall ? "aspect-[3/4]" : "aspect-[4/3]"
        }`}
      >
        <motion.div
          className="absolute inset-0"
          variants={{ rest: { scale: 1 }, hover: { scale: 1.06 } }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <WikiImage title={wiki} photo={photo} alt={title} className="h-full w-full" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
        {seen && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 py-1 pl-1 pr-2.5 text-[11px] font-semibold text-black backdrop-blur">
            <span lang="ja" aria-hidden className="jp grid h-5 w-5 place-items-center rounded-full bg-accent text-[11px] font-bold tracking-normal text-on-accent">済</span>
            Seen
          </span>
        )}
        <motion.span
          variants={{ rest: { opacity: 0, x: -6, y: 6 }, hover: { opacity: 1, x: 0, y: 0 } }}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white text-black"
          aria-hidden
        >
          <ArrowUpRight size={18} />
        </motion.span>
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          {kicker && <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">{kicker}</p>}
          <h3 className="font-display mt-1 text-[26px] leading-[1.05]">{title}</h3>
          {sub && <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-white/85">{sub}</p>}
        </div>
      </Link>
    </motion.div>
    </Tilt>
  );
}

export function DestinationCard({ d, seen }: { d: Destination; seen?: boolean }) {
  const hero = d.places[0];
  return (
    <PhotoCard
      href={`/plan?dest=${d.id}`}
      wiki={hero.wiki}
      photo={hero.photo}
      title={d.name}
      kicker={<><Flag cc={d.countryCode} /> {d.country}</>}
      sub={d.pitch}
      seen={seen}
    />
  );
}

export function GemCard({ p, d }: { p: Place; d: Destination }) {
  return (
    <PhotoCard
      href={`/plan?dest=${d.id}`}
      wiki={p.wiki}
      photo={p.photo}
      title={p.name}
      kicker={<><Flag cc={d.countryCode} /> {d.country}</>}
      sub={p.blurb}
      tall={false}
    />
  );
}
