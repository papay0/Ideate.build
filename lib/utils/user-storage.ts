/**
 * User-Scoped localStorage Utilities
 *
 * Provides helpers for storing user-specific data in localStorage.
 * Keys are scoped by appending the last 8 characters of the user's Clerk ID
 * to prevent data leakage between users on the same device.
 */

// ============================================================================
// Types
// ============================================================================

export type UserStorageKey = "opendesign_api_config" | "opendesign_selected_model" | "opendesign_org_context";

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get the user-scoped storage key
 * Uses last 8 chars of userId for uniqueness while keeping keys short
 */
export function getUserStorageKey(baseKey: UserStorageKey, userId: string): string {
  const suffix = userId.slice(-8);
  return `${baseKey}_${suffix}`;
}

/**
 * Get all possible user-scoped keys for a given user
 */
function getAllUserKeys(userId: string): string[] {
  const keys: UserStorageKey[] = ["opendesign_api_config", "opendesign_selected_model", "opendesign_org_context"];
  return keys.map((key) => getUserStorageKey(key, userId));
}

/**
 * Clear all user-scoped localStorage data for a specific user
 * Called on sign-out to prevent data leakage
 */
export function clearUserStorage(userId: string): void {
  if (typeof window === "undefined") return;

  const keys = getAllUserKeys(userId);
  keys.forEach((key) => {
    localStorage.removeItem(key);
  });

  // Dispatch event so hooks can react
  window.dispatchEvent(new CustomEvent("user-storage-cleared"));
}

/**
 * Get a user-scoped value from localStorage
 */
export function getUserStorageItem(baseKey: UserStorageKey, userId: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(getUserStorageKey(baseKey, userId));
}

/**
 * Set a user-scoped value in localStorage
 */
export function setUserStorageItem(baseKey: UserStorageKey, userId: string, value: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(getUserStorageKey(baseKey, userId), value);
}

/**
 * Remove a user-scoped value from localStorage
 */
export function removeUserStorageItem(baseKey: UserStorageKey, userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getUserStorageKey(baseKey, userId));
}
