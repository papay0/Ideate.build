"use client";

/**
 * Settings Page - Subscription & API Key Configuration
 *
 * A clean, organized settings page with two main sections:
 * 1. Subscription - Current plan, usage stats, upgrade options
 * 2. API Keys - BYOK (Bring Your Own Key) configuration
 *
 * Design: Editorial/Magazine aesthetic with warm colors
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Key,
  Eye,
  EyeOff,
  Check,
  ExternalLink,
  Shield,
  Zap,
  Sparkles,
  Trash2,
  Crown,
  CreditCard,
  Calendar,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { PLANS, MESSAGE_PACK } from "@/lib/constants/plans";
import { SegmentedControl } from "@/app/home/components/SegmentedControl";

// ============================================================================
// Types
// ============================================================================

type Provider = "openrouter" | "gemini";
type SettingsSection = "subscription" | "api-keys";

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
    description: "Access 100+ models with no rate limits",
    recommended: true,
    setupUrl: "https://openrouter.ai/keys",
    placeholder: "sk-or-v1-...",
    icon: Zap,
  },
  {
    id: "gemini" as Provider,
    name: "Google Gemini",
    description: "Direct access for Tier 2+ accounts",
    recommended: false,
    setupUrl: "https://aistudio.google.com/apikey",
    placeholder: "AIza...",
    icon: Sparkles,
  },
];

const SECTION_OPTIONS = [
  { value: "subscription" as SettingsSection, label: "Subscription", icon: <Crown className="w-4 h-4" /> },
  { value: "api-keys" as SettingsSection, label: "API Keys", icon: <Key className="w-4 h-4" /> },
];

// ============================================================================
// Animation Variants
// ============================================================================

const contentVariants = {
  enter: { opacity: 0, y: 8 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
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
// Component: Provider Card (Compact)
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
      className={`relative w-full text-left p-3 rounded-xl border transition-all ${
        isSelected
          ? "border-[#B8956F] bg-[#B8956F]/5"
          : "border-[#E8E4E0] hover:border-[#D4CFC9] bg-white"
      }`}
    >
      {provider.recommended && (
        <span className="absolute -top-2 right-3 text-[10px] bg-[#B8956F] text-white font-medium px-2 py-0.5 rounded-full">
          Recommended
        </span>
      )}

      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            isSelected ? "bg-[#B8956F]/10" : "bg-[#F5F2EF]"
          }`}
        >
          <Icon
            className={`w-4 h-4 ${isSelected ? "text-[#B8956F]" : "text-[#9A9A9A]"}`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm text-[#1A1A1A]">{provider.name}</h3>
            {isSelected && <Check className="w-3.5 h-3.5 text-[#B8956F]" />}
          </div>
          <p className="text-xs text-[#6B6B6B] truncate">{provider.description}</p>
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// Component: Subscription Section
// ============================================================================

function SubscriptionSection() {
  const {
    plan,
    messagesRemaining,
    messagesLimit,
    messagesResetAt,
    subscription,
    isLoading,
    upgradeToProUrl,
    purchaseMessagesUrl,
    manageSubscriptionUrl,
  } = useSubscription();

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAction = async (action: "upgrade" | "purchase" | "manage") => {
    setActionLoading(action);
    let url: string | null = null;

    switch (action) {
      case "upgrade":
        url = await upgradeToProUrl();
        break;
      case "purchase":
        url = await purchaseMessagesUrl();
        break;
      case "manage":
        url = await manageSubscriptionUrl();
        break;
    }

    if (url) {
      window.location.href = url;
    }
    setActionLoading(null);
  };

  const planConfig = PLANS[plan];
  const resetDate = messagesResetAt ? new Date(messagesResetAt) : null;
  const daysUntilReset = resetDate
    ? Math.max(0, Math.ceil((new Date(resetDate.getTime() + 30 * 24 * 60 * 60 * 1000).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 30;
  const usagePercent = ((messagesLimit - messagesRemaining) / messagesLimit) * 100;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-48 bg-[#F5F2EF] rounded-2xl animate-pulse" />
        <div className="h-20 bg-[#F5F2EF] rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Current Plan Card */}
      <div className="rounded-2xl border border-[#E8E4E0] overflow-hidden bg-white">
        {/* Plan Header */}
        <div className={`p-5 ${plan === "pro" ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white" : "bg-gradient-to-br from-[#F5F2EF] to-[#E8E4E0]"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${plan === "pro" ? "bg-white/20" : "bg-white"}`}>
                {plan === "pro" ? <Crown className="w-5 h-5" /> : <Zap className="w-5 h-5 text-[#6B6459]" />}
              </div>
              <div>
                <h3 className="font-semibold text-lg">{planConfig.name} Plan</h3>
                <p className={`text-sm ${plan === "pro" ? "text-white/80" : "text-[#6B6459]"}`}>
                  {plan === "pro" ? `$${planConfig.price}/month` : "Free forever"}
                </p>
              </div>
            </div>
            {subscription && (
              <button
                onClick={() => handleAction("manage")}
                disabled={actionLoading !== null}
                className={`p-2 rounded-lg transition-colors ${plan === "pro" ? "hover:bg-white/10" : "hover:bg-white"}`}
                title="Manage subscription"
              >
                <CreditCard className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Usage Section */}
        <div className="p-5 space-y-4">
          {/* Usage Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#6B6459]">Messages used</span>
              <span className="font-medium text-[#1A1A1A]">{messagesLimit - messagesRemaining}/{messagesLimit}</span>
            </div>
            <div className="h-2.5 bg-[#E8E4DF] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${usagePercent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`h-full rounded-full ${
                  messagesRemaining <= 0 ? "bg-red-500" :
                  messagesRemaining <= messagesLimit * 0.2 ? "bg-amber-500" :
                  "bg-[#B8956F]"
                }`}
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#9A9A9A]">
              <Calendar className="w-3.5 h-3.5" />
              <span>Resets in {daysUntilReset} days</span>
            </div>
          </div>

          {/* Low messages warning */}
          {messagesRemaining <= messagesLimit * 0.2 && messagesRemaining > 0 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-700">Running low on messages</p>
            </div>
          )}

          {/* No messages warning */}
          {messagesRemaining <= 0 && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">No messages remaining</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Card */}
      <div className="rounded-xl border border-[#E8E4E0] bg-white p-4">
        {plan === "free" ? (
          <button
            onClick={() => handleAction("upgrade")}
            disabled={actionLoading !== null}
            className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl transition-colors disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Crown className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="font-medium">Upgrade to Pro</p>
                <p className="text-xs text-white/80">${PLANS.pro.price}/mo - 50 messages</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={() => handleAction("purchase")}
            disabled={actionLoading !== null}
            className="w-full flex items-center justify-between p-3 border border-[#E8E4DF] hover:bg-[#F5F2EF] rounded-xl transition-colors disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#F5F2EF] rounded-lg">
                <Zap className="w-4 h-4 text-[#B8956F]" />
              </div>
              <div className="text-left">
                <p className="font-medium text-[#1A1A1A]">Buy More Messages</p>
                <p className="text-xs text-[#6B6459]">+{MESSAGE_PACK.messages} messages for ${MESSAGE_PACK.priceUsd}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#9A9A9A]" />
          </button>
        )}
      </div>

      {/* Subscription Status */}
      {subscription && (
        <div className="flex items-center justify-center gap-2 text-sm text-[#6B6459]">
          <Calendar className="w-4 h-4" />
          <span>
            {subscription.cancel_at_period_end ? "Ends" : "Renews"}:{" "}
            {subscription.current_period_end
              ? new Date(subscription.current_period_end).toLocaleDateString()
              : "N/A"}
          </span>
        </div>
      )}

      {/* Features List */}
      <div className="rounded-xl bg-[#F5F2EF]/50 border border-[#E8E4E0] p-4">
        <h4 className="text-sm font-medium text-[#1A1A1A] mb-3">Your plan includes:</h4>
        <ul className="space-y-2">
          {planConfig.features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-[#6B6459]">
              <Check className="w-4 h-4 text-[#B8956F] flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ============================================================================
// Component: API Keys Section
// ============================================================================

function ApiKeysSection() {
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
    <div className="space-y-5">
      {/* Status Card */}
      {hasExistingConfig && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Check className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-emerald-800 text-sm">API Key Configured</p>
            <p className="text-xs text-emerald-600">Using {selectedProviderData.name}</p>
          </div>
        </div>
      )}

      {/* Provider Selection */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-[#1A1A1A]">Select Provider</h3>
        <div className="grid grid-cols-1 gap-2">
          {PROVIDERS.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              isSelected={selectedProvider === provider.id}
              onSelect={() => setSelectedProvider(provider.id)}
            />
          ))}
        </div>
      </div>

      {/* API Key Input */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-[#1A1A1A]">
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

        <div className="relative">
          <input
            type={isKeyVisible ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={selectedProviderData.placeholder}
            className="w-full bg-white border border-[#E8E4E0] rounded-xl px-4 py-3 pr-12 text-[#1A1A1A] placeholder-[#9A9A9A] focus:outline-none focus:border-[#B8956F] focus:ring-2 focus:ring-[#B8956F]/10 transition-all font-mono text-sm"
          />
          <button
            type="button"
            onClick={() => setIsKeyVisible(!isKeyVisible)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A9A9A] hover:text-[#6B6B6B] transition-colors"
            title={isKeyVisible ? "Hide API key" : "Show API key"}
          >
            {isKeyVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={!apiKey.trim()}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
              isSaved
                ? "bg-emerald-500 text-white"
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
            </button>
          )}
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-emerald-800 text-sm mb-1.5">
              Your key stays private
            </h4>
            <ul className="text-xs text-emerald-700 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">•</span>
                Stored only in your browser
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">•</span>
                Never saved to our servers
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">•</span>
                Sent via HTTPS when generating
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* How to Get Keys */}
      <details className="group rounded-xl border border-[#E8E4E0] bg-white overflow-hidden">
        <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#F5F2EF] transition-colors">
          <span className="text-sm font-medium text-[#1A1A1A]">How to get an API key</span>
          <ChevronRight className="w-4 h-4 text-[#9A9A9A] group-open:rotate-90 transition-transform" />
        </summary>
        <div className="px-4 pb-4 space-y-4 text-sm">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-[#B8956F]" />
              <span className="font-medium text-[#1A1A1A]">OpenRouter</span>
              <span className="text-[10px] bg-[#B8956F]/10 text-[#B8956F] px-1.5 py-0.5 rounded-full">Recommended</span>
            </div>
            <ol className="list-decimal list-inside text-[#6B6B6B] space-y-1 ml-6 text-xs">
              <li>Go to <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-[#B8956F] hover:underline">openrouter.ai</a></li>
              <li>Create an account and navigate to <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-[#B8956F] hover:underline">Keys</a></li>
              <li>Click &quot;Create Key&quot; and copy it</li>
            </ol>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#9A9A9A]" />
              <span className="font-medium text-[#1A1A1A]">Google Gemini</span>
            </div>
            <ol className="list-decimal list-inside text-[#6B6B6B] space-y-1 ml-6 text-xs">
              <li>Go to <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-[#B8956F] hover:underline">aistudio.google.com</a></li>
              <li>Click <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-[#B8956F] hover:underline">Get API key</a></li>
              <li>Create or use an existing key</li>
            </ol>
          </div>
        </div>
      </details>
    </div>
  );
}

// ============================================================================
// Main Settings Page Component
// ============================================================================

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("subscription");

  return (
    <div className="max-w-lg mx-auto px-5 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-[#1A1A1A] mb-1">Settings</h1>
        <p className="text-sm text-[#6B6B6B]">
          Manage your subscription and API keys
        </p>
      </div>

      {/* Segmented Control */}
      <div className="mb-6">
        <SegmentedControl
          options={SECTION_OPTIONS}
          value={activeSection}
          onChange={setActiveSection}
        />
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection}
          variants={contentVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2 }}
        >
          {activeSection === "subscription" ? (
            <SubscriptionSection />
          ) : (
            <ApiKeysSection />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
