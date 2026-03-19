"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function RotatingEyebrow({
  items,
  className,
}: {
  items: string[];
  className?: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncReducedMotion = () => {
      setReducedMotion(mediaQuery.matches);
    };

    syncReducedMotion();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncReducedMotion);
      return () => mediaQuery.removeEventListener("change", syncReducedMotion);
    }

    mediaQuery.addListener(syncReducedMotion);
    return () => mediaQuery.removeListener(syncReducedMotion);
  }, []);

  useEffect(() => {
    if (items.length <= 1 || reducedMotion) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setIsVisible(false);

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        setCurrentIndex((current) => (current + 1) % items.length);
        setIsVisible(true);
      }, 220);
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [items, reducedMotion]);

  if (!items.length) {
    return null;
  }

  const activeItem = reducedMotion ? items[0] : items[currentIndex];
  const isAnimated = !reducedMotion && items.length > 1;
  const widestItem = items.reduce((longest, item) => (item.length > longest.length ? item : longest), items[0]);

  return (
    <span className={cn("relative inline-grid overflow-hidden align-top", className)}>
      <span className="invisible whitespace-nowrap">{widestItem}</span>
      <span
        className={cn(
          "absolute inset-0 whitespace-nowrap transition-all duration-200 ease-out",
          isAnimated && !isVisible ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100",
        )}
      >
        {activeItem}
      </span>
    </span>
  );
}
