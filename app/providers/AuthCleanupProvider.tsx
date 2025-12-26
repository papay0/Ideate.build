"use client";

/**
 * AuthCleanupProvider
 *
 * Monitors Clerk auth state and clears user-scoped localStorage
 * when a user signs out. This prevents data leakage between
 * different users on the same device.
 */

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { clearUserStorage } from "@/lib/utils/user-storage";

export function AuthCleanupProvider({ children }: { children: React.ReactNode }) {
  const { user, isSignedIn, isLoaded } = useUser();
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    const currentUserId = user?.id || null;
    const previousUserId = previousUserIdRef.current;

    // Detect sign-out: we had a user before, but now we don't
    if (previousUserId && !currentUserId) {
      // Clear the previous user's localStorage data
      clearUserStorage(previousUserId);
    }

    // Update the ref for next render
    previousUserIdRef.current = currentUserId;
  }, [user?.id, isSignedIn, isLoaded]);

  return <>{children}</>;
}
