"use client";

/**
 * Settings Page - API Key Configuration (BYOK)
 *
 * This page allows users to configure their AI provider API keys.
 * OpenDesign uses a BYOK (Bring Your Own Key) model:
 *
 * - Keys are stored ONLY in the browser's localStorage
 * - Keys are transmitted via HTTPS when making AI requests
 * - Keys are NEVER stored in our database
 *
 * Design: Editorial/Magazine aesthetic
 * - Warm white background (#FAF8F5)
 * - Terracotta accent (#B8956F)
 * - Playfair Display serif for headings
 *
 * Supported providers:
 * - OpenRouter (recommended) - Access to multiple models, no rate limits
 * - Google Gemini (direct) - For users with higher tier accounts
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Key,
  Eye,
  EyeOff,
  Check,
  ExternalLink,
  Shield,
  Zap,
  Sparkles,
  Info,
  Trash2,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

type Provider = "openrouter" | "gemini";

interface ApiConfig {
  key: string;
  provider: Provider;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = "opendesign_api_config";

const PROVIDERS = [
  {
    id: "openrouter" as Provider,
    name: "OpenRouter",
    description: "Access to 100+ models including Gemini, Claude, GPT-4. No rate limits.",
    recommended: true,
    setupUrl: "https://openrouter.ai/keys",
    placeholder: "sk-or-v1-...",
    icon: Zap,
  },
  {
    id: "gemini" as Provider,
    name: "Google Gemini",
    description: "Direct access to Gemini models. Best for users on Tier 2+ accounts.",
    recommended: false,
    setupUrl: "https://aistudio.google.com/apikey",
    placeholder: "AIza...",
    icon: Sparkles,
  },
];

// ============================================================================
// Animation Variants
// ============================================================================

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

function getStoredConfig(): ApiConfig | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function saveConfig(config: ApiConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function clearConfig() {
  localStorage.removeItem(STORAGE_KEY);
}

// ============================================================================
// Component: Provider Card
// ============================================================================

function ProviderCard({
  provider,
  isSelected,
  onSelect,
}: {
  provider: (typeof PROVIDERS)[0];
  isSelected: boolean;
  onSelect: () => void;
}) {
  const Icon = provider.icon;

  return (
    <button
      onClick={onSelect}
      className={`relative w-full text-left p-4 rounded-xl border transition-all ${
        isSelected
          ? "border-[#B8956F] bg-[#B8956F]/5"
          : "border-[#E8E4E0] hover:border-[#D4CFC9] bg-white"
      }`}
    >
      {provider.recommended && (
        <span className="absolute -top-2 right-4 text-xs bg-[#B8956F] text-white font-medium px-2 py-0.5 rounded-full">
          Recommended
        </span>
      )}

      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isSelected ? "bg-[#B8956F]/10" : "bg-[#F5F2EF]"
          }`}
        >
          <Icon
            className={`w-5 h-5 ${isSelected ? "text-[#B8956F]" : "text-[#9A9A9A]"}`}
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-[#1A1A1A]">{provider.name}</h3>
            {isSelected && <Check className="w-4 h-4 text-[#B8956F]" />}
          </div>
          <p className="text-sm text-[#6B6B6B] mt-1">{provider.description}</p>
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// Component: API Key Input
// ============================================================================

function ApiKeyInput({
  value,
  onChange,
  placeholder,
  isVisible,
  onToggleVisibility,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  isVisible: boolean;
  onToggleVisibility: () => void;
}) {
  return (
    <div className="relative">
      <input
        type={isVisible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-[#E8E4E0] rounded-xl px-4 py-3 pr-12 text-[#1A1A1A] placeholder-[#9A9A9A] focus:outline-none focus:border-[#B8956F] focus:ring-2 focus:ring-[#B8956F]/10 transition-all font-mono text-sm"
      />
      <button
        type="button"
        onClick={onToggleVisibility}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A9A9A] hover:text-[#6B6B6B] transition-colors"
        title={isVisible ? "Hide API key" : "Show API key"}
      >
        {isVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
  );
}

// ============================================================================
// Component: Privacy Notice
// ============================================================================

function PrivacyNotice() {
  return (
    <div className="bg-[#E8F5E9] border border-[#C8E6C9] rounded-xl p-4">
      <div className="flex items-start gap-3">
        <Shield className="w-5 h-5 text-[#4CAF50] flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium text-[#2E7D32] mb-1">
            Your key is private and secure
          </h4>
          <ul className="text-sm text-[#6B6B6B] space-y-1">
            <li className="flex items-start gap-2">
              <span className="text-[#4CAF50] mt-1">•</span>
              Stored only in your browser&apos;s local storage
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4CAF50] mt-1">•</span>
              Sent via HTTPS only when generating designs
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4CAF50] mt-1">•</span>
              Never saved to our database or servers
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4CAF50] mt-1">•</span>
              You can clear it anytime from this page
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Component: Billing Mode Selector (Future)
// ============================================================================

function BillingModeSelector() {
  return (
    <div className="space-y-4">
      <h2 className="font-serif text-xl text-[#1A1A1A]">Billing Mode</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* BYOK Option */}
        <div className="relative p-4 rounded-xl border border-[#B8956F] bg-[#B8956F]/5">
          <div className="absolute -top-2 left-4 text-xs bg-[#B8956F] text-white font-medium px-2 py-0.5 rounded-full">
            Active
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Key className="w-5 h-5 text-[#B8956F]" />
            <h3 className="font-medium text-[#1A1A1A]">Bring Your Own Key</h3>
          </div>
          <p className="text-sm text-[#6B6B6B]">
            Use your own OpenRouter or Gemini API key. Pay only for what you use
            directly to the provider.
          </p>
        </div>

        {/* Credits Option (Coming Soon) */}
        <div className="relative p-4 rounded-xl border border-[#E8E4E0] bg-[#F5F2EF] opacity-60">
          <div className="absolute -top-2 left-4 text-xs bg-[#9A9A9A] text-white font-medium px-2 py-0.5 rounded-full">
            Coming Soon
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-[#9A9A9A]" />
            <h3 className="font-medium text-[#9A9A9A]">Buy Credits</h3>
          </div>
          <p className="text-sm text-[#9A9A9A]">
            Purchase credits directly from OpenDesign. No API key needed.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Settings Page Component
// ============================================================================

export default function SettingsPage() {
  const [selectedProvider, setSelectedProvider] = useState<Provider>("openrouter");
  const [apiKey, setApiKey] = useState("");
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);

  // Load existing config on mount
  useEffect(() => {
    const config = getStoredConfig();
    if (config) {
      setSelectedProvider(config.provider);
      setApiKey(config.key);
      setHasExistingConfig(true);
    }
  }, []);

  // Save config
  const handleSave = () => {
    if (!apiKey.trim()) return;

    saveConfig({
      key: apiKey.trim(),
      provider: selectedProvider,
    });

    setIsSaved(true);
    setHasExistingConfig(true);

    // Reset saved indicator after 2 seconds
    setTimeout(() => setIsSaved(false), 2000);
  };

  // Clear config
  const handleClear = () => {
    if (!confirm("Are you sure you want to remove your API key?")) return;

    clearConfig();
    setApiKey("");
    setHasExistingConfig(false);
  };

  const selectedProviderData = PROVIDERS.find((p) => p.id === selectedProvider)!;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {/* Header */}
        <div>
          <h1 className="font-serif text-4xl text-[#1A1A1A] mb-2">Settings</h1>
          <p className="text-[#6B6B6B]">
            Configure your API key and preferences
          </p>
        </div>

        {/* Billing Mode Selector */}
        <BillingModeSelector />

        {/* API Key Configuration */}
        <div className="space-y-6">
          <div>
            <h2 className="font-serif text-xl text-[#1A1A1A] mb-4">API Key Configuration</h2>

            {/* Provider Selection */}
            <div className="space-y-3 mb-6">
              {PROVIDERS.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  isSelected={selectedProvider === provider.id}
                  onSelect={() => setSelectedProvider(provider.id)}
                />
              ))}
            </div>

            {/* API Key Input */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-[#1A1A1A]">
                  {selectedProviderData.name} API Key
                </label>
                <a
                  href={selectedProviderData.setupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#B8956F] hover:text-[#A6845F] flex items-center gap-1 transition-colors"
                >
                  Get your key
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <ApiKeyInput
                value={apiKey}
                onChange={setApiKey}
                placeholder={selectedProviderData.placeholder}
                isVisible={isKeyVisible}
                onToggleVisibility={() => setIsKeyVisible(!isKeyVisible)}
              />

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={!apiKey.trim()}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                    isSaved
                      ? "bg-[#4CAF50] text-white"
                      : "bg-[#B8956F] text-white hover:bg-[#A6845F]"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSaved ? (
                    <>
                      <Check className="w-5 h-5" />
                      Saved!
                    </>
                  ) : (
                    "Save API Key"
                  )}
                </button>

                {hasExistingConfig && (
                  <button
                    onClick={handleClear}
                    className="px-4 py-3 border border-red-200 text-red-500 rounded-xl hover:bg-red-50 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-5 h-5" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Privacy Notice */}
          <PrivacyNotice />

          {/* Help Text */}
          <div className="bg-[#F5F2EF] border border-[#E8E4E0] rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-[#9A9A9A] flex-shrink-0 mt-0.5" />
              <div className="text-sm text-[#6B6B6B]">
                <p className="mb-2">
                  <strong className="text-[#1A1A1A]">Why BYOK?</strong> OpenDesign
                  is open source and respects your privacy. By using your own API
                  key, you have full control over your costs and data.
                </p>
                <p>
                  <strong className="text-[#1A1A1A]">Recommended:</strong> OpenRouter
                  provides access to multiple models with no rate limits and
                  transparent pricing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
