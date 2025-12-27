"use client";

import { Smartphone, Monitor } from "lucide-react";
import { type Platform, PLATFORM_CONFIG } from "@/lib/constants/platforms";

interface PlatformSelectorProps {
  selected: Platform;
  onChange: (platform: Platform) => void;
  variant?: "light" | "dark";
}

export function PlatformSelector({ selected, onChange, variant = "light" }: PlatformSelectorProps) {
  const isDark = variant === "dark";

  return (
    <div className={`flex items-center gap-1 p-1 rounded-lg ${
      isDark ? "bg-white/10" : "bg-[#F5F2EE]"
    }`}>
      <button
        type="button"
        onClick={() => onChange("mobile")}
        className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          selected === "mobile"
            ? isDark
              ? "bg-white/20 text-white shadow-sm"
              : "bg-white text-[#1A1A1A] shadow-sm"
            : isDark
              ? "text-white/50 hover:text-white/70"
              : "text-[#9A9A9A] hover:text-[#6B6B6B]"
        }`}
        title={PLATFORM_CONFIG.mobile.description}
      >
        <Smartphone className="w-4 h-4" />
        <span className="hidden sm:inline">Mobile</span>
      </button>
      <button
        type="button"
        onClick={() => onChange("desktop")}
        className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          selected === "desktop"
            ? isDark
              ? "bg-white/20 text-white shadow-sm"
              : "bg-white text-[#1A1A1A] shadow-sm"
            : isDark
              ? "text-white/50 hover:text-white/70"
              : "text-[#9A9A9A] hover:text-[#6B6B6B]"
        }`}
        title={PLATFORM_CONFIG.desktop.description}
      >
        <Monitor className="w-4 h-4" />
        <span className="hidden sm:inline">Desktop</span>
      </button>
    </div>
  );
}
