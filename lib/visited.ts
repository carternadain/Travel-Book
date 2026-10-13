"use client";

import type { Destination, Place } from "./data";
import { actions, uid, type Memory } from "./store";

/** Tick a bucket-list place on/off. Ticking it adds a page to the memory book. */
export function toggleVisited(p: Place, dest: Destination, memories: Memory[]) {
  const mem = memories.find((m) => m.placeId === p.id);
  if (mem) {
    if ((mem.photoIds.length || mem.notes.trim()) && !confirm(`Remove ${p.name} from your memory book? Its photos and notes will be deleted too.`)) return;
    actions.deleteMemory(mem.id);
    return;
  }
  actions.upsertMemory({
    id: uid(),
    title: p.name,
    country: dest.country,
    countryCode: dest.countryCode,
    lat: p.lat,
    lng: p.lng,
    wiki: p.wiki,
    photo: p.photo,
    placeId: p.id,
    notes: "",
    rating: 0,
    photoIds: [],
    createdAt: Date.now(),
  });
}
