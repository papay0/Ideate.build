"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, ChevronDown, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { UsageLog } from "@/lib/supabase/types";
import { formatCost, formatTokens } from "@/lib/constants/pricing";

interface CostIndicatorProps {
  usageLogs: UsageLog[];
  totalCost: number;
  isVisible: boolean;
}

export function CostIndicator({ usageLogs, totalCost, isVisible }: CostIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    }

    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isExpanded]);

  if (!isVisible || usageLogs.length === 0) {
    return null;
  }

  const totalCachedTokens = usageLogs.reduce((sum, log) => sum + (log.cached_tokens || 0), 0);
  const hasCacheHits = totalCachedTokens > 0;
  const totalInputTokens = usageLogs.reduce((sum, log) => sum + log.input_tokens, 0);
  const totalOutputTokens = usageLogs.reduce((sum, log) => sum + log.output_tokens, 0);

  return (
    <div className="relative" ref={popoverRef}>
      {/* Cost Badge - Elegant pill design */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="group flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-[#F5F2EF] to-[#EBE7E3] hover:from-[#EBE7E3] hover:to-[#E5E1DC] border border-[#E8E4E0] rounded-xl transition-all duration-300 shadow-sm hover:shadow-md"
      >
        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#B8956F]/10">
          <Sparkles className="w-3 h-3 text-[#B8956F]" />
        </div>
        <span className="text-sm font-medium text-[#1A1A1A] tabular-nums">
          {formatCost(totalCost)}
        </span>
        {hasCacheHits && (
          <div className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-100" title="Cache savings applied">
            <Zap className="w-2.5 h-2.5 text-amber-600" />
          </div>
        )}
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-3.5 h-3.5 text-[#9A9A9A] group-hover:text-[#6B6B6B] transition-colors" />
        </motion.div>
      </button>

      {/* Expanded Breakdown Popover */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="absolute bottom-full left-0 mb-2.5 w-80 bg-white rounded-2xl shadow-xl border border-[#E8E4E0] overflow-hidden z-50"
            style={{ boxShadow: "0 12px 40px -8px rgba(0,0,0,0.12), 0 4px 12px -2px rgba(0,0,0,0.05)" }}
          >
            {/* Header with warm gradient */}
            <div className="px-5 py-4 bg-gradient-to-br from-[#F5F2EF] via-[#F5F2EF] to-[#EDE8E3] border-b border-[#E8E4E0]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#1A1A1A] tracking-tight">
                    Usage Summary
                  </h3>
                  <p className="text-xs text-[#6B6B6B] mt-0.5">
                    {usageLogs.length} generation{usageLogs.length !== 1 ? 's' : ''} in this project
                  </p>
                </div>
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#B8956F]/10">
                  <Sparkles className="w-4 h-4 text-[#B8956F]" />
                </div>
              </div>
            </div>

            {/* Summary stats row */}
            <div className="grid grid-cols-2 gap-px bg-[#E8E4E0]">
              <div className="bg-white px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-[#9A9A9A] font-medium">Input</p>
                <p className="text-sm font-semibold text-[#1A1A1A] mt-0.5 tabular-nums">
                  {formatTokens(totalInputTokens)}
                </p>
              </div>
              <div className="bg-white px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-[#9A9A9A] font-medium">Output</p>
                <p className="text-sm font-semibold text-[#1A1A1A] mt-0.5 tabular-nums">
                  {formatTokens(totalOutputTokens)}
                </p>
              </div>
            </div>

            {/* Scrollable list */}
            <div className="max-h-52 overflow-y-auto">
              {usageLogs.map((log, index) => (
                <motion.div
                  key={log.id || index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="px-5 py-3 border-b border-[#F0EBE6] last:border-0 hover:bg-[#FAFAF8] transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-md bg-[#F5F2EF] text-[10px] font-semibold text-[#6B6B6B]">
                        {index + 1}
                      </span>
                      <span className="text-xs text-[#9A9A9A]">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-[#B8956F] tabular-nums">
                      {formatCost(log.total_cost)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[#6B6B6B]">
                    <span className="tabular-nums">
                      <span className="text-[#9A9A9A]">In:</span> {formatTokens(log.input_tokens)}
                    </span>
                    <span className="text-[#D4CFC9]">•</span>
                    <span className="tabular-nums">
                      <span className="text-[#9A9A9A]">Out:</span> {formatTokens(log.output_tokens)}
                    </span>
                    {log.cached_tokens > 0 && (
                      <>
                        <span className="text-[#D4CFC9]">•</span>
                        <span className="flex items-center gap-1 text-amber-600">
                          <Zap className="w-2.5 h-2.5" />
                          {formatTokens(log.cached_tokens)}
                        </span>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footer with total */}
            <div className="px-5 py-4 bg-gradient-to-br from-[#F5F2EF] to-[#EDE8E3] border-t border-[#E8E4E0]">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs font-medium text-[#6B6B6B] uppercase tracking-wider">
                    Total Cost
                  </span>
                  {hasCacheHits && (
                    <p className="text-[10px] text-amber-600 mt-0.5 flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5" />
                      {formatTokens(totalCachedTokens)} cached
                    </p>
                  )}
                </div>
                <span className="text-xl font-bold text-[#B8956F] tabular-nums tracking-tight">
                  {formatCost(totalCost)}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
