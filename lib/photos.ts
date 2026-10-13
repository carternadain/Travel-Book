"use client";

// Photos are resized in the browser and stored in IndexedDB on this device.

import { useEffect, useState } from "react";

const DB = "travel-book";
const STORE = "photos";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function resize(file: File, max = 1800): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise((res) => canvas.toBlob((b) => res(b ?? file), "image/jpeg", 0.86));
  } catch {
    return file; // e.g. HEIC on a browser that can't decode it — store as-is
  }
}

export async function addPhoto(file: File): Promise<string> {
  const id = "p_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  const blob = await resize(file);
  await tx("readwrite", (s) => s.put(blob, id));
  return id;
}

export async function getPhoto(id: string): Promise<Blob | undefined> {
  return tx("readonly", (s) => s.get(id) as IDBRequest<Blob | undefined>);
}

export async function deletePhoto(id: string) {
  await tx("readwrite", (s) => s.delete(id));
}

const urls = new Map<string, string>();

export function usePhotoURL(id: string | undefined) {
  const [url, setUrl] = useState<string | undefined>(id ? urls.get(id) : undefined);
  useEffect(() => {
    if (!id) return setUrl(undefined);
    if (urls.has(id)) return setUrl(urls.get(id));
    let live = true;
    getPhoto(id).then((b) => {
      if (!b || !live) return;
      const u = URL.createObjectURL(b);
      urls.set(id, u);
      setUrl(u);
    });
    return () => {
      live = false;
    };
  }, [id]);
  return url;
}
