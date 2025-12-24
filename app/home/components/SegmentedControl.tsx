"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className="flex bg-[#F5F2EF] rounded-xl p-1 border border-[#E8E4E0]">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`relative flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
            value === option.value ? "text-[#1A1A1A]" : "text-[#6B6B6B]"
          }`}
        >
          {value === option.value && (
            <motion.div
              layoutId="segmented-bg"
              className="absolute inset-0 bg-white rounded-lg shadow-sm"
              transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            {option.icon}
            {option.label}
          </span>
        </button>
      ))}
    </div>
  );
}
