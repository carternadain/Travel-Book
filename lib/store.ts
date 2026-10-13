"use client";

// Tiny localStorage-backed store. Everything stays on your device — no account,
// no server, no cost. Photos live in IndexedDB (see photos.ts).

import { useSyncExternalStore } from "react";
import { SEED_MEMORIES, type Style } from "./data";

export type Memory = {
  id: string;
  title: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  wiki?: string;
  placeId?: string; // links to a wonder / gem in data.ts
  dateFrom?: string; // yyyy-mm-dd
  dateTo?: string;
  notes: string;
  rating: number; // 0-5
  photoIds: string[];
  coverId?: string;
  createdAt: number;
};

export type SavedTrip = {
  id: string;
  destId: string;
  days: number;
  style: Style;
  month: number;
  seed: number;
  totalUSD: number;
  createdAt: number;
};

export type Settings = {
  home: string; // IATA
  style: Style;
  currency: string;
};

type State = {
  settings: Settings;
  memories: Memory[];
  trips: SavedTrip[];
};

const KEY = "tb-state-v1";

function seed(): State {
  return {
    settings: { home: "LAX", style: "mid", currency: "USD" },
    memories: SEED_MEMORIES.map((m, i) => ({
      ...m,
      notes: "",
      rating: 0,
      photoIds: [],
      createdAt: Date.now() - (SEED_MEMORIES.length - i) * 1000,
    })),
    trips: [],
  };
}

let state: State | null = null;
const listeners = new Set<() => void>();

function load(): State {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? { ...seed(), ...JSON.parse(raw) } : seed();
  } catch {
    state = seed();
  }
  return state!;
}

function save(next: State) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore quota errors; state still lives in memory */
  }
  listeners.forEach((l) => l());
}

const SERVER: State = seed();

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      state = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => select(load()),
    () => select(SERVER),
  );
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const actions = {
  setSettings(p: Partial<Settings>) {
    const s = load();
    save({ ...s, settings: { ...s.settings, ...p } });
  },
  upsertMemory(m: Memory) {
    const s = load();
    const exists = s.memories.some((x) => x.id === m.id);
    save({ ...s, memories: exists ? s.memories.map((x) => (x.id === m.id ? m : x)) : [m, ...s.memories] });
  },
  deleteMemory(id: string) {
    const s = load();
    save({ ...s, memories: s.memories.filter((x) => x.id !== id) });
  },
  saveTrip(t: SavedTrip) {
    const s = load();
    save({ ...s, trips: [t, ...s.trips.filter((x) => x.id !== t.id)] });
  },
  deleteTrip(id: string) {
    const s = load();
    save({ ...s, trips: s.trips.filter((x) => x.id !== id) });
  },
  exportJSON(): string {
    return JSON.stringify(load(), null, 2);
  },
  importJSON(json: string) {
    const parsed = JSON.parse(json) as Partial<State>;
    if (!Array.isArray(parsed.memories)) throw new Error("Not a Travel Book backup");
    save({ ...seed(), ...parsed } as State);
  },
};

// Stable empty-array selectors avoid re-render loops with useSyncExternalStore.
export const selectMemories = (s: State) => s.memories;
export const selectTrips = (s: State) => s.trips;
export const selectSettings = (s: State) => s.settings;
