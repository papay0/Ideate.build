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

import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Sparkles,
  Clock,
  Loader2,
  FolderOpen,
  Trash2,
  Smartphone,
  Monitor,
  Infinity,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/lib/supabase/types";
import { PlatformSelector } from "./components/PlatformSelector";
import { DashboardSkeleton } from "./components/Skeleton";
import { ImageUploadButton } from "./components/ImageUploadButton";
import { ImageLightbox, ClickableImage } from "./components/ImageLightbox";
import { ModelSelector, getSelectedModel, type ModelId } from "./components/ModelSelector";
import type { PlanType } from "@/lib/constants/plans";
import { useUserSync } from "@/lib/hooks/useUserSync";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { useBYOK } from "@/lib/hooks/useBYOK";
import { usePendingPrompt } from "@/lib/hooks/usePendingPrompt";
import { QuotaExceededBanner } from "./components/QuotaExceededBanner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Platform } from "@/lib/constants/platforms";
import {
  validateImage,
  uploadImage,
} from "@/lib/upload/image-upload";
import { trackEvent } from "@/lib/hooks/useAnalytics";

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

// API key configuration is now handled by useBYOK hook


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
    <>
      {/* Mobile: Compact horizontal card */}
      <motion.div
        variants={fadeInUp}
        className="sm:hidden group bg-white border border-[#E8E4E0] hover:border-[#D4CFC9] rounded-xl p-3 flex items-center gap-3 transition-all cursor-pointer active:scale-[0.98]"
        onClick={() => router.push(`/home/projects/${project.id}`)}
      >
        {/* Emoji thumbnail */}
        <div className="w-14 h-14 rounded-xl bg-[#F5F2EF] flex items-center justify-center flex-shrink-0 relative">
          <span className="text-2xl">{project.icon || "📱"}</span>
          {/* Platform indicator */}
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-white border border-[#E8E4E0] flex items-center justify-center">
            {project.platform === "desktop" ? (
              <Monitor className="w-3 h-3 text-[#9A9A9A]" />
            ) : (
              <Smartphone className="w-3 h-3 text-[#9A9A9A]" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-[#1A1A1A] truncate text-[15px]">{project.name}</h3>
          <p className="text-sm text-[#9A9A9A] truncate">
            {project.app_idea || "No description"}
          </p>
          <span className="text-xs text-[#B5B0A8] flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" />
            {formattedDate}
          </span>
        </div>

        {/* Delete button */}
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-[#C4C0BB] hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-all flex-shrink-0 -mr-1"
          title="Delete project"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      </motion.div>

      {/* Desktop: Card with preview */}
      <motion.div
        variants={fadeInUp}
        className="hidden sm:block group relative bg-white border border-[#E8E4E0] hover:border-[#D4CFC9] rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer hover:shadow-sm"
        onClick={() => router.push(`/home/projects/${project.id}`)}
      >
        {/* Preview area with emoji icon */}
        <div className="aspect-[4/3] bg-[#F5F2EF] flex items-center justify-center border-b border-[#E8E4E0] relative">
          <span className="text-6xl">{project.icon || "📱"}</span>
          {/* Platform indicator */}
          <div className="absolute top-2 right-2">
            {project.platform === "desktop" ? (
              <Monitor className="w-4 h-4 text-[#9A9A9A]" />
            ) : (
              <Smartphone className="w-4 h-4 text-[#9A9A9A]" />
            )}
          </div>
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
    </>
  );
}

// ============================================================================
// Component: Prompt Input
// Inline prompt input for quick project creation with platform selection
// ============================================================================

function PromptInput({
  onSubmit,
  isLoading,
  userId,
  userPlan,
  isBYOKActive,
  onUpgradeClick,
}: {
  onSubmit: (prompt: string, platform: Platform, imageUrl: string | null, model: ModelId) => Promise<void>;
  isLoading: boolean;
  userId: string;
  userPlan: PlanType;
  isBYOKActive: boolean;
  onUpgradeClick: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [platform, setPlatform] = useState<Platform>("mobile");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isPasting, setIsPasting] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [selectedModel, setSelectedModelState] = useState<ModelId>("gemini-3-flash-preview");
  // Generate a temporary project ID for uploading before project creation
  const [tempProjectId] = useState(() => crypto.randomUUID());

  // Load selected model on mount, respecting user's plan
  useEffect(() => {
    setSelectedModelState(getSelectedModel(userPlan));
  }, [userPlan]);

  const handleSubmit = async () => {
    if (!prompt.trim() || isLoading) return;
    const submittedPrompt = prompt.trim();
    const submittedImageUrl = imageUrl;
    setPrompt(""); // Clear input immediately
    setImageUrl(null); // Clear image
    await onSubmit(submittedPrompt, platform, submittedImageUrl, selectedModel);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // Find image in clipboard
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault(); // Prevent default paste behavior for images

        const file = item.getAsFile();
        if (!file) return;

        // Validate
        const validationError = validateImage(file);
        if (validationError) {
          alert(validationError.message);
          return;
        }

        // Upload
        setIsPasting(true);
        try {
          const result = await uploadImage(file, userId, tempProjectId);
          setImageUrl(result.url);
        } catch (err) {
          alert(err instanceof Error ? err.message : "Upload failed");
        } finally {
          setIsPasting(false);
        }
        return;
      }
    }
  };

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="group/card relative bg-white rounded-2xl sm:rounded-3xl mb-6 sm:mb-8 shadow-[0_2px_16px_-4px_rgba(184,149,111,0.12)] sm:shadow-[0_4px_24px_-4px_rgba(184,149,111,0.15)] hover:shadow-[0_8px_32px_-4px_rgba(184,149,111,0.2)] transition-shadow duration-500"
    >
      {/* Subtle gradient border effect */}
      <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#E8E4E0] to-[#D4CFC9]/50 p-px">
        <div className="h-full w-full rounded-2xl sm:rounded-3xl bg-white" />
      </div>

      {/* Content */}
      <div className="relative p-5 sm:p-6">
        {/* Header - stacks on mobile, side-by-side on larger screens */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5">
          <div className="flex-1">
            <h2 className="font-serif text-xl sm:text-2xl text-[#1A1A1A] tracking-tight leading-tight">
              What would you like to design?
            </h2>
            <p className="text-sm text-[#9A9A9A] mt-1">Describe your vision and let AI bring it to life</p>
          </div>
          <div className="self-start sm:self-center">
            <PlatformSelector selected={platform} onChange={setPlatform} />
          </div>
        </div>

        {/* Image preview - elegant card when attached */}
        {imageUrl && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <div className="flex items-center gap-3 sm:gap-4 p-3 bg-gradient-to-r from-[#FAF8F5] to-[#F5F2EF] rounded-xl sm:rounded-2xl border border-[#E8E4E0]">
              <div className="relative flex-shrink-0">
                <ClickableImage
                  src={imageUrl}
                  alt="Reference"
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl shadow-sm ring-2 ring-white overflow-hidden"
                  onClick={() => setLightboxImage(imageUrl)}
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-[#B8956F] rounded-full flex items-center justify-center shadow-sm pointer-events-none">
                  <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1A1A1A]">Style reference</p>
                <p className="text-xs text-[#9A9A9A] hidden sm:block">Click to preview • AI will match this aesthetic</p>
                <p className="text-xs text-[#9A9A9A] sm:hidden">Tap to preview</p>
              </div>
              <button
                onClick={() => setImageUrl(null)}
                className="text-xs text-[#9A9A9A] hover:text-red-500 px-2 sm:px-3 py-1.5 rounded-lg hover:bg-white transition-all border border-transparent hover:border-red-100 flex-shrink-0"
                type="button"
              >
                Remove
              </button>
            </div>
          </motion.div>
        )}

        {/* Input area */}
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              platform === "mobile"
                ? "A fitness tracking app with workout logs, progress charts..."
                : "A modern SaaS landing page with bold typography..."
            }
            rows={3}
            disabled={isPasting}
            className="w-full bg-[#FAF8F5] rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 text-[#1A1A1A] placeholder-[#B5B0A8] focus:outline-none focus:ring-2 focus:ring-[#B8956F]/20 focus:bg-white resize-none transition-all border border-[#E8E4E0] focus:border-[#B8956F]/30 disabled:opacity-60 text-[15px] sm:text-base"
          />
          {/* Paste upload overlay */}
          {isPasting && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center">
              <div className="flex items-center gap-2 text-[#B8956F]">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-medium">Uploading image...</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom toolbar - responsive layout */}
        <div className="mt-4 pt-4 border-t border-[#E8E4E0]/60">
          {/* Mobile: vertical stack, Desktop: horizontal */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Utility buttons row */}
            <div className="flex items-center gap-3">
              {/* Hide upload button when image is attached (shown in preview card above) */}
              {!imageUrl && (
                <ImageUploadButton
                  userId={userId}
                  projectId={tempProjectId}
                  onImageUploaded={setImageUrl}
                  onImageRemoved={() => setImageUrl(null)}
                  currentImageUrl={null}
                  disabled={isLoading}
                />
              )}
              {/* Model selector */}
              {!imageUrl && <div className="w-px h-5 bg-[#E8E4E0]" />}
              <ModelSelector
                value={selectedModel}
                onChange={setSelectedModelState}
                compact
                userPlan={userPlan}
                isBYOKActive={isBYOKActive}
                onUpgradeClick={onUpgradeClick}
              />
              {/* BYOK indicator - compact infinity badge */}
              {isBYOKActive && (
                <>
                  <div className="w-px h-5 bg-[#E8E4E0]" />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#F5EFE7] text-[#B8956F] cursor-help">
                          <Infinity className="w-4 h-4" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Unlimited generations</p>
                        <p className="text-[10px] opacity-70">Using your own API key</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}
            </div>

            {/* Submit button - full width on mobile */}
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim() || isLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#B8956F] to-[#A6845F] text-white font-medium px-6 py-3 rounded-xl hover:from-[#A6845F] hover:to-[#957555] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg hover:shadow-[#B8956F]/20 active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Design it</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Image Lightbox Modal */}
      <ImageLightbox
        src={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </motion.div>
  );
}

// ============================================================================
// Main Dashboard Component
// ============================================================================

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { dbUser } = useUserSync();
  const { messagesRemaining, bonusMessagesRemaining, isLoading: isSubscriptionLoading } = useSubscription();
  const { isBYOKActive } = useBYOK();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Pending prompt from landing page
  const { getPendingPrompt, clearPendingPrompt } = usePendingPrompt();
  const [isAutoCreating, setIsAutoCreating] = useState(false);
  const pendingPromptProcessedRef = useRef(false);

  // Determine if quota is exceeded (no BYOK and no messages remaining in either pool)
  // Wait for subscription to load before determining - if no API key, we need accurate quota info
  const totalMessagesRemaining = messagesRemaining + (bonusMessagesRemaining || 0);
  const isQuotaExceeded = !isBYOKActive && !isSubscriptionLoading && totalMessagesRemaining <= 0;
  // User can generate if: has API key OR (subscription loaded AND has messages remaining in either pool)
  // If no API key and subscription is loading, don't assume they can generate
  const userCanGenerate = isBYOKActive || (!isSubscriptionLoading && totalMessagesRemaining > 0);
  // Show loading state while waiting for subscription (only if no API key)
  const isCheckingQuota = !isBYOKActive && isSubscriptionLoading;

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

  // Check for pending prompt from landing page and auto-create project
  useEffect(() => {
    // Wait for user to be loaded and not already processing
    if (!isLoaded || !user || isAutoCreating || pendingPromptProcessedRef.current) return;

    const pendingPrompt = getPendingPrompt();
    if (!pendingPrompt) return;

    // Mark as processing to prevent duplicate calls
    pendingPromptProcessedRef.current = true;
    setIsAutoCreating(true);

    // Clear the pending prompt immediately to prevent re-triggering
    clearPendingPrompt();

    // Create the project
    async function createFromPendingPrompt() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: user!.id,
          name: "Untitled Project",
          app_idea: pendingPrompt!.prompt,
          platform: pendingPrompt!.platform || "mobile",
          initial_image_url: null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating project from pending prompt:", error);
        setIsAutoCreating(false);
        return;
      }

      // Track project creation from landing page
      trackEvent("project_created", {
        project_id: data.id,
        platform: pendingPrompt!.platform || "mobile",
        source: "landing_page",
      });

      // Navigate to the new project - auto-generation will kick in on the project page
      router.push(`/home/projects/${data.id}`);
    }

    createFromPendingPrompt();
  }, [isLoaded, user, isAutoCreating, getPendingPrompt, clearPendingPrompt, router]);

  // Create new project from prompt
  const handleCreateProject = async (prompt: string, platform: Platform, imageUrl: string | null, model: ModelId) => {
    if (!user) return;

    setIsCreating(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: "Untitled Project",
        app_idea: prompt,
        platform: platform,
        initial_image_url: imageUrl,
        model: model,  // Store the selected model with the project
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project. Please try again.");
      setIsCreating(false);
      return;
    }

    // Track project creation from dashboard
    trackEvent("project_created", {
      project_id: data.id,
      platform: platform,
      source: "dashboard",
    });

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

  // Loading state (also show skeleton while auto-creating from pending prompt)
  if (!isLoaded || isLoading || isAutoCreating) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Welcome Header */}
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="mb-6 sm:mb-8"
      >
        <h1 className="font-serif text-3xl sm:text-4xl text-[#1A1A1A] mb-1 sm:mb-2">
          Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
        </h1>
        <p className="text-sm sm:text-base text-[#6B6B6B]">
          Create beautiful designs with AI
        </p>
      </motion.div>

      {/* Loading state while checking quota (only when no API key) */}
      {isCheckingQuota && (
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="mb-6 sm:mb-8"
        >
          <div className="bg-white rounded-2xl p-6 border border-[#E8E4E0]">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-[#B8956F] animate-spin" />
              <span className="text-[#6B6B6B]">Checking your subscription...</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Quota Exceeded Banner (show when no API key AND no messages remaining) */}
      {isQuotaExceeded && (
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="mb-6 sm:mb-8"
        >
          <QuotaExceededBanner />
        </motion.div>
      )}

      {/* Prompt Input (show if user can generate) */}
      {userCanGenerate && user && (
        <>
          {/* Messages remaining indicator - only show for users without API key (subscription mode) */}
          {!isBYOKActive && !isSubscriptionLoading && totalMessagesRemaining > 0 && totalMessagesRemaining <= 5 && (
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              className="mb-4"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-sm text-amber-700">
                <span className="font-medium">{totalMessagesRemaining}</span>
                <span>message{totalMessagesRemaining !== 1 ? "s" : ""} remaining</span>
              </div>
            </motion.div>
          )}
          <PromptInput
            onSubmit={handleCreateProject}
            isLoading={isCreating}
            userId={user.id}
            userPlan={(dbUser?.plan as PlanType) || "free"}
            isBYOKActive={isBYOKActive}
            onUpgradeClick={() => router.push('/home/settings')}
          />
        </>
      )}

      {/* Projects Section */}
      <div>
        <h2 className="font-serif text-xl sm:text-2xl text-[#1A1A1A] mb-4 sm:mb-6">Your Projects</h2>

        {projects.length === 0 ? (
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="text-center py-10 sm:py-12"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#F5F2EF] flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-7 h-7 sm:w-8 sm:h-8 text-[#D4CFC9]" />
            </div>
            <p className="text-sm sm:text-base text-[#6B6B6B] px-4">
              No projects yet. Describe your app idea above to get started!
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-6"
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
