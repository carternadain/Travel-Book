"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { useWiki } from "@/lib/live";

/** A photo of a place, pulled live from Wikipedia. Fades in when loaded. */
export function WikiImage({
  title,
  alt,
  className = "",
  large = false,
  imgClassName = "",
}: {
  title: string;
  alt: string;
  className?: string;
  large?: boolean;
  imgClassName?: string;
}) {
  const info = useWiki(title);
  const [loaded, setLoaded] = useState(false);
  const src = large ? (info?.image ?? info?.thumb) : info?.thumb;

  return (
    <div className={`relative overflow-hidden bg-panel2 ${className}`}>
      {(!loaded || info === undefined) && info !== null && <div className="skeleton absolute inset-0" />}
      {info === null && (
        <div className="absolute inset-0 grid place-items-center text-faint">
          <ImageOff size={22} aria-hidden />
        </div>
      )}
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform,filter] duration-700 ease-out ${
            loaded ? "scale-100 opacity-100 blur-0" : "scale-105 opacity-0 blur-md"
          } ${imgClassName}`}
        />
      )}
    </div>
  );
}
