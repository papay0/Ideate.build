"use client";

/**
 * Dashboard Page
 *
 * The main authenticated view showing:
 * - Welcome message
 * - Quick action to create new project
 * - List of existing projects
 * - API key setup prompt if not configured
 *
 * Design: Editorial/Magazine aesthetic
 * - Warm white background (#FAF8F5)
 * - Terracotta accent (#B8956F)
 * - Playfair Display serif for headings
 *
 * Projects are fetched from Supabase and filtered by user ID.
 */

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Sparkles,
  Clock,
  ArrowRight,
  Key,
  Loader2,
  FolderOpen,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/lib/supabase/types";

// ============================================================================
// Animation Variants
// ============================================================================

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

// ============================================================================
// Helper: Check if API key is configured
// ============================================================================

function getStoredApiKey(): { key: string; provider: string } | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem("opendesign_api_config");
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

// ============================================================================
// Component: API Key Banner
// Prompts user to configure their API key if not set
// ============================================================================

function ApiKeyBanner() {
  const router = useRouter();

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="bg-[#FEF3E7] border border-[#F5D5B5] rounded-2xl p-6 mb-8"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#B8956F]/20 flex items-center justify-center flex-shrink-0">
          <Key className="w-5 h-5 text-[#B8956F]" />
        </div>
        <div className="flex-1">
          <h3 className="font-serif text-lg text-[#1A1A1A] mb-1">
            Set up your API key
          </h3>
          <p className="text-sm text-[#6B6B6B] mb-4">
            OpenDesign uses your own API key (BYOK) to generate designs. Configure
            your OpenRouter or Google Gemini key to get started.
          </p>
          <button
            onClick={() => router.push("/home/settings")}
            className="inline-flex items-center gap-2 text-sm bg-[#B8956F] hover:bg-[#A6845F] text-white px-4 py-2 rounded-lg transition-colors"
          >
            Configure API Key
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Component: Project Card
// Displays a single project with preview and actions
// ============================================================================

function ProjectCard({
  project,
  onDelete,
}: {
  project: Project;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this project?")) return;

    setIsDeleting(true);
    await onDelete(project.id);
  };

  const formattedDate = new Date(project.updated_at).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year:
        new Date(project.updated_at).getFullYear() !== new Date().getFullYear()
          ? "numeric"
          : undefined,
    }
  );

  return (
    <motion.div
      variants={fadeInUp}
      className="group relative bg-white border border-[#E8E4E0] hover:border-[#D4CFC9] rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer hover:shadow-sm"
      onClick={() => router.push(`/home/projects/${project.id}`)}
    >
      {/* Preview area with emoji icon */}
      <div className="aspect-[4/3] bg-[#F5F2EF] flex items-center justify-center border-b border-[#E8E4E0]">
        <span className="text-6xl">{project.icon || "📱"}</span>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-medium text-[#1A1A1A] truncate mb-1">{project.name}</h3>
        <p className="text-sm text-[#9A9A9A] truncate mb-3">
          {project.app_idea || "No description"}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#9A9A9A] flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formattedDate}
          </span>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="opacity-0 group-hover:opacity-100 text-[#9A9A9A] hover:text-red-500 p-1 rounded transition-all"
            title="Delete project"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Component: Prompt Input
// Inline prompt input for quick project creation
// ============================================================================

function PromptInput({
  onSubmit,
  isLoading,
}: {
  onSubmit: (prompt: string) => Promise<void>;
  isLoading: boolean;
}) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = async () => {
    if (!prompt.trim() || isLoading) return;
    const submittedPrompt = prompt.trim();
    setPrompt(""); // Clear input immediately
    await onSubmit(submittedPrompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="bg-white border border-[#E8E4E0] rounded-2xl p-6 mb-8 shadow-sm"
    >
      <h2 className="font-serif text-2xl text-[#1A1A1A] mb-4">
        What would you like to design?
      </h2>
      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your app idea... (e.g., A fitness tracking app with workout logs and progress charts)"
          rows={3}
          className="w-full bg-[#F5F2EF] border border-[#E8E4E0] rounded-xl px-4 py-3 pr-28 text-[#1A1A1A] placeholder-[#9A9A9A] focus:outline-none focus:border-[#B8956F] focus:ring-2 focus:ring-[#B8956F]/10 transition-all resize-none"
        />
        <button
          onClick={handleSubmit}
          disabled={!prompt.trim() || isLoading}
          className="absolute bottom-3 right-3 inline-flex items-center gap-2 bg-[#B8956F] text-white font-medium px-4 py-2 rounded-lg hover:bg-[#A6845F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Design it
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Main Dashboard Component
// ============================================================================

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Check for API key on mount
  useEffect(() => {
    const apiConfig = getStoredApiKey();
    setHasApiKey(!!apiConfig?.key);
  }, []);

  // Fetch projects on mount
  useEffect(() => {
    if (!isLoaded || !user) return;

    // Capture user.id to avoid closure issues with TypeScript
    const userId = user.id;

    async function fetchProjects() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching projects:", error);
      } else {
        setProjects(data || []);
      }

      setIsLoading(false);
    }

    fetchProjects();
  }, [isLoaded, user]);

  // Create new project from prompt
  const handleCreateProject = async (prompt: string) => {
    if (!user) return;

    setIsCreating(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: "Untitled Project",
        app_idea: prompt,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project. Please try again.");
      setIsCreating(false);
      return;
    }

    // Navigate to the new project
    router.push(`/home/projects/${data.id}`);
  };

  // Delete project
  const handleDeleteProject = async (projectId: string) => {
    const supabase = createClient();

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (error) {
      console.error("Error deleting project:", error);
      alert("Failed to delete project. Please try again.");
      return;
    }

    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  };

  // Loading state
  if (!isLoaded || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#B8956F] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Welcome Header */}
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="mb-8"
      >
        <h1 className="font-serif text-4xl text-[#1A1A1A] mb-2">
          Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
        </h1>
        <p className="text-[#6B6B6B]">
          Create beautiful designs with AI
        </p>
      </motion.div>

      {/* API Key Banner (if not configured) */}
      {!hasApiKey && <ApiKeyBanner />}

      {/* Prompt Input (only show if API key is configured) */}
      {hasApiKey && (
        <PromptInput onSubmit={handleCreateProject} isLoading={isCreating} />
      )}

      {/* Projects Section */}
      <div>
        <h2 className="font-serif text-2xl text-[#1A1A1A] mb-6">Your Projects</h2>

        {projects.length === 0 ? (
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="text-center py-12"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#F5F2EF] flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-[#D4CFC9]" />
            </div>
            <p className="text-[#6B6B6B]">
              No projects yet. Describe your app idea above to get started!
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={handleDeleteProject}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
