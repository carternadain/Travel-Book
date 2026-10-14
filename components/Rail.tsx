"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * A horizontal, snap-scrolling row of cards. Swipe on touch; on desktop it adds
 * arrow buttons and fades the edges so it's obvious there's more to see.
 */
export function Rail({
  children,
  label,
  className = "",
  ...motionProps
}: { label: string; className?: string } & HTMLMotionProps<"div">) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ prev: false, next: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({ prev: el.scrollLeft > 8, next: el.scrollLeft + el.clientWidth < el.scrollWidth - 8 });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update, children]);

  const go = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: "smooth" });

  const fade = 48;
  const mask = `linear-gradient(to right, ${edges.prev ? "transparent" : "#000"} 0, #000 ${fade}px, #000 calc(100% - ${fade}px), ${
    edges.next ? "transparent" : "#000"
  } 100%)`;

  return (
    <div className="group/rail relative" role="region" aria-label={label}>
      <motion.div
        ref={ref}
        {...motionProps}
        style={{ maskImage: mask, WebkitMaskImage: mask, ...(motionProps.style ?? {}) }}
        className={`no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-4 sm:-mx-6 sm:scroll-px-6 sm:px-6 ${className}`}
      >
        {children}
      </motion.div>
      {(["prev", "next"] as const).map((side) => (
        <motion.button
          key={side}
          type="button"
          onClick={() => go(side === "prev" ? -1 : 1)}
          aria-label={side === "prev" ? "Scroll left" : "Scroll right"}
          initial={false}
          animate={{ opacity: edges[side] ? 1 : 0, scale: edges[side] ? 1 : 0.8 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          tabIndex={edges[side] ? 0 : -1}
          className={`absolute top-[calc(50%-8px)] z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-edge bg-panel text-txt shadow-lift md:grid ${
            side === "prev" ? "-left-3" : "-right-3"
          } ${edges[side] ? "" : "pointer-events-none"}`}
        >
          {side === "prev" ? <ChevronLeft size={20} aria-hidden /> : <ChevronRight size={20} aria-hidden />}
        </motion.button>
      ))}
    </div>
  );
}
