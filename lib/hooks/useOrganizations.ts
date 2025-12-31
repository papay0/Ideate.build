"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import type { OrganizationWithRole } from "@/lib/supabase/types";

export interface UseOrganizationsReturn {
  organizations: OrganizationWithRole[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createOrganization: (data: CreateOrgInput) => Promise<OrganizationWithRole>;
  joinOrganization: (inviteCode: string) => Promise<JoinResult>;
}

export interface CreateOrgInput {
  name: string;
  icon?: string;
  require_approval?: boolean;
}

export interface JoinResult {
  organization: {
    id: string;
    name: string;
    icon: string;
    member_count?: number;
  };
  status: 'active' | 'pending';
  message: string;
}

export function useOrganizations(): UseOrganizationsReturn {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrganizations = useCallback(async () => {
    if (!clerkUser?.id) {
      setOrganizations([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/organizations');

      if (!response.ok) {
        throw new Error('Failed to fetch organizations');
      }

      const data = await response.json();
      const newOrgs = data.organizations || [];
      setOrganizations(newOrgs);

      // Dispatch event to sync other hook instances
      window.dispatchEvent(new CustomEvent("orgs-updated", { detail: newOrgs }));
    } catch (err) {
      console.error('Error fetching organizations:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [clerkUser?.id]);

  // Fetch organizations on mount and when user changes
  useEffect(() => {
    if (clerkLoaded) {
      fetchOrganizations();
    }
  }, [clerkLoaded, fetchOrganizations]);

  // Listen for updates from other hook instances
  useEffect(() => {
    const handleOrgsUpdated = (event: CustomEvent<OrganizationWithRole[]>) => {
      setOrganizations(event.detail);
    };

    window.addEventListener("orgs-updated", handleOrgsUpdated as EventListener);
    return () => {
      window.removeEventListener("orgs-updated", handleOrgsUpdated as EventListener);
    };
  }, []);

  // Subscribe to realtime changes on organization_members table
  useEffect(() => {
    if (!clerkUser?.id) return;

    const supabase = createClient();

    // Subscribe to changes in organization_members for this user
    const channel = supabase
      .channel('org-members-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'organization_members',
          filter: `user_id=eq.${clerkUser.id}`,
        },
        () => {
          // Refetch organizations when membership changes
          fetchOrganizations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'organizations',
        },
        (payload) => {
          // Update organization details in place if it's one we're a member of
          setOrganizations(prev => {
            const updated = prev.map(org =>
              org.id === payload.new.id
                ? { ...org, ...payload.new }
                : org
            );
            // Dispatch event to sync other hook instances
            window.dispatchEvent(new CustomEvent("orgs-updated", { detail: updated }));
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clerkUser?.id, fetchOrganizations]);

  const createOrganization = useCallback(async (data: CreateOrgInput): Promise<OrganizationWithRole> => {
    const response = await fetch('/api/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create organization');
    }

    const newOrg = await response.json();

    // Add to local state immediately (realtime will also trigger but this is faster)
    const orgWithRole: OrganizationWithRole = {
      ...newOrg,
      role: 'owner',
      member_count: 1,
    };

    setOrganizations(prev => {
      const updated = [...prev, orgWithRole];
      // Dispatch event to sync other hook instances
      window.dispatchEvent(new CustomEvent("orgs-updated", { detail: updated }));
      return updated;
    });

    return orgWithRole;
  }, []);

  const joinOrganization = useCallback(async (inviteCode: string): Promise<JoinResult> => {
    const response = await fetch('/api/organizations/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code: inviteCode }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to join organization');
    }

    const result: JoinResult = await response.json();

    // If successfully joined (active), refetch immediately (realtime will also update)
    if (result.status === 'active') {
      await fetchOrganizations();
    }

    return result;
  }, [fetchOrganizations]);

  return {
    organizations,
    isLoading,
    error,
    refetch: fetchOrganizations,
    createOrganization,
    joinOrganization,
  };
}
