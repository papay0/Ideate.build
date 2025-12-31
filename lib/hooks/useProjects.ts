"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { useOrganizationContext } from "./useOrganizationContext";
import type { PrototypeProject } from "@/lib/supabase/types";

export interface UseProjectsReturn {
  projects: PrototypeProject[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
}

export function useProjects(): UseProjectsReturn {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { context, isPersonal, isLoading: contextLoading } = useOrganizationContext();

  const [projects, setProjects] = useState<PrototypeProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!clerkUser?.id) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();

      let query = supabase
        .from("prototype_projects")
        .select("*")
        .order("updated_at", { ascending: false });

      if (isPersonal) {
        // Personal context: show user's projects that don't belong to any organization
        query = query.eq("user_id", clerkUser.id).is("organization_id", null);
      } else if (context.type === "organization") {
        // Organization context: show all projects belonging to the organization
        query = query.eq("organization_id", context.organizationId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setProjects(data || []);
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch projects"));
    } finally {
      setIsLoading(false);
    }
  }, [clerkUser?.id, context, isPersonal]);

  // Fetch projects when context changes
  useEffect(() => {
    if (clerkLoaded && clerkUser?.id && !contextLoading) {
      fetchProjects();
    }
  }, [clerkLoaded, clerkUser?.id, contextLoading, context, fetchProjects]);

  // Subscribe to realtime changes on prototype_projects table
  useEffect(() => {
    if (!clerkUser?.id || contextLoading) return;

    const supabase = createClient();

    // Build filter based on context
    let filter: string;
    if (isPersonal) {
      // For personal context, listen to user's projects without org
      filter = `user_id=eq.${clerkUser.id}`;
    } else if (context.type === "organization") {
      // For org context, listen to org's projects
      filter = `organization_id=eq.${context.organizationId}`;
    } else {
      return;
    }

    const channel = supabase
      .channel(`projects-${isPersonal ? 'personal' : context.type === 'organization' ? context.organizationId : 'unknown'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'prototype_projects',
          filter,
        },
        (payload) => {
          // For personal context, also check organization_id is null
          if (isPersonal && payload.new.organization_id !== null) {
            return;
          }
          // Add new project to the beginning of the list
          setProjects(prev => [payload.new as PrototypeProject, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'prototype_projects',
          filter,
        },
        (payload) => {
          // For personal context, also check organization_id is null
          if (isPersonal && payload.new.organization_id !== null) {
            return;
          }
          // Update project in place and re-sort by updated_at
          setProjects(prev => {
            const updated = prev.map(p =>
              p.id === payload.new.id ? (payload.new as PrototypeProject) : p
            );
            return updated.sort((a, b) =>
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'prototype_projects',
          filter,
        },
        (payload) => {
          // Remove deleted project
          setProjects(prev => prev.filter(p => p.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clerkUser?.id, context, isPersonal, contextLoading]);

  // Delete a project
  const deleteProject = useCallback(async (projectId: string) => {
    const supabase = createClient();

    const { error: deleteError } = await supabase
      .from("prototype_projects")
      .delete()
      .eq("id", projectId);

    if (deleteError) {
      throw deleteError;
    }

    // Optimistically remove from local state (realtime will also trigger)
    setProjects(prev => prev.filter(p => p.id !== projectId));
  }, []);

  return {
    projects,
    isLoading: isLoading || contextLoading,
    error,
    refetch: fetchProjects,
    deleteProject,
  };
}
