"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { BookHeart, Compass, ListChecks, Sparkles } from "lucide-react";

const TABS = [
  { href: "/", label: "Discover", Icon: Compass },
  { href: "/plan", label: "Plan", Icon: Sparkles },
  { href: "/bucket", label: "Bucket list", Icon: ListChecks },
  { href: "/memories", label: "Memories", Icon: BookHeart },
];

function useActive() {
  const path = (usePathname() || "/").replace(/\/+$/, "") || "/";
  return (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href) || (href === "/bucket" && path.startsWith("/wonders"));
}

export function Nav() {
  const isActive = useActive();
  return (
    <>
      {/* Desktop: floating glass bar */}
      <header className="fixed inset-x-0 top-4 z-50 hidden justify-center md:flex">
        <nav
          aria-label="Main"
          className="flex items-center gap-1 rounded-full border border-edge bg-glass p-1.5 pl-5 shadow-card backdrop-blur-xl backdrop-saturate-150"
        >
          <Link href="/" className="mr-3 flex items-center gap-2 text-txt">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-on-accent">
              <Compass size={15} strokeWidth={2.4} aria-hidden />
            </span>
            <span className="font-display text-xl">Travel Book</span>
          </Link>
          {TABS.map(({ href, label, Icon }) => {
            const on = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? "page" : undefined}
                className={`relative flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors ${
                  on ? "text-on-accent" : "text-dim hover:text-txt"
                }`}
              >
                {on && (
                  <motion.span
                    layoutId="nav-pill-desktop"
                    className="absolute inset-0 rounded-full bg-txt"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon size={16} className={`relative ${on ? "text-bg" : ""}`} aria-hidden />
                <span className={`relative ${on ? "text-bg" : ""}`}>{label}</span>
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Phone: bottom tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-3 z-50 flex justify-around rounded-[26px] border border-edge bg-glass p-1.5 shadow-lift backdrop-blur-xl backdrop-saturate-150 md:hidden"
        style={{ bottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        {TABS.map(({ href, label, Icon }) => {
          const on = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? "page" : undefined}
              className="relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] text-[11px] font-medium"
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
                animate={{ scale: on ? 1.08 : 1, y: on ? -1 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              >
                <Icon size={20} className={on ? "text-accent-ink" : "text-faint"} aria-hidden />
              </motion.span>
              <span className={`relative ${on ? "text-txt" : "text-faint"}`}>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
