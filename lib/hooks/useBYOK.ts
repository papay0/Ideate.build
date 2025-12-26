"use client";

/**
 * useBYOK Hook - Centralized BYOK (Bring Your Own Key) State Management
 *
 * Provides reactive state for detecting if a user has configured their own API key.
 * BYOK users get:
 * - All models unlocked (Flash + Pro)
 * - Unlimited messages (no quota consumption)
 * - No upgrade prompts or premium badges
 *
 * Storage is scoped by user ID to prevent data leakage between accounts.
 */

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { getUserStorageKey, getUserStorageItem, setUserStorageItem, removeUserStorageItem } from "@/lib/utils/user-storage";

// ============================================================================
// Types
// ============================================================================

export type Provider = "openrouter" | "gemini";

export interface ApiConfig {
  key: string;
  provider: Provider;
}

export interface UseBYOKReturn {
  /** True if user has a valid API key configured */
  isBYOKActive: boolean;
  /** The configured provider, or null if not configured */
  provider: Provider | null;
  /** The full API config object, or null if not configured */
  apiConfig: ApiConfig | null;
  /** True once the hook has loaded the config from localStorage */
  isInitialized: boolean;
  /** Clear the stored API config */
  clearApiConfig: () => void;
  /** Save a new API config */
  setApiConfig: (config: ApiConfig) => void;
}

// ============================================================================
// Constants
// ============================================================================

const BASE_STORAGE_KEY = "opendesign_api_config";

// ============================================================================
// Helper Functions
// ============================================================================

function getStoredConfig(userId: string | null): ApiConfig | null {
  if (typeof window === "undefined" || !userId) return null;

  const stored = getUserStorageItem(BASE_STORAGE_KEY, userId);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored);
    // Validate the structure
    if (parsed && typeof parsed.key === "string" && parsed.key.length > 0 && parsed.provider) {
      return parsed as ApiConfig;
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// Hook
// ============================================================================

export function useBYOK(): UseBYOKReturn {
  const { user, isLoaded: isUserLoaded } = useUser();
  const userId = user?.id || null;

  const [apiConfig, setApiConfigState] = useState<ApiConfig | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load config from localStorage when user is available
  useEffect(() => {
    if (!isUserLoaded) return;

    if (userId) {
      setApiConfigState(getStoredConfig(userId));
    } else {
      setApiConfigState(null);
    }
    setIsInitialized(true);
  }, [isUserLoaded, userId]);

  // Listen for storage changes (e.g., from other tabs or settings page updates)
  useEffect(() => {
    if (typeof window === "undefined" || !userId) return;

    const storageKey = getUserStorageKey(BASE_STORAGE_KEY, userId);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey) {
        setApiConfigState(getStoredConfig(userId));
      }
    };

    // Also listen for custom events (for same-tab updates)
    const handleCustomEvent = () => {
      setApiConfigState(getStoredConfig(userId));
    };

    // Listen for storage cleared on logout
    const handleStorageCleared = () => {
      setApiConfigState(null);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("byok-config-changed", handleCustomEvent);
    window.addEventListener("user-storage-cleared", handleStorageCleared);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("byok-config-changed", handleCustomEvent);
      window.removeEventListener("user-storage-cleared", handleStorageCleared);
    };
  }, [userId]);

  const setApiConfig = useCallback((config: ApiConfig) => {
    if (!userId) return;
    setUserStorageItem(BASE_STORAGE_KEY, userId, JSON.stringify(config));
    setApiConfigState(config);
    // Dispatch custom event for same-tab listeners
    window.dispatchEvent(new CustomEvent("byok-config-changed"));
  }, [userId]);

  const clearApiConfig = useCallback(() => {
    if (!userId) return;
    removeUserStorageItem(BASE_STORAGE_KEY, userId);
    setApiConfigState(null);
    // Dispatch custom event for same-tab listeners
    window.dispatchEvent(new CustomEvent("byok-config-changed"));
  }, [userId]);

  return {
    isBYOKActive: isInitialized && !!apiConfig?.key,
    provider: apiConfig?.provider || null,
    apiConfig,
    isInitialized,
    clearApiConfig,
    setApiConfig,
  };
}

/**
 * Utility function to check BYOK status without the hook (for non-React contexts)
 * Requires userId to access user-scoped storage
 */
export function getApiConfig(userId: string): ApiConfig | null {
  return getStoredConfig(userId);
}

/**
 * Check if BYOK is active (non-hook version)
 * Requires userId to access user-scoped storage
 */
export function isBYOKEnabled(userId: string): boolean {
  const config = getStoredConfig(userId);
  return !!config?.key;
}
