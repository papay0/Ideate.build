"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { getUserStorageItem, setUserStorageItem } from "@/lib/utils/user-storage";
import { useOrganizations } from "./useOrganizations";
import type { OrganizationWithRole } from "@/lib/supabase/types";

// ============================================================================
// Types
// ============================================================================

export type OrganizationContext =
  | { type: 'personal' }
  | { type: 'organization'; organizationId: string };

export interface UseOrganizationContextReturn {
  /** Current context (personal or organization) */
  context: OrganizationContext;
  /** Current organization if in org context, null if personal */
  currentOrg: OrganizationWithRole | null;
  /** Set the current context */
  setContext: (ctx: OrganizationContext) => void;
  /** Switch to personal context */
  switchToPersonal: () => void;
  /** Switch to organization context */
  switchToOrganization: (orgId: string) => void;
  /** Whether current context is personal */
  isPersonal: boolean;
  /** Whether current context is an organization */
  isOrganization: boolean;
  /** Organization ID if in org context, null otherwise */
  organizationId: string | null;
  /** Loading state (depends on organizations loading) */
  isLoading: boolean;
}

// ============================================================================
// Hook
// ============================================================================

export function useOrganizationContext(): UseOrganizationContextReturn {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { organizations, isLoading: orgsLoading } = useOrganizations();

  // Initialize context from localStorage or default to personal
  const [context, setContextState] = useState<OrganizationContext>({ type: 'personal' });
  const [isInitialized, setIsInitialized] = useState(false);

  // Load context from localStorage on mount
  useEffect(() => {
    if (!clerkLoaded || !clerkUser?.id) return;

    const stored = getUserStorageItem("opendesign_org_context", clerkUser.id);

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as OrganizationContext;
        setContextState(parsed);
      } catch {
        // Invalid stored value, use default
        setContextState({ type: 'personal' });
      }
    }

    setIsInitialized(true);
  }, [clerkLoaded, clerkUser?.id]);

  // Listen for context changes from other components to sync state
  useEffect(() => {
    const handleContextChange = (event: CustomEvent<OrganizationContext>) => {
      setContextState(event.detail);
    };

    window.addEventListener("org-context-changed", handleContextChange as EventListener);
    return () => {
      window.removeEventListener("org-context-changed", handleContextChange as EventListener);
    };
  }, []);

  // Validate that selected org still exists when orgs load
  useEffect(() => {
    if (!isInitialized || orgsLoading) return;

    if (context.type === 'organization') {
      const orgExists = organizations.some(org => org.id === context.organizationId);
      if (!orgExists) {
        // Org no longer exists or user is no longer a member, switch to personal
        setContextState({ type: 'personal' });
        if (clerkUser?.id) {
          setUserStorageItem("opendesign_org_context", clerkUser.id, JSON.stringify({ type: 'personal' }));
        }
      }
    }
  }, [isInitialized, orgsLoading, organizations, context, clerkUser?.id]);

  // Set context and persist to localStorage
  const setContext = useCallback((newContext: OrganizationContext) => {
    setContextState(newContext);

    if (clerkUser?.id) {
      setUserStorageItem("opendesign_org_context", clerkUser.id, JSON.stringify(newContext));
    }

    // Dispatch event so other components can react
    window.dispatchEvent(new CustomEvent("org-context-changed", { detail: newContext }));
  }, [clerkUser?.id]);

  const switchToPersonal = useCallback(() => {
    setContext({ type: 'personal' });
  }, [setContext]);

  const switchToOrganization = useCallback((orgId: string) => {
    setContext({ type: 'organization', organizationId: orgId });
  }, [setContext]);

  // Get current org details
  const currentOrg = useMemo(() => {
    if (context.type === 'personal') return null;
    return organizations.find(org => org.id === context.organizationId) || null;
  }, [context, organizations]);

  const isPersonal = context.type === 'personal';
  const isOrganization = context.type === 'organization';
  const organizationId = context.type === 'organization' ? context.organizationId : null;

  return {
    context,
    currentOrg,
    setContext,
    switchToPersonal,
    switchToOrganization,
    isPersonal,
    isOrganization,
    organizationId,
    isLoading: !isInitialized || orgsLoading,
  };
}
