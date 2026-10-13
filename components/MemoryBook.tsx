"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft, ArrowRight, CalendarDays, Download, ImagePlus, Loader2, MapPin, Plus, Search, Star, Trash2, Upload, X,
} from "lucide-react";
import { DESTINATIONS } from "@/lib/data";
import { addPhoto, deletePhoto, usePhotoURL } from "@/lib/photos";
import { actions, selectMemories, selectSettings, selectTrips, uid, useStore, type Memory } from "@/lib/store";
import { useRates } from "@/lib/live";
import { flag, money } from "@/lib/format";
import { MONTHS_LONG } from "@/lib/planner";
import { WikiImage } from "./WikiImage";
import { AnimatedNumber, Button, EASE, Eyebrow, Reveal, rise, stagger } from "./ui";
import type { MapStop } from "./TripMap";

const TripMap = dynamic(() => import("./TripMap"), { ssr: false, loading: () => <div className="skeleton h-full w-full" /> });

const TILTS = [-2.5, 1.8, -1.2, 2.4, -1.8, 1.2];

export function MemoryBook() {
  const memories = useStore(selectMemories);
  const trips = useStore(selectTrips);
  const [tab, setTab] = useState<"been" | "wish">("been");
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const countries = new Set(memories.map((m) => m.countryCode)).size;
  const photos = memories.reduce((s, m) => s + m.photoIds.length, 0);
  const open = memories.find((m) => m.id === openId) ?? null;

  const stops = useMemo<MapStop[]>(
    () => memories.map((m) => ({ lat: m.lat, lng: m.lng, label: m.title, kind: "memory" as const, id: m.id })),
    [memories],
  );

  function exportBackup() {
    const blob = new Blob([actions.exportJSON()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `travel-book-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-10">
      <header className="relative">
        <div className="aurora pointer-events-none absolute -inset-x-20 -top-24 h-72 -z-10" aria-hidden />
        <Eyebrow>Memory book</Eyebrow>
        <h1 className="font-display mt-2 text-[clamp(44px,8vw,84px)] leading-[0.92]">
          Everywhere <em className="text-accent-ink">you&apos;ve been.</em>
        </h1>
        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
          {[
            { k: "places", v: memories.length },
            { k: countries === 1 ? "country" : "countries", v: countries },
            { k: photos === 1 ? "photo" : "photos", v: photos },
          ].map((s) => (
            <div key={s.k} className="flex items-baseline gap-2">
              <dd className="font-display text-5xl leading-none">
                <AnimatedNumber value={s.v} format={(n) => String(Math.round(n))} />
              </dd>
              <dt className="text-sm text-dim">{s.k}</dt>
            </div>
          ))}
        </dl>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={() => setAdding(true)}>
            <Plus size={16} aria-hidden /> Add a place
          </Button>
          <Button variant="ghost" onClick={exportBackup}>
            <Download size={16} aria-hidden /> Back up
          </Button>
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>
            <Upload size={16} aria-hidden /> Restore
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                actions.importJSON(await f.text());
              } catch {
                alert("That file isn't a Travel Book backup.");
              }
              e.target.value = "";
            }}
          />
        </div>
        <p className="mt-3 text-xs text-faint">
          Saved on this device only. Backups include notes and places; photos stay in this browser.
        </p>
      </header>

      <div className="inline-flex rounded-full bg-panel2 p-1" role="tablist" aria-label="Memory book sections">
        {(
          [
            ["been", `Been there · ${memories.length}`],
            ["wish", `Wishlist · ${trips.length}`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className="relative min-h-11 rounded-full px-5 text-sm font-semibold"
          >
            {tab === id && (
              <motion.span
                layoutId="mem-tab"
                className="absolute inset-0 rounded-full bg-panel shadow-card"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className={`relative ${tab === id ? "text-txt" : "text-dim"}`}>{label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "been" ? (
          <motion.div
            key="been"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="space-y-10"
          >
            {memories.length > 0 && (
              <Reveal className="h-[300px] overflow-hidden rounded-[28px] border border-edge shadow-card sm:h-[380px]">
                <TripMap stops={stops} route={false} onSelect={setOpenId} className="h-full w-full" />
              </Reveal>
            )}

            {memories.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-edge2 p-10 text-center">
                <p className="font-display text-3xl">Your first page is blank.</p>
                <p className="mt-2 text-dim">Add a place you&apos;ve been, then drop in your favourite photos.</p>
                <Button className="mt-5" onClick={() => setAdding(true)}>
                  <Plus size={16} aria-hidden /> Add a place
                </Button>
              </div>
            ) : (
              <motion.ul
                variants={stagger}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4"
              >
                {memories.map((m, i) => (
                  <motion.li key={m.id} variants={rise}>
                    <Polaroid m={m} tilt={TILTS[i % TILTS.length]} onOpen={() => setOpenId(m.id)} />
                  </motion.li>
                ))}
                <motion.li variants={rise}>
                  <button
                    type="button"
                    onClick={() => setAdding(true)}
                    className="grid aspect-[4/5] w-full place-items-center rounded-[6px] border-2 border-dashed border-edge2 text-dim transition-colors hover:border-accent hover:text-accent-ink"
                  >
                    <span className="flex flex-col items-center gap-2 text-sm font-semibold">
                      <Plus size={24} aria-hidden /> Add a place
                    </span>
                  </button>
                </motion.li>
              </motion.ul>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="wish"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <Wishlist />
          </motion.div>
        )}
      </AnimatePresence>

      <Portal>
        <AnimatePresence>
          {open && <MemorySheet key={open.id} m={open} onClose={() => setOpenId(null)} />}
        </AnimatePresence>
        <AnimatePresence>
          {adding && (
            <AddPlace
              onClose={() => setAdding(false)}
              onAdded={(id) => {
                setAdding(false);
                setTab("been");
                setTimeout(() => setOpenId(id), 250);
              }}
            />
          )}
        </AnimatePresence>
      </Portal>
    </div>
  );
}

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}

function Polaroid({ m, tilt, onOpen }: { m: Memory; tilt: number; onOpen: () => void }) {
  const cover = usePhotoURL(m.coverId ?? m.photoIds[0]);
  return (
    <motion.button
      type="button"
      layoutId={`mem-${m.id}`}
      onClick={onOpen}
      style={{ rotate: tilt }}
      whileHover={{ rotate: 0, y: -8, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="block w-full rounded-[6px] bg-white p-2.5 pb-3 text-left shadow-lift"
    >
      <div className="relative aspect-square overflow-hidden rounded-[2px] bg-neutral-200">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={m.title} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <WikiImage title={m.wiki ?? m.title} alt={m.title} className="h-full w-full" imgClassName="sepia-[.15]" />
        )}
        {m.photoIds.length > 0 && (
          <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white tabular-nums">
            {m.photoIds.length} photo{m.photoIds.length > 1 ? "s" : ""}
          </span>
        )}
      </div>
      <p className="font-display mt-2.5 truncate text-[22px] leading-none text-neutral-900">{m.title}</p>
      <p className="mt-1 truncate text-[11px] text-neutral-600">
        {flag(m.countryCode)} {m.country}
        {m.dateFrom ? ` · ${new Date(m.dateFrom + "T00:00").toLocaleDateString(undefined, { month: "short", year: "numeric" })}` : ""}
      </p>
    </motion.button>
  );
}

function MemorySheet({ m, onClose }: { m: Memory; onClose: () => void }) {
  const [draft, setDraft] = useState(m);
  const [busy, setBusy] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cover = usePhotoURL(draft.coverId ?? draft.photoIds[0]);

  // Autosave edits.
  useEffect(() => {
    const t = setTimeout(() => actions.upsertMemory(draft), 300);
    return () => clearTimeout(t);
  }, [draft]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && viewer === null && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, viewer]);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files).filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    setBusy(list.length);
    const ids: string[] = [];
    for (const f of list) {
      ids.push(await addPhoto(f));
      setBusy((b) => b - 1);
    }
    setDraft((d) => ({ ...d, photoIds: [...d.photoIds, ...ids] }));
  }

  async function removePhoto(id: string) {
    await deletePhoto(id);
    setDraft((d) => ({
      ...d,
      photoIds: d.photoIds.filter((p) => p !== id),
      coverId: d.coverId === id ? undefined : d.coverId,
    }));
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        layoutId={`mem-${m.id}`}
        role="dialog"
        aria-modal="true"
        aria-label={draft.title}
        className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] bg-panel shadow-lift sm:rounded-[28px]"
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
      >
        <div className="relative h-56 shrink-0 sm:h-72">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <WikiImage title={draft.wiki ?? draft.title} alt="" large className="absolute inset-0 h-full w-full" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/60"
          >
            <X size={20} />
          </button>
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <p className="text-sm text-white/85">
              {flag(draft.countryCode)} {draft.country}
            </p>
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              aria-label="Place name"
              className="font-display mt-1 w-full bg-transparent text-5xl leading-none text-white outline-none placeholder:text-white/50 focus-visible:outline-none"
            />
          </div>
        </div>

        <div className="space-y-6 overflow-y-auto p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays size={16} className="text-faint" aria-hidden />
              <input
                type="date"
                value={draft.dateFrom ?? ""}
                onChange={(e) => setDraft({ ...draft, dateFrom: e.target.value || undefined })}
                aria-label="From"
                className="min-h-10 rounded-lg border border-edge bg-panel2 px-2 text-txt"
              />
              <span className="text-faint">–</span>
              <input
                type="date"
                value={draft.dateTo ?? ""}
                onChange={(e) => setDraft({ ...draft, dateTo: e.target.value || undefined })}
                aria-label="To"
                className="min-h-10 rounded-lg border border-edge bg-panel2 px-2 text-txt"
              />
            </div>
            <div className="flex items-center" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <motion.button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={draft.rating === n}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  whileTap={{ scale: 1.4, rotate: 15 }}
                  onClick={() => setDraft({ ...draft, rating: draft.rating === n ? 0 : n })}
                  className="grid h-10 w-9 place-items-center"
                >
                  <Star size={22} className={n <= draft.rating ? "fill-gold text-gold" : "text-edge2"} />
                </motion.button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Notes</span>
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              rows={4}
              placeholder="Best meal, funniest moment, the thing you'd tell a friend…"
              className="mt-2 w-full resize-y rounded-2xl border border-edge bg-panel2 p-3 text-[15px] leading-relaxed text-txt placeholder:text-faint"
            />
          </label>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">
                Photos · {draft.photoIds.length}
              </span>
              <Button variant="soft" onClick={() => inputRef.current?.click()} className="!min-h-10">
                {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <ImagePlus size={16} aria-hidden />}
                {busy ? `Adding ${busy}…` : "Add photos"}
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  onFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
            {draft.photoIds.length === 0 ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-3 grid h-32 w-full place-items-center rounded-2xl border-2 border-dashed border-edge2 text-sm font-medium text-dim transition-colors hover:border-accent hover:text-accent-ink"
              >
                <span className="flex flex-col items-center gap-1.5">
                  <ImagePlus size={22} aria-hidden /> Drop in your favourite shots
                </span>
              </button>
            ) : (
              <motion.ul layout className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                <AnimatePresence>
                  {draft.photoIds.map((id, i) => (
                    <motion.li
                      key={id}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    >
                      <Thumb
                        id={id}
                        isCover={(draft.coverId ?? draft.photoIds[0]) === id}
                        onOpen={() => setViewer(i)}
                        onCover={() => setDraft({ ...draft, coverId: id })}
                        onDelete={() => removePhoto(id)}
                      />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </motion.ul>
            )}
          </div>

          <div className="flex justify-between border-t border-edge pt-4">
            <Button
              variant="ghost"
              onClick={async () => {
                if (!confirm(`Delete ${draft.title} and its photos?`)) return;
                await Promise.all(draft.photoIds.map(deletePhoto));
                actions.deleteMemory(draft.id);
                onClose();
              }}
              className="!text-accent-ink"
            >
              <Trash2 size={16} aria-hidden /> Delete
            </Button>
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {viewer !== null && (
          <Lightbox ids={draft.photoIds} index={viewer} onIndex={setViewer} onClose={() => setViewer(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function Thumb({
  id,
  isCover,
  onOpen,
  onCover,
  onDelete,
}: {
  id: string;
  isCover: boolean;
  onOpen: () => void;
  onCover: () => void;
  onDelete: () => void;
}) {
  const url = usePhotoURL(id);
  return (
    <div className="group relative aspect-square overflow-hidden rounded-xl bg-panel2">
      {url && (
        <button type="button" onClick={onOpen} className="absolute inset-0" aria-label="View photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        </button>
      )}
      {isCover ? (
        <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
          Cover
        </span>
      ) : (
        <button
          type="button"
          onClick={onCover}
          className="absolute left-1 top-1 min-h-8 rounded-full bg-black/60 px-2 text-[10px] font-semibold text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
        >
          Set cover
        </button>
      )}
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete photo"
        className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function Lightbox({
  ids,
  index,
  onIndex,
  onClose,
}: {
  ids: string[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const url = usePhotoURL(ids[index]);
  const [dir, setDir] = useState(0);
  const go = (d: number) => {
    const n = index + d;
    if (n < 0 || n >= ids.length) return;
    setDir(d);
    onIndex(n);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <motion.div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/95"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${index + 1} of ${ids.length}`}
    >
      <AnimatePresence custom={dir} mode="popLayout" initial={false}>
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <motion.img
            key={ids[index]}
            src={url}
            alt=""
            custom={dir}
            initial={{ opacity: 0, x: dir * 120, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: dir * -120, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={(_, info) => {
              if (info.offset.x < -80) go(1);
              else if (info.offset.x > 80) go(-1);
            }}
            className="max-h-[86dvh] max-w-[94vw] touch-pan-y select-none rounded-lg object-contain"
          />
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <X size={20} />
      </button>
      {index > 0 && (
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous photo"
          className="absolute left-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:grid"
        >
          <ArrowLeft size={20} />
        </button>
      )}
      {index < ids.length - 1 && (
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next photo"
          className="absolute right-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:grid"
        >
          <ArrowRight size={20} />
        </button>
      )}
      <p className="absolute bottom-6 text-sm text-white/70 tabular-nums">
        {index + 1} / {ids.length}
      </p>
    </motion.div>
  );
}

type GeoHit = { id: number; name: string; country: string; country_code: string; admin1?: string; latitude: number; longitude: number };

function AddPlace({ onClose, onAdded }: { onClose: () => void; onAdded: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<GeoHit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (q.trim().length < 2) return setHits(null);
    setLoading(true);
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?count=6&language=en&format=json&name=${encodeURIComponent(q.trim())}`,
          { signal: ctl.signal },
        );
        const j = await r.json();
        setHits(j.results ?? []);
      } catch {
        /* aborted or offline */
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q]);

  function add(h: GeoHit) {
    const id = uid();
    actions.upsertMemory({
      id,
      title: h.name,
      country: h.country,
      countryCode: h.country_code,
      lat: h.latitude,
      lng: h.longitude,
      wiki: h.name,
      notes: "",
      rating: 0,
      photoIds: [],
      createdAt: Date.now(),
    });
    onAdded(id);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]">
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
        aria-label="Add a place"
        initial={{ opacity: 0, y: -16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        className="relative w-full max-w-lg overflow-hidden rounded-[24px] border border-edge bg-panel shadow-lift"
      >
        <div className="flex items-center gap-3 border-b border-edge px-4">
          {loading ? <Loader2 size={18} className="animate-spin text-faint" aria-hidden /> : <Search size={18} className="text-faint" aria-hidden />}
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Kyoto, Busan, Oaxaca…"
            aria-label="Search for a city or place"
            className="min-h-14 flex-1 bg-transparent text-[17px] text-txt outline-none placeholder:text-faint focus-visible:outline-none"
          />
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full text-dim hover:bg-panel2">
            <X size={18} />
          </button>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {hits === null && <li className="px-3 py-6 text-center text-sm text-dim">Search any city, town or region.</li>}
          {hits?.length === 0 && <li className="px-3 py-6 text-center text-sm text-dim">No matches. Try a nearby city.</li>}
          {hits?.map((h, i) => (
            <motion.li key={h.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <button
                type="button"
                onClick={() => add(h)}
                className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors hover:bg-panel2"
              >
                <span className="text-2xl" aria-hidden>
                  {flag(h.country_code)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-txt">{h.name}</span>
                  <span className="block truncate text-xs text-dim">
                    {[h.admin1, h.country].filter(Boolean).join(", ")}
                  </span>
                </span>
                <MapPin size={16} className="ml-auto shrink-0 text-faint" aria-hidden />
              </button>
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}

function Wishlist() {
  const trips = useStore(selectTrips);
  const settings = useStore(selectSettings);
  const rates = useRates();
  if (!trips.length)
    return (
      <div className="rounded-[28px] border border-dashed border-edge2 p-10 text-center">
        <p className="font-display text-3xl">No saved trips yet.</p>
        <p className="mt-2 text-dim">Plan something, then tap the heart to keep it here.</p>
        <Link
          href="/plan?surprise=1"
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-on-accent"
        >
          Surprise me with a trip
        </Link>
      </div>
    );
  return (
    <motion.ul variants={stagger} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <AnimatePresence>
        {trips.map((t) => {
          const d = DESTINATIONS.find((x) => x.id === t.destId);
          if (!d) return null;
          const hero = d.places.find((p) => p.id === d.wonder) ?? d.places[0];
          return (
            <motion.li key={t.id} variants={rise} exit={{ opacity: 0, scale: 0.9 }} layout className="group relative">
              <Link
                href={`/plan?dest=${t.destId}&days=${t.days}&month=${t.month}&seed=${t.seed}`}
                className="relative block aspect-[4/3] overflow-hidden rounded-[22px] shadow-card transition-shadow hover:shadow-lift"
              >
                <WikiImage title={hero.wiki} alt={d.name} className="h-full w-full transition-transform duration-1000 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <p className="text-xs text-white/80">
                    {flag(d.countryCode)} {MONTHS_LONG[t.month - 1]} · {t.days} days
                  </p>
                  <p className="font-display text-3xl leading-none">{d.name}</p>
                  <p className="mt-1 text-sm font-semibold tabular-nums">~{money(t.totalUSD, settings.currency, rates)}</p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => actions.deleteTrip(t.id)}
                aria-label={`Remove ${d.name} from wishlist`}
                className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/60"
              >
                <Trash2 size={16} />
              </button>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </motion.ul>
  );
}
