"use client";

import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export type MapStop = { lat: number; lng: number; label: string; n?: number | string; kind: "base" | "wonder" | "gem" | "memory"; id?: string };

function icon(stop: MapStop) {
  const color =
    stop.kind === "wonder" ? "var(--gold)" : stop.kind === "base" ? "var(--txt)" : stop.kind === "memory" ? "var(--accent)" : "var(--sea)";
  const fg = stop.kind === "base" ? "var(--bg)" : "var(--on-mark)";
  const size = stop.kind === "wonder" ? 34 : 28;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${color};color:${fg};display:grid;place-items:center;font:600 12px/1 var(--font-sans);box-shadow:0 0 0 3px var(--panel),0 6px 16px -4px rgb(0 0 0/.45)">${stop.n ?? (stop.kind === "wonder" ? "★" : "")}</div>`,
  });
}

function Fit({ stops }: { stops: MapStop[] }) {
  const map = useMap();
  useEffect(() => {
    if (!stops.length) return;
    const b = L.latLngBounds(stops.map((s) => [s.lat, s.lng] as [number, number]));
    map.flyToBounds(b, { padding: [40, 40], maxZoom: 10, duration: 1.2 });
  }, [map, stops]);
  return null;
}

export default function TripMap({
  stops,
  route = true,
  className = "",
  onSelect,
}: {
  stops: MapStop[];
  route?: boolean;
  className?: string;
  onSelect?: (id: string) => void;
}) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const on = () => setDark(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const line = useMemo(() => stops.map((s) => [s.lat, s.lng] as [number, number]), [stops]);
  const center = stops[0] ? ([stops[0].lat, stops[0].lng] as [number, number]) : ([20, 0] as [number, number]);

  return (
    <MapContainer center={center} zoom={6} scrollWheelZoom={false} className={className} attributionControl>
      <TileLayer
        key={dark ? "d" : "l"}
        url={`https://{s}.basemaps.cartocdn.com/${dark ? "dark_all" : "rastertiles/voyager"}/{z}/{x}/{y}{r}.png`}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={19}
      />
      {route && line.length > 1 && (
        <Polyline positions={line} className="trip-route" pathOptions={{ weight: 2.5, dashArray: "6 8", opacity: 0.9 }} />
      )}
      {stops.map((s, i) => (
        <Marker
          key={i}
          position={[s.lat, s.lng]}
          icon={icon(s)}
          title={s.label}
          alt={s.label}
          eventHandlers={onSelect && s.id ? { click: () => onSelect(s.id!) } : undefined}
        >
          <Tooltip direction="top" offset={[0, -16]}>
            {s.label}
          </Tooltip>
        </Marker>
      ))}
      <Fit stops={stops} />
    </MapContainer>
  );
}
