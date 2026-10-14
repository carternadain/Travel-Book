"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { BookHeart, Compass, ListChecks, Search, Sparkles, Tent } from "lucide-react";
import { Hanko } from "./Japan";
import { CommandPalette } from "./CommandPalette";

const TABS = [
  { href: "/", label: "Discover", short: "Discover", Icon: Compass },
  { href: "/weekends", label: "Weekends", short: "Weekends", Icon: Tent },
  { href: "/plan", label: "Plan", short: "Plan", Icon: Sparkles },
  { href: "/bucket", label: "Bucket list", short: "Bucket", Icon: ListChecks },
  { href: "/memories", label: "Memories", short: "Memories", Icon: BookHeart },
];

function useActive() {
  const path = (usePathname() || "/").replace(/\/+$/, "") || "/";
  return (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href) || (href === "/bucket" && path.startsWith("/wonders"));
}

export function Nav() {
  const isActive = useActive();
  const [search, setSearch] = useState(false);
  const [mac, setMac] = useState(false);

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch((s) => !s);
      } else if (e.key === "/" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setSearch(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {/* Desktop: floating glass bar */}
      <header className="fixed inset-x-0 top-4 z-50 hidden justify-center md:flex">
        <motion.nav
          aria-label="Main"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 26, delay: 0.1 }}
          className="flex items-center gap-1 rounded-full border border-edge bg-glass p-1.5 pl-3 shadow-card backdrop-blur-xl backdrop-saturate-150"
        >
          <Link href="/" className="group mr-2 flex items-center gap-2.5 rounded-full pr-2 text-txt">
            <motion.span whileHover={{ rotate: -14, scale: 1.08 }} transition={{ type: "spring", stiffness: 400, damping: 14 }}>
              <Hanko size={30} />
            </motion.span>
            <span className="font-display hidden whitespace-nowrap text-[19px] lg:inline">Travel Book</span>
          </Link>
          {TABS.map(({ href, label, Icon }) => {
            const on = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? "page" : undefined}
                aria-label={label}
                title={label}
                className={`relative flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-sm font-medium transition-colors lg:px-4 ${
                  on ? "text-bg" : "text-dim hover:text-txt"
                }`}
              >
                {on && (
                  <motion.span
                    layoutId="nav-pill-desktop"
                    className="absolute inset-0 rounded-full bg-txt"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon size={16} className="relative" aria-hidden />
                <span className={`relative ${on ? "" : "hidden lg:inline"}`}>{label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setSearch(true)}
            className="ml-1 flex h-10 items-center gap-2 rounded-full border border-edge bg-panel px-3 text-sm text-dim transition-colors hover:border-edge2 hover:text-txt"
            aria-label="Search trips"
          >
            <Search size={15} aria-hidden />
            <kbd className="hidden rounded-md bg-panel2 px-1.5 py-0.5 font-sans text-[11px] text-faint lg:inline">{mac ? "⌘" : "Ctrl"} K</kbd>
          </button>
        </motion.nav>
      </header>

      {/* Phone: slim top bar with the seal + search */}
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))] md:hidden">
        <Link href="/" className="flex min-h-11 items-center gap-2.5 text-txt">
          <Hanko size={28} />
          <span className="font-display text-lg">Travel Book</span>
        </Link>
        <button
          type="button"
          onClick={() => setSearch(true)}
          aria-label="Search trips"
          className="grid h-11 w-11 place-items-center rounded-full border border-edge bg-panel text-dim active:scale-95"
        >
          <Search size={18} aria-hidden />
        </button>
      </div>

      {/* Phone: bottom tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-3 z-50 flex justify-around rounded-[26px] border border-edge bg-glass p-1.5 shadow-lift backdrop-blur-xl backdrop-saturate-150 md:hidden"
        style={{ bottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        {TABS.map(({ href, short, Icon }) => {
          const on = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? "page" : undefined}
              className="relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] text-[10.5px] font-medium"
            >
              {on && (
                <motion.span
                  layoutId="nav-pill-phone"
                  className="absolute inset-0 rounded-[20px] bg-panel2"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <motion.span
                className="relative"
                animate={{ scale: on ? 1.1 : 1, y: on ? -1 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              >
                <Icon size={20} className={on ? "text-accent-ink" : "text-faint"} aria-hidden />
              </motion.span>
              <span className={`relative truncate ${on ? "text-txt" : "text-faint"}`}>{short}</span>
            </Link>
          );
        })}
      </nav>

      <CommandPalette open={search} onClose={() => setSearch(false)} />
    </>
  );
}
