"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { useWiki } from "@/lib/live";

/** Free, hotlinkable image from Wikimedia Commons, resized server-side. */
export function commonsURL(file: string, width: number) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/ /g, "_"))}?width=${width}`;
}

/**
 * A real photo of a place. Uses the hand-picked Commons `photo` when given,
 * otherwise (or if it fails) the lead image of the place's Wikipedia article.
 * Fades in when loaded.
 */
export function WikiImage({
  title,
  photo,
  alt,
  className = "",
  large = false,
  imgClassName = "",
}: {
  title: string;
  photo?: string;
  alt: string;
  className?: string;
  large?: boolean;
  imgClassName?: string;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const useCurated = !!photo && !photoFailed;
  const info = useWiki(useCurated ? undefined : title);
  const [loaded, setLoaded] = useState(false);

  const src = useCurated
    ? commonsURL(photo!, large ? 1600 : 900)
    : large
      ? (info?.image ?? info?.thumb)
      : info?.thumb;
  const unavailable = !useCurated && info === null;

  return (
    <div className={`relative overflow-hidden bg-panel2 ${className}`}>
      {!loaded && !unavailable && <div className="skeleton absolute inset-0" />}
      {unavailable && (
        <div className="absolute inset-0 grid place-items-center text-faint">
          <ImageOff size={22} aria-hidden />
        </div>
      )}
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setLoaded(false);
            if (useCurated) setPhotoFailed(true);
          }}
          className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform,filter] duration-700 ease-out ${
            loaded ? "scale-100 opacity-100 blur-0" : "scale-105 opacity-0 blur-md"
          } ${imgClassName}`}
        />
      )}
    </div>
  );
}
