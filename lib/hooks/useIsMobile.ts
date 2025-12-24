"use client";

import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768; // Tailwind md breakpoint

/**
 * Hook to detect if the current viewport is mobile-sized (< 768px)
 * Returns false initially for SSR compatibility
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check initial value
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    checkMobile();

    // Listen for resize using matchMedia
    const mediaQuery = window.matchMedia(
      `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
    );
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return isMobile;
}
