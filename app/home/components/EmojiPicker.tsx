"use client";

/**
 * Emoji Picker Component
 *
 * A simple emoji picker for selecting project icons.
 * Shows common app-related emojis in a grid layout.
 * Click to select, click outside to close.
 */

import { useRef, useEffect } from "react";

// Common emojis organized by category for app icons
const EMOJI_CATEGORIES = [
  {
    name: "Apps & Tools",
    emojis: ["📱", "💻", "🖥️", "⌨️", "🖱️", "📲", "💡", "⚙️", "🔧", "🛠️"],
  },
  {
    name: "Business",
    emojis: ["💼", "📊", "📈", "💰", "🏦", "💳", "🛒", "📦", "🎯", "📋"],
  },
  {
    name: "Creative",
    emojis: ["🎨", "✏️", "📝", "🎭", "🎬", "📷", "🎵", "🎮", "🎪", "🎁"],
  },
  {
    name: "Health & Fitness",
    emojis: ["💪", "🏃", "🧘", "🏋️", "🚴", "🏊", "❤️", "🍎", "💊", "🩺"],
  },
  {
    name: "Food & Drink",
    emojis: ["🍳", "🍕", "🍔", "🍣", "☕", "🍷", "🧁", "🥗", "🍜", "🍩"],
  },
  {
    name: "Travel & Places",
    emojis: ["✈️", "🚗", "🏠", "🏢", "🏖️", "🗺️", "🌍", "⛰️", "🎢", "🏕️"],
  },
  {
    name: "Education",
    emojis: ["📚", "🎓", "📖", "✍️", "🔬", "🧪", "🎒", "📐", "🧮", "🔭"],
  },
  {
    name: "Social",
    emojis: ["👥", "💬", "❤️", "🤝", "👋", "🎉", "🌟", "✨", "🔔", "📢"],
  },
  {
    name: "Nature",
    emojis: ["🌱", "🌸", "🌻", "🌳", "🍀", "🐾", "🦋", "🌊", "☀️", "🌙"],
  },
];

interface EmojiPickerProps {
  selectedEmoji: string;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ selectedEmoji, onSelect, onClose }: EmojiPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div
      ref={pickerRef}
      className="absolute top-full left-0 mt-2 bg-white border border-[#E8E4E0] rounded-xl shadow-lg z-50 p-3 w-80"
    >
      <div className="max-h-64 overflow-y-auto">
        {EMOJI_CATEGORIES.map((category) => (
          <div key={category.name} className="mb-3 last:mb-0">
            <p className="text-xs text-[#9A9A9A] mb-1.5 font-medium">{category.name}</p>
            <div className="grid grid-cols-10 gap-0.5">
              {category.emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onSelect(emoji);
                    onClose();
                  }}
                  className={`w-7 h-7 flex items-center justify-center rounded hover:bg-[#F5F2EF] transition-colors text-lg ${
                    selectedEmoji === emoji ? "bg-[#B8956F]/20 ring-1 ring-[#B8956F]" : ""
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
