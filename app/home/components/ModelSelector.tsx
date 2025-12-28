"use client";

/**
 * Model Selector Component
 *
 * A compact dropdown for selecting AI models.
 * Shows Pro model as locked for free users.
 *
 * Storage is scoped by user ID to prevent model preference leakage between accounts.
 */

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Cpu, Zap, Lock, Crown, Sparkles, Brain, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { type PlanType, isModelAllowedForPlan } from "@/lib/constants/plans";
import { getUserStorageItem, setUserStorageItem } from "@/lib/utils/user-storage";

// ============================================================================
// Types and Constants
// ============================================================================

export const AVAILABLE_MODELS = [
  {
    id: "gemini-3-pro-preview",
    name: "Gemini 3 Pro",
    shortName: "Pro",
    description: "Best quality",
    icon: Cpu,
    adminOnly: false,
  },
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash",
    shortName: "Flash",
    description: "Faster, cheaper",
    icon: Zap,
    adminOnly: false,
  },
  {
    id: "anthropic/claude-opus-4.5",
    name: "Claude Opus 4.5",
    shortName: "Opus 4.5",
    description: "Most capable",
    icon: Sparkles,
    adminOnly: true,
  },
  {
    id: "anthropic/claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    shortName: "Sonnet 4.5",
    description: "Fast & capable",
    icon: Brain,
    adminOnly: true,
  },
  {
    id: "openai/gpt-5.2",
    name: "GPT 5.2",
    shortName: "GPT 5.2",
    description: "OpenAI flagship",
    icon: Bot,
    adminOnly: true,
  },
] as const;

export type ModelId = typeof AVAILABLE_MODELS[number]["id"];

const BASE_STORAGE_KEY = "opendesign_selected_model";

// ============================================================================
// Helper Functions
// ============================================================================

export function getDefaultModelForPlan(): ModelId {
  return "gemini-3-flash-preview";
}

/**
 * Get the selected model from localStorage, respecting user's plan
 * If stored model isn't allowed for plan, returns the default for that plan
 * Requires userId to access user-scoped storage
 */
export function getSelectedModel(userId: string | null, plan: PlanType = "free"): ModelId {
  if (typeof window === "undefined" || !userId) return getDefaultModelForPlan();

  const stored = getUserStorageItem(BASE_STORAGE_KEY, userId);
  if (stored && AVAILABLE_MODELS.some((m) => m.id === stored)) {
    // Check if stored model is allowed for user's plan
    if (isModelAllowedForPlan(stored, plan)) {
      return stored as ModelId;
    }
  }

  return getDefaultModelForPlan();
}

/**
 * Save the selected model to localStorage
 * Requires userId to access user-scoped storage
 */
export function setSelectedModel(userId: string | null, model: ModelId): void {
  if (typeof window === "undefined" || !userId) return;
  setUserStorageItem(BASE_STORAGE_KEY, userId, model);
}

// ============================================================================
// Model Selector Component
// ============================================================================

interface ModelSelectorProps {
  value: ModelId;
  onChange: (model: ModelId) => void;
  compact?: boolean;
  userPlan?: PlanType;
  /** When true, all models are unlocked (BYOK users pay their own API costs) */
  isBYOKActive?: boolean;
  onUpgradeClick?: () => void;
  /** User ID for scoped localStorage */
  userId?: string;
  /** When true, admin-only models are shown */
  isAdmin?: boolean;
}

export function ModelSelector({
  value,
  onChange,
  compact = false,
  userPlan = "free",
  isBYOKActive = false,
  onUpgradeClick,
  userId,
  isAdmin = false,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter models based on admin status
  const visibleModels = AVAILABLE_MODELS.filter((m) => !m.adminOnly || isAdmin);

  const selectedModel = visibleModels.find((m) => m.id === value) || visibleModels[0];
  const Icon = selectedModel.icon;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (modelId: ModelId) => {
    // Check if model is admin-only
    const modelConfig = AVAILABLE_MODELS.find((m) => m.id === modelId);
    const isAdminOnlyModel = modelConfig?.adminOnly ?? false;

    // Admin users can access admin-only models regardless of plan
    // BYOK users can use any model - they pay their own API costs
    // Only check restrictions for non-BYOK, non-admin users
    if (!isAdminOnlyModel && !isBYOKActive && !isAdmin && !isModelAllowedForPlan(modelId, userPlan)) {
      // Trigger upgrade modal instead
      if (onUpgradeClick) {
        onUpgradeClick();
      }
      setIsOpen(false);
      return;
    }

    onChange(modelId);
    setSelectedModel(userId || null, modelId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#F5F2EF] rounded-lg transition-colors ${
          compact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm"
        }`}
      >
        <Icon className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
        <span className="font-medium">{compact ? selectedModel.shortName : selectedModel.name}</span>
        <ChevronDown
          className={`${compact ? "w-3 h-3" : "w-3.5 h-3.5"} transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 mb-2 w-52 bg-white rounded-xl border border-[#E8E4E0] shadow-lg overflow-hidden z-50"
          >
            <div className="p-1">
              {visibleModels.map((model) => {
                const ModelIcon = model.icon;
                const isSelected = value === model.id;
                // Admin-only models are always allowed for admins
                // BYOK users have all models unlocked
                // Otherwise check plan
                const isAllowed = model.adminOnly || isBYOKActive || isModelAllowedForPlan(model.id, userPlan);

                return (
                  <button
                    key={model.id}
                    onClick={() => handleSelect(model.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      isSelected
                        ? "bg-[#F5F2EF]"
                        : isAllowed
                        ? "hover:bg-[#FAF8F5]"
                        : "hover:bg-amber-50 cursor-pointer"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isSelected
                          ? "bg-[#B8956F] text-white"
                          : isAllowed
                          ? "bg-[#F5F2EF] text-[#6B6B6B]"
                          : "bg-amber-100 text-amber-600"
                      }`}
                    >
                      {isAllowed ? (
                        <ModelIcon className="w-4 h-4" />
                      ) : (
                        <Lock className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={`text-sm font-medium ${isAllowed ? "text-[#1A1A1A]" : "text-[#6B6B6B]"}`}>
                          {model.name}
                        </p>
                        {!isAllowed && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1.5 py-0.5 rounded-full">
                            <Crown className="w-2.5 h-2.5" />
                            Pro
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#9A9A9A]">
                        {isAllowed ? model.description : "Upgrade to unlock"}
                      </p>
                    </div>
                    {isSelected && isAllowed && (
                      <Check className="w-4 h-4 text-[#B8956F] flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
