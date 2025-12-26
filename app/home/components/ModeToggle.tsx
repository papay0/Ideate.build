"use client";

/**
 * ModeToggle Component
 *
 * Admin-only toggle to switch between Design and Prototype modes.
 * Only renders when user has role === 'admin'.
 *
 * Design mode: Static mockups (existing behavior)
 * Prototype mode: Interactive prototypes with navigation
 */

import { motion } from "framer-motion";
import { Paintbrush, Play } from "lucide-react";

export type CreationMode = "design" | "prototype";

interface ModeToggleProps {
  mode: CreationMode;
  onChange: (mode: CreationMode) => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="inline-flex items-center gap-1 p-1 bg-[#F5F2EF] rounded-xl border border-[#E8E4E0]">
      <button
        type="button"
        onClick={() => onChange("design")}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          mode === "design"
            ? "text-[#1A1A1A]"
            : "text-[#9A9A9A] hover:text-[#6B6B6B]"
        }`}
      >
        {mode === "design" && (
          <motion.div
            layoutId="mode-toggle-bg"
            className="absolute inset-0 bg-white rounded-lg shadow-sm"
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
          />
        )}
        <Paintbrush className="w-3.5 h-3.5 relative z-10" />
        <span className="relative z-10">Design</span>
      </button>
      <button
        type="button"
        onClick={() => onChange("prototype")}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          mode === "prototype"
            ? "text-[#1A1A1A]"
            : "text-[#9A9A9A] hover:text-[#6B6B6B]"
        }`}
      >
        {mode === "prototype" && (
          <motion.div
            layoutId="mode-toggle-bg"
            className="absolute inset-0 bg-white rounded-lg shadow-sm"
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
          />
        )}
        <Play className="w-3.5 h-3.5 relative z-10" />
        <span className="relative z-10">Prototype</span>
      </button>
    </div>
  );
}
