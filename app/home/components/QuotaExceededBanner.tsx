"use client";

/**
 * Quota Exceeded Banner
 *
 * A reusable inline banner that shows when the user has no messages remaining.
 * Provides two options:
 * 1. Upgrade to Pro (or purchase more messages)
 * 2. Use your own API key (BYOK)
 *
 * This component replaces the chat input when quota is exhausted.
 */

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertCircle, Crown, Key, ArrowRight, Zap } from "lucide-react";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { UpgradeModal } from "./UpgradeModal";

interface QuotaExceededBannerProps {
  /** Custom message to show (optional) */
  message?: string;
  /** Whether to show in compact mode */
  compact?: boolean;
}

export function QuotaExceededBanner({
  message,
  compact = false,
}: QuotaExceededBannerProps) {
  const { plan, messagesRemaining, messagesLimit } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const { upgradeToProUrl, purchaseMessagesUrl } = useSubscription();

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    const url = plan === "pro" ? await purchaseMessagesUrl() : await upgradeToProUrl();
    if (url) {
      window.location.href = url;
    }
    setIsUpgrading(false);
  };

  const defaultMessage =
    plan === "free"
      ? "You've used all your free messages this month"
      : "You've used all your messages this month";

  if (compact) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl"
        >
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 flex-1">
            {message || defaultMessage}
          </p>
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="text-sm font-medium text-amber-700 hover:text-amber-900 underline underline-offset-2"
          >
            Options
          </button>
        </motion.div>

        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          reason="quota_exceeded"
        />
      </>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6"
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-5">
          <div className="p-2 bg-amber-100 rounded-xl">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-[#3D3A35] text-base">
              {message || defaultMessage}
            </h3>
            <p className="text-sm text-[#6B6459] mt-0.5">
              {messagesRemaining}/{messagesLimit} messages remaining
            </p>
          </div>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Upgrade Option */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleUpgrade}
            disabled={isUpgrading}
            className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl text-white text-left transition-colors disabled:opacity-50"
          >
            <div className="p-2 bg-white/20 rounded-lg">
              {plan === "pro" ? (
                <Zap className="w-4 h-4" />
              ) : (
                <Crown className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">
                {plan === "pro" ? "Buy More Messages" : "Upgrade to Pro"}
              </p>
              <p className="text-xs text-white/80">
                {plan === "pro" ? "+20 messages for $5" : "50 messages/month for $15"}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 flex-shrink-0" />
          </motion.button>

          {/* BYOK Option */}
          <Link href="/home/settings">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-3 p-4 bg-white hover:bg-[#F5F2EF] border border-[#E8E4DF] rounded-xl text-left transition-colors h-full"
            >
              <div className="p-2 bg-[#F5F2EF] rounded-lg">
                <Key className="w-4 h-4 text-[#6B6459]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-[#3D3A35]">
                  Use Your Own API Key
                </p>
                <p className="text-xs text-[#6B6459]">
                  Free with your OpenRouter or Gemini key
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#9C9589] flex-shrink-0" />
            </motion.div>
          </Link>
        </div>
      </motion.div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="quota_exceeded"
      />
    </>
  );
}
