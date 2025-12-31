"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import type { Organization, OrganizationMemberWithUser } from "@/lib/supabase/types";

// ============================================================================
// Types
// ============================================================================

export interface OrganizationDetails extends Organization {
  member_count: number;
  user_role: 'owner' | 'member';
}

export interface UseOrganizationReturn {
  /** Organization details */
  organization: OrganizationDetails | null;
  /** Member list (empty if not owner) */
  members: OrganizationMemberWithUser[];
  /** Total member count */
  memberCount: number;
  /** Whether current user is owner */
  isOwner: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Refetch organization data */
  refetch: () => Promise<void>;
  /** Update organization (owner only) */
  updateOrganization: (data: UpdateOrgInput) => Promise<void>;
  /** Remove a member (owner only) */
  removeMember: (memberId: string) => Promise<void>;
  /** Approve a pending member (owner only) */
  approveMember: (memberId: string) => Promise<void>;
  /** Regenerate invite code (owner only) */
  regenerateCode: () => Promise<string>;
  /** Leave organization (non-owner only) */
  leaveOrganization: () => Promise<void>;
  /** Delete organization (owner only) */
  deleteOrganization: () => Promise<void>;
}

export interface UpdateOrgInput {
  name?: string;
  icon?: string;
  require_approval?: boolean;
}

// ============================================================================
// Hook
// ============================================================================

export function useOrganization(organizationId: string | null): UseOrganizationReturn {
  const { user: clerkUser } = useUser();
  const [organization, setOrganization] = useState<OrganizationDetails | null>(null);
  const [members, setMembers] = useState<OrganizationMemberWithUser[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const isOwner = organization?.user_role === 'owner';

  // Fetch organization details
  const fetchOrganization = useCallback(async () => {
    if (!organizationId || !clerkUser?.id) {
      setOrganization(null);
      setMembers([]);
      setMemberCount(0);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch org details
      const orgResponse = await fetch(`/api/organizations/${organizationId}`);
      if (!orgResponse.ok) {
        throw new Error('Failed to fetch organization');
      }
      const orgData = await orgResponse.json();
      setOrganization(orgData);

      // Fetch members
      const membersResponse = await fetch(`/api/organizations/${organizationId}/members`);
      if (membersResponse.ok) {
        const membersData = await membersResponse.json();
        setMembers(membersData.members || []);
        setMemberCount(membersData.total_count || 0);
      }
    } catch (err) {
      console.error('Error fetching organization:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, clerkUser?.id]);

  // Fetch on mount and when ID changes
  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  // Update organization
  const updateOrganization = useCallback(async (data: UpdateOrgInput) => {
    if (!organizationId) throw new Error('No organization selected');

    const response = await fetch(`/api/organizations/${organizationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update organization');
    }

    // Refetch to get updated data
    await fetchOrganization();
  }, [organizationId, fetchOrganization]);

  // Remove member
  const removeMember = useCallback(async (memberId: string) => {
    if (!organizationId) throw new Error('No organization selected');

    const response = await fetch(`/api/organizations/${organizationId}/members/${memberId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to remove member');
    }

    // Update local state
    setMembers(prev => prev.filter(m => m.id !== memberId));
    setMemberCount(prev => prev - 1);
  }, [organizationId]);

  // Approve member
  const approveMember = useCallback(async (memberId: string) => {
    if (!organizationId) throw new Error('No organization selected');

    const response = await fetch(`/api/organizations/${organizationId}/members/${memberId}/approve`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to approve member');
    }

    // Update local state
    setMembers(prev => prev.map(m =>
      m.id === memberId ? { ...m, status: 'active' as const } : m
    ));
  }, [organizationId]);

  // Regenerate invite code
  const regenerateCode = useCallback(async (): Promise<string> => {
    if (!organizationId) throw new Error('No organization selected');

    const response = await fetch(`/api/organizations/${organizationId}/regenerate-code`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to regenerate code');
    }

    const data = await response.json();

    // Update local state
    setOrganization(prev => prev ? { ...prev, invite_code: data.invite_code } : null);

    return data.invite_code;
  }, [organizationId]);

  // Leave organization
  const leaveOrganization = useCallback(async () => {
    if (!organizationId) throw new Error('No organization selected');

    const response = await fetch(`/api/organizations/${organizationId}/leave`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to leave organization');
    }

    // Clear local state
    setOrganization(null);
    setMembers([]);
    setMemberCount(0);
  }, [organizationId]);

  // Delete organization
  const deleteOrganization = useCallback(async () => {
    if (!organizationId) throw new Error('No organization selected');

    const response = await fetch(`/api/organizations/${organizationId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete organization');
    }

    // Clear local state
    setOrganization(null);
    setMembers([]);
    setMemberCount(0);
  }, [organizationId]);

  return {
    organization,
    members,
    memberCount,
    isOwner,
    isLoading,
    error,
    refetch: fetchOrganization,
    updateOrganization,
    removeMember,
    approveMember,
    regenerateCode,
    leaveOrganization,
    deleteOrganization,
  };
}
