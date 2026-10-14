"use client";

import { useEffect, useRef } from "react";
import createGlobe, { type Arc, type Marker } from "cobe";

export type GlobePoint = { lat: number; lng: number; size?: number; color: [number, number, number] };
export type GlobeArc = { from: [number, number]; to: [number, number]; color?: [number, number, number] };

const toAngles = (lat: number, lng: number): [number, number] => [
  Math.PI - ((lng * Math.PI) / 180 - Math.PI / 2),
  (lat * Math.PI) / 180,
];

/**
 * A slowly spinning WebGL globe. Drag to spin it; pass `focus` to glide to a place.
 */
export function Globe({
  points,
  arcs = [],
  focus,
  className = "",
  label = "Globe",
}: {
  points: GlobePoint[];
  arcs?: GlobeArc[];
  focus?: { lat: number; lng: number } | null;
  className?: string;
  label?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const focusRef = useRef(focus);
  focusRef.current = focus;
  const dataRef = useRef({ points, arcs });
  dataRef.current = { points, arcs };
  const globeRef = useRef<ReturnType<typeof createGlobe> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = canvas.offsetWidth;
    let phi = 0.6;
    let theta = 0.3;
    let drag: { x: number; y: number; phi: number; theta: number } | null = null;
    let velocity = 0;

    const toMarkers = (ps: GlobePoint[]): Marker[] =>
      ps.map((p) => ({ location: [p.lat, p.lng], size: p.size ?? 0.05, color: p.color }));
    const toArcs = (as: GlobeArc[]): Arc[] => as.map((a) => ({ from: a.from, to: a.to, color: a.color }));

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi,
      theta,
      dark: dark ? 1 : 0,
      diffuse: dark ? 1.4 : 0.9,
      mapSamples: 22000,
      mapBrightness: dark ? 5.5 : 10,
      mapBaseBrightness: dark ? 0.02 : 0,
      baseColor: dark ? [0.17, 0.18, 0.22] : [0.93, 0.89, 0.82],
      markerColor: [0.85, 0.27, 0.17],
      glowColor: dark ? [0.14, 0.17, 0.25] : [1, 0.95, 0.9],
      markers: toMarkers(dataRef.current.points),
      arcs: toArcs(dataRef.current.arcs),
      arcColor: [0.85, 0.27, 0.17],
      arcWidth: 0.6,
      arcHeight: 0.28,
      markerElevation: 0.015,
      opacity: dark ? 0.95 : 0.9,
    });
    globeRef.current = globe;

    let raf = 0;
    const loop = () => {
      const f = focusRef.current;
      if (drag) {
        // follow pointer (handled in move)
      } else if (f) {
        const [tp, tt] = toAngles(f.lat, f.lng);
        // shortest way round
        const twoPi = Math.PI * 2;
        const dp = ((((tp - phi) % twoPi) + twoPi * 1.5) % twoPi) - Math.PI;
        phi += dp * 0.06;
        theta += (tt * 0.8 - theta) * 0.06;
      } else {
        phi += velocity + (reduced ? 0 : 0.0022);
        velocity *= 0.94;
      }
      globe.update({ phi, theta });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    requestAnimationFrame(() => (canvas.style.opacity = "1"));

    const onDown = (e: PointerEvent) => {
      drag = { x: e.clientX, y: e.clientY, phi, theta };
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
    };
    let lastX = 0;
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      phi = drag.phi + dx / 160;
      theta = Math.max(-1, Math.min(1, drag.theta + dy / 320));
      velocity = (e.clientX - lastX) / 1600;
      lastX = e.clientX;
    };
    const onUp = () => {
      drag = null;
      canvas.style.cursor = "grab";
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    const ro = new ResizeObserver(() => {
      width = canvas.offsetWidth;
      globe.update({ width: width * 2, height: width * 2 });
    });
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      globe.destroy();
      globeRef.current = null;
    };
  }, []);

  // Push new markers / arcs without rebuilding the globe.
  useEffect(() => {
    globeRef.current?.update({
      markers: points.map((p) => ({ location: [p.lat, p.lng], size: p.size ?? 0.05, color: p.color })),
      arcs: arcs.map((a) => ({ from: a.from, to: a.to, color: a.color })),
    });
  }, [points, arcs]);

  return (
    <div className={`relative aspect-square ${className}`}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        className="h-full w-full cursor-grab touch-none opacity-0 transition-opacity duration-1000 [contain:layout_paint_size]"
      />
    </div>
  );
}
