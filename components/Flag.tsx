"use client";

import { useState } from "react";

/**
 * Country flag as an image — emoji flags don't render on Windows (they show
 * as two letters), so we use flagcdn.com's free SVGs instead.
 */
export function Flag({ cc, className = "" }: { cc: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/${cc.toLowerCase()}.svg`}
      alt=""
      aria-hidden
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`inline-block h-[0.8em] w-auto rounded-[2px] align-[-0.05em] shadow-[0_0_0_0.5px_rgb(0_0_0/0.25)] ${className}`}
    />
  );
}
