"use client";

/**
 * Settings Page
 *
 * A clean, functional settings page with tabbed navigation.
 * - Subscription: View/upgrade plan, buy messages
 * - API Keys: BYOK configuration
 *
 * Design: Refined utilitarian - warm, efficient, no marketing fluff
 *
 * Storage is scoped by user ID to prevent data leakage between accounts.
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
  ChevronRight,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { useBYOK } from "@/lib/hooks/useBYOK";
import { PLANS, MESSAGE_PACK } from "@/lib/constants/plans";
import type { BillingInterval } from "@/lib/stripe";
import { trackEvent } from "@/lib/hooks/useAnalytics";
import { getUserStorageItem, setUserStorageItem, removeUserStorageItem } from "@/lib/utils/user-storage";

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

const BASE_STORAGE_KEY = "opendesign_api_config";

const PROVIDERS = [
  {
    id: "openrouter" as Provider,
    name: "OpenRouter",
    description: "Access 100+ models",
    recommended: true,
    setupUrl: "https://openrouter.ai/keys",
    placeholder: "sk-or-v1-...",
    icon: Zap,
  },
  {
    id: "gemini" as Provider,
    name: "Google Gemini",
    description: "Direct API access",
    recommended: false,
    setupUrl: "https://aistudio.google.com/apikey",
    placeholder: "AIza...",
    icon: Sparkles,
  },
];

const TABS = [
  { id: "subscription" as SettingsSection, label: "Subscription", icon: CreditCard },
  { id: "api-keys" as SettingsSection, label: "API Keys", icon: Key },
];

// ============================================================================
// Helper Functions
// ============================================================================

function getStoredConfig(userId: string | null): ApiConfig | null {
  if (typeof window === "undefined" || !userId) return null;
  const stored = getUserStorageItem(BASE_STORAGE_KEY, userId);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function saveConfig(userId: string | null, config: ApiConfig) {
  if (!userId) return;
  setUserStorageItem(BASE_STORAGE_KEY, userId, JSON.stringify(config));
  window.dispatchEvent(new CustomEvent("byok-config-changed"));
}

function clearConfig(userId: string | null) {
  if (!userId) return;
  removeUserStorageItem(BASE_STORAGE_KEY, userId);
  window.dispatchEvent(new CustomEvent("byok-config-changed"));
}

// ============================================================================
// Plan Summary Card
// ============================================================================

function PlanSummary({
  plan,
  messagesRemaining,
  messagesLimit,
  bonusMessagesRemaining,
  daysUntilReset,
  isBYOKActive,
}: {
  plan: string;
  messagesRemaining: number;
  messagesLimit: number;
  bonusMessagesRemaining: number;
  daysUntilReset: number;
  isBYOKActive: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E8E4DF] p-5 shadow-sm">
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          plan === "pro"
            ? "bg-gradient-to-br from-amber-400 to-orange-500"
            : "bg-[#F5F2EF]"
        }`}>
          {plan === "pro" ? (
            <Crown className="w-6 h-6 text-white" />
          ) : (
            <Zap className="w-6 h-6 text-[#6B6459]" />
          )}
        </div>
        <div>
          <p className="text-sm text-[#9A9589]">Current Plan</p>
          <p className="text-xl font-semibold text-[#3D3A35]">
            {plan === "pro" ? "Pro" : "Free"}
          </p>
        </div>
      </div>

      {isBYOKActive ? (
        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg px-4 py-3">
          <Key className="w-4 h-4" />
          <span className="font-medium">Unlimited messages (BYOK active)</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Monthly Messages */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm text-[#6B6459]">Monthly messages</span>
              <span className="font-semibold text-[#3D3A35]">
                {messagesLimit - messagesRemaining} <span className="text-[#9A9589] font-normal">used</span>
                <span className="text-[#9A9589] font-normal"> / {messagesLimit}</span>
              </span>
            </div>
            <div className="h-2 bg-[#E8E4DF] rounded-full overflow-hidden mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((messagesLimit - messagesRemaining) / messagesLimit) * 100}%` }}
                className={`h-full rounded-full ${
                  messagesRemaining <= 0 ? "bg-red-500" :
                  messagesRemaining <= messagesLimit * 0.2 ? "bg-amber-500" :
                  "bg-gradient-to-r from-amber-400 to-orange-500"
                }`}
              />
            </div>
            <p className="text-sm text-[#9A9589] flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              Resets in {daysUntilReset} days
            </p>
          </div>

          {/* Bonus Messages - only show if user has any */}
          {bonusMessagesRemaining > 0 && (
            <div className="pt-3 border-t border-[#E8E4DF]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-[#6B6459]">Bonus messages</span>
                </div>
                <span className="font-semibold text-[#3D3A35]">
                  {bonusMessagesRemaining} <span className="text-[#9A9589] font-normal">remaining</span>
                </span>
              </div>
              <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                <Check className="w-3 h-3" />
                Never expires • Used after monthly quota
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Subscription Section
// ============================================================================

function SubscriptionSection() {
  const {
    plan,
    subscription,
    isLoading,
    upgradeToProUrl,
    purchaseMessagesUrl,
    manageSubscriptionUrl,
  } = useSubscription();

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const annualTotal = PLANS.pro.price * 10;
  const annualPrice = annualTotal / 12;

  const handleUpgrade = async (interval: BillingInterval) => {
    setActionLoading(interval);
    const url = await upgradeToProUrl(interval);
    if (url) window.location.href = url;
    setActionLoading(null);
  };

  const handleAction = async (action: "purchase" | "manage") => {
    setActionLoading(action);
    const url = action === "purchase" ? await purchaseMessagesUrl() : await manageSubscriptionUrl();
    if (url) window.location.href = url;
    setActionLoading(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-[#E8E4DF] rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 bg-[#E8E4DF] rounded-2xl animate-pulse" />
          <div className="h-80 bg-[#E8E4DF] rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  // Pro user view
  if (plan === "pro") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-serif text-2xl text-[#3D3A35] mb-1">Subscription</h2>
          <p className="text-[#6B6459]">Manage your Pro subscription</p>
        </div>

        {/* Current Plan Card */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Crown className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-[#3D3A35]">Pro Plan</h3>
                <p className="text-[#6B6459]">{PLANS.pro.messagesPerMonth} messages/month • Flash + Pro models</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-[#3D3A35]">${PLANS.pro.price}</p>
              <p className="text-sm text-[#6B6459]">per month</p>
            </div>
          </div>

          {subscription && (
            <div className="mt-4 pt-4 border-t border-amber-200/50 flex items-center gap-2 text-sm text-[#6B6459]">
              <Calendar className="w-4 h-4" />
              <span>
                {subscription.cancel_at_period_end ? "Access ends" : "Renews"} on{" "}
                {subscription.current_period_end
                  ? new Date(subscription.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                  : "N/A"}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => handleAction("purchase")}
            disabled={actionLoading !== null}
            className="flex items-center gap-4 p-5 bg-white border border-[#E8E4DF] hover:border-amber-300 hover:shadow-md rounded-xl transition-all disabled:opacity-50 group"
          >
            <div className="p-3 bg-amber-50 rounded-xl group-hover:bg-amber-100 transition-colors">
              {actionLoading === "purchase" ? (
                <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
              ) : (
                <MessageSquare className="w-5 h-5 text-amber-600" />
              )}
            </div>
            <div className="text-left">
              <p className="font-semibold text-[#3D3A35]">Buy Message Pack</p>
              <p className="text-sm text-[#6B6459]">+{MESSAGE_PACK.messages} messages for ${MESSAGE_PACK.priceUsd}</p>
            </div>
          </button>

          <button
            onClick={() => handleAction("manage")}
            disabled={actionLoading !== null}
            className="flex items-center gap-4 p-5 bg-white border border-[#E8E4DF] hover:border-[#B8956F] hover:shadow-md rounded-xl transition-all disabled:opacity-50 group"
          >
            <div className="p-3 bg-[#F5F2EF] rounded-xl group-hover:bg-[#E8E4DF] transition-colors">
              {actionLoading === "manage" ? (
                <Loader2 className="w-5 h-5 text-[#6B6459] animate-spin" />
              ) : (
                <CreditCard className="w-5 h-5 text-[#6B6459]" />
              )}
            </div>
            <div className="text-left">
              <p className="font-semibold text-[#3D3A35]">Manage Subscription</p>
              <p className="text-sm text-[#6B6459]">Billing, invoices, cancel</p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Free user view - Pricing cards
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl text-[#3D3A35] mb-1">Subscription</h2>
        <p className="text-[#6B6459]">Upgrade to Pro for more messages and better models</p>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Card */}
        <motion.button
          whileHover={{ y: -4 }}
          onClick={() => handleUpgrade('monthly')}
          disabled={actionLoading !== null}
          className="relative text-left bg-white rounded-2xl border-2 border-[#E8E4DF] p-6 transition-all hover:border-[#B8956F] hover:shadow-lg disabled:opacity-50 h-full flex flex-col"
        >
          <div className="flex-1">
            <p className="text-xs font-semibold text-[#9A9589] uppercase tracking-wider mb-4">Monthly</p>

            <div className="mb-6">
              <span className="text-4xl font-bold text-[#3D3A35]">${PLANS.pro.price}</span>
              <span className="text-[#6B6459] ml-1">/mo</span>
            </div>

            <ul className="space-y-3 mb-6">
              {[
                `${PLANS.pro.messagesPerMonth} messages/month`,
                "Flash + Pro models",
                "Priority support",
                "Cancel anytime",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-[#6B6459]">
                  <Check className="w-4 h-4 text-[#B8956F] flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="w-full py-3 border-2 border-[#E8E4DF] text-[#3D3A35] text-center rounded-xl font-semibold hover:bg-[#F5F2EF] transition-colors">
            {actionLoading === "monthly" ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              "Choose Monthly"
            )}
          </div>
        </motion.button>

        {/* Annual Card - Highlighted */}
        <motion.button
          whileHover={{ y: -4 }}
          onClick={() => handleUpgrade('annual')}
          disabled={actionLoading !== null}
          className="relative text-left bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 rounded-2xl border-2 border-amber-300 p-6 transition-all hover:shadow-xl hover:shadow-amber-500/10 disabled:opacity-50 h-full flex flex-col"
        >
          {/* Best Value Badge */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-amber-500/30 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              BEST VALUE
            </div>
          </div>

          <div className="flex-1 mt-2">
            <p className="text-xs font-semibold text-amber-700/70 uppercase tracking-wider mb-4">Annual</p>

            <div className="mb-2">
              <span className="text-4xl font-bold text-[#3D3A35]">${annualPrice.toFixed(2)}</span>
              <span className="text-[#6B6459] ml-1">/mo</span>
            </div>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-sm text-[#6B6459]">${annualTotal}/year</span>
              <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                Save $30
              </span>
            </div>

            <ul className="space-y-3 mb-6">
              {[
                `${PLANS.pro.messagesPerMonth} messages/month`,
                "Flash + Pro models",
                "Priority support",
                "2 months FREE",
              ].map((feature, i) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-[#3D3A35]">
                  <Check className={`w-4 h-4 flex-shrink-0 ${i === 3 ? "text-green-600" : "text-amber-600"}`} />
                  <span className={i === 3 ? "font-semibold text-green-700" : ""}>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-center rounded-xl font-semibold shadow-lg shadow-amber-500/25 hover:shadow-xl transition-all">
            {actionLoading === "annual" ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              "Choose Annual"
            )}
          </div>
        </motion.button>
      </div>

      {/* Trust Signal */}
      <p className="text-center text-sm text-[#9A9589] flex items-center justify-center gap-2">
        <Shield className="w-4 h-4" />
        Secure payment via Stripe • Cancel anytime
      </p>
    </div>
  );
}

// ============================================================================
// API Keys Section
// ============================================================================

function ApiKeysSection() {
  const { user } = useUser();
  const userId = user?.id || null;

  const [selectedProvider, setSelectedProvider] = useState<Provider>("openrouter");
  const [apiKey, setApiKey] = useState("");
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const config = getStoredConfig(userId);
    if (config) {
      setSelectedProvider(config.provider);
      setApiKey(config.key);
      setHasExistingConfig(true);
    }
  }, [userId]);

  const handleSave = () => {
    if (!apiKey.trim()) return;
    saveConfig(userId, { key: apiKey.trim(), provider: selectedProvider });
    setIsSaved(true);
    setHasExistingConfig(true);

    // Track BYOK configuration
    trackEvent("byok_configured", {
      provider: selectedProvider,
    });

    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleClear = () => {
    if (!confirm("Remove your API key?")) return;

    // Track BYOK removal
    trackEvent("byok_removed", {
      provider: selectedProvider,
    });

    clearConfig(userId);
    setApiKey("");
    setHasExistingConfig(false);
  };

  const selectedProviderData = PROVIDERS.find((p) => p.id === selectedProvider)!;

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="font-serif text-2xl text-[#3D3A35] mb-1">API Keys</h2>
        <p className="text-[#6B6459]">Use your own API key for unlimited generations</p>
      </div>

      {/* Status */}
      {hasExistingConfig && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Check className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="font-medium text-emerald-800 text-sm">API Key Configured</p>
            <p className="text-xs text-emerald-600">Using {selectedProviderData.name} • Unlimited messages</p>
          </div>
        </div>
      )}

      {/* Provider Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-[#3D3A35]">Provider</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PROVIDERS.map((provider) => {
            const Icon = provider.icon;
            const isSelected = selectedProvider === provider.id;

            return (
              <button
                key={provider.id}
                onClick={() => setSelectedProvider(provider.id)}
                className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? "border-[#B8956F] bg-[#B8956F]/5"
                    : "border-[#E8E4DF] hover:border-[#D4CFC9] bg-white"
                }`}
              >
                {provider.recommended && (
                  <span className="absolute -top-2 right-3 text-[10px] bg-[#B8956F] text-white font-medium px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                )}
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isSelected ? "bg-[#B8956F]/10" : "bg-[#F5F2EF]"
                  }`}>
                    <Icon className={`w-5 h-5 ${isSelected ? "text-[#B8956F]" : "text-[#9A9589]"}`} />
                  </div>
                  <div>
                    <p className="font-medium text-[#3D3A35]">{provider.name}</p>
                    <p className="text-xs text-[#9A9589]">{provider.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* API Key Input */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-[#3D3A35]">API Key</label>
          <a
            href={selectedProviderData.setupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#B8956F] hover:text-[#A6845F] flex items-center gap-1"
          >
            Get your key <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="relative">
          <input
            type={isKeyVisible ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={selectedProviderData.placeholder}
            className="w-full bg-white border border-[#E8E4DF] rounded-xl px-4 py-3 pr-12 text-[#3D3A35] placeholder-[#9A9589] focus:outline-none focus:border-[#B8956F] focus:ring-2 focus:ring-[#B8956F]/10 font-mono text-sm"
          />
          <button
            onClick={() => setIsKeyVisible(!isKeyVisible)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A9589] hover:text-[#6B6459]"
          >
            {isKeyVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

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
            {isSaved ? <><Check className="w-5 h-5" /> Saved!</> : "Save API Key"}
          </button>
          {hasExistingConfig && (
            <button
              onClick={handleClear}
              className="px-4 py-3 border border-red-200 text-red-500 rounded-xl hover:bg-red-50"
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
            <h4 className="font-medium text-emerald-800 text-sm mb-1">Your key stays private</h4>
            <ul className="text-xs text-emerald-700 space-y-1">
              <li>• Stored only in your browser</li>
              <li>• Never saved to our servers</li>
              <li>• Sent via HTTPS when generating</li>
            </ul>
          </div>
        </div>
      </div>

      {/* How to get keys */}
      <details className="group">
        <summary className="flex items-center justify-between p-4 bg-white border border-[#E8E4DF] rounded-xl cursor-pointer hover:bg-[#F5F2EF]">
          <span className="text-sm font-medium text-[#3D3A35]">How to get an API key</span>
          <ChevronRight className="w-4 h-4 text-[#9A9589] group-open:rotate-90 transition-transform" />
        </summary>
        <div className="mt-2 p-4 bg-[#F5F2EF] rounded-xl space-y-4 text-sm">
          <div>
            <p className="font-medium text-[#3D3A35] mb-2">OpenRouter (Recommended)</p>
            <ol className="list-decimal list-inside text-[#6B6459] space-y-1 text-xs">
              <li>Go to <a href="https://openrouter.ai" target="_blank" className="text-[#B8956F] hover:underline">openrouter.ai</a></li>
              <li>Create account → Keys → Create Key</li>
              <li>Copy and paste above</li>
            </ol>
          </div>
          <div>
            <p className="font-medium text-[#3D3A35] mb-2">Google Gemini</p>
            <ol className="list-decimal list-inside text-[#6B6459] space-y-1 text-xs">
              <li>Go to <a href="https://aistudio.google.com/apikey" target="_blank" className="text-[#B8956F] hover:underline">aistudio.google.com/apikey</a></li>
              <li>Create or use existing key</li>
              <li>Copy and paste above</li>
            </ol>
          </div>
        </div>
      </details>
    </div>
  );
}

// ============================================================================
// Main Settings Page
// ============================================================================

export default function SettingsPage() {
  const { plan, messagesRemaining, messagesLimit, bonusMessagesRemaining, messagesResetAt, isLoading } = useSubscription();
  const { isBYOKActive, isInitialized } = useBYOK();

  // Default to API Keys tab if BYOK is active, otherwise Subscription
  const [activeSection, setActiveSection] = useState<SettingsSection>(
    () => isBYOKActive ? "api-keys" : "subscription"
  );

  // Update active section when BYOK state is initialized
  useEffect(() => {
    if (isInitialized) {
      setActiveSection(isBYOKActive ? "api-keys" : "subscription");
    }
  }, [isInitialized, isBYOKActive]);

  const planConfig = PLANS[plan as keyof typeof PLANS] || PLANS.free;
  const resetDate = messagesResetAt ? new Date(messagesResetAt) : null;
  const daysUntilReset = resetDate
    ? Math.max(0, Math.ceil((new Date(resetDate.getTime() + 30 * 24 * 60 * 60 * 1000).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 30;

  // Loading state
  if (!isInitialized || isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-32 bg-[#E8E4DF] rounded-xl animate-pulse" />
        <div className="h-10 bg-[#E8E4DF] rounded-lg animate-pulse w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 bg-[#E8E4DF] rounded-2xl animate-pulse" />
          <div className="h-80 bg-[#E8E4DF] rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Plan Summary */}
      <PlanSummary
        plan={plan}
        messagesRemaining={messagesRemaining}
        messagesLimit={planConfig.messagesPerMonth}
        bonusMessagesRemaining={bonusMessagesRemaining}
        daysUntilReset={daysUntilReset}
        isBYOKActive={isBYOKActive}
      />

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-[#F5F2EF] rounded-xl w-fit">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-white text-[#3D3A35] shadow-sm"
                  : "text-[#6B6459] hover:text-[#3D3A35]"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-[#B8956F]" : ""}`} />
              {tab.label}
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeSection === "subscription" ? <SubscriptionSection /> : <ApiKeysSection />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
