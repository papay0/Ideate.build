"use client";

/**
 * Design Page - AI-Powered App Mockup Generator
 *
 * This is the main design interface where users:
 * 1. Enter prompts to describe their app
 * 2. Watch AI generate UI designs in real-time (mobile & desktop)
 * 3. Iterate with follow-up requests
 *
 * Layout:
 * - Left panel (1/3): Chat interface with message history
 * - Right panel (2/3): Canvas displaying design mockups with zoom/pan
 *
 * The AI generates HTML with Tailwind CSS that renders in device frames.
 * Streaming updates show designs building in real-time.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import {
  ArrowUp,
  Loader2,
  ArrowLeft,
  Sparkles,
  User,
  AlertCircle,
  CheckCircle2,
  Eye,
  Code2,
  Copy,
  Check,
  MessageSquare,
  Layers,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Project, UsageLog } from "@/lib/supabase/types";
import { EditableProjectHeader } from "../../components/EditableProjectHeader";
import { useDesignStreaming, type ParsedScreen, type UsageData, type QuotaExceededData } from "../../components/StreamingScreenPreview";
import { DesignCanvas } from "../../components/DesignCanvas";
import { CodeView } from "../../components/CodeView";
import { ProjectSkeleton } from "../../components/Skeleton";
import { ImageUploadButton } from "../../components/ImageUploadButton";
import { ImageLightbox, ClickableImage } from "../../components/ImageLightbox";
import { SegmentedControl } from "../../components/SegmentedControl";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import ReactMarkdown from "react-markdown";
import {
  validateImage,
  uploadImage,
} from "@/lib/upload/image-upload";
import { CostIndicator } from "../../components/CostIndicator";
import { ModelSelector, getSelectedModel, setSelectedModel, type ModelId } from "../../components/ModelSelector";
import { calculateCost } from "@/lib/constants/pricing";
import { useUserSync } from "@/lib/hooks/useUserSync";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { QuotaExceededBanner } from "../../components/QuotaExceededBanner";
import type { PlanType } from "@/lib/constants/plans";

// ============================================================================
// Types
// ============================================================================

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string | null;
  timestamp: Date;
}

type ViewMode = "preview" | "code";
type MobileTab = "chat" | "canvas" | "code";

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = "opendesign_api_config";

// ============================================================================
// Helper Functions
// ============================================================================

function getApiConfig(): { key: string; provider: string } | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

// ============================================================================
// Component: Chat Message
// ============================================================================

function ChatMessage({
  message,
  userImageUrl,
  onImageClick,
}: {
  message: Message;
  userImageUrl?: string;
  onImageClick?: (imageUrl: string) => void;
}) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""} group`}
    >
      {/* Avatar - only for user messages */}
      {isUser && (
        userImageUrl ? (
          <img
            src={userImageUrl}
            alt="You"
            className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-[#B8956F]">
            <User className="w-4 h-4 text-white" />
          </div>
        )
      )}

      {/* Message Content */}
      <div
        className={`relative max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-[#B8956F]/10 border border-[#B8956F]/20"
            : "bg-white border border-[#E8E4E0]"
        }`}
      >
        {/* Copy button - only for user messages */}
        {isUser && (
          <button
            onClick={handleCopyPrompt}
            className="absolute -top-2 -right-2 p-1.5 text-[#6B6B6B] hover:text-[#1A1A1A] bg-white hover:bg-[#F5F2EF] border border-[#E8E4E0] rounded-lg transition-all opacity-0 group-hover:opacity-100 shadow-sm"
            title="Copy prompt"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        )}
        {/* Attached image - clickable */}
        {message.imageUrl && (
          <div className="mb-2">
            <ClickableImage
              src={message.imageUrl}
              alt="Reference"
              className="max-w-[180px] max-h-[180px] rounded-lg overflow-hidden"
              onClick={() => onImageClick?.(message.imageUrl!)}
            />
          </div>
        )}
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-[#1A1A1A]">
            {message.content}
          </p>
        ) : (
          <div className="text-sm leading-relaxed text-[#1A1A1A] prose prose-sm prose-stone max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Component: Chat Input
// ============================================================================

function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  disabled,
  userId,
  projectId,
  imageUrl,
  onImageChange,
  onImageClick,
  selectedModel,
  onModelChange,
  isAdmin,
  userPlan,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  disabled: boolean;
  userId: string;
  projectId: string;
  imageUrl: string | null;
  onImageChange: (url: string | null) => void;
  onImageClick?: (imageUrl: string) => void;
  selectedModel: ModelId;
  onModelChange: (model: ModelId) => void;
  isAdmin: boolean;
  userPlan: PlanType;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isPasting, setIsPasting] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) {
        onSubmit();
      }
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // Find image in clipboard
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();

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
          const result = await uploadImage(file, userId, projectId);
          onImageChange(result.url);
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
    <div className="p-3">
      {/* Main container - white floating card with subtle shadow */}
      <div className="relative bg-white rounded-[20px] px-4 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
        {/* Image preview */}
        {imageUrl && (
          <div className="mb-3">
            <div className="flex items-center gap-3 p-2 bg-white/60 rounded-xl">
              <ClickableImage
                src={imageUrl}
                alt="Reference"
                className="w-10 h-10 rounded-lg overflow-hidden"
                onClick={() => onImageClick?.(imageUrl)}
              />
              <span className="text-sm text-[#6B6B6B] flex-1">Reference image</span>
              <button
                onClick={() => onImageChange(null)}
                className="text-xs text-[#9A9A9A] hover:text-red-500 px-2 py-1 rounded-md hover:bg-red-50/80 transition-all"
                type="button"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Textarea - no borders, same bg as container */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={
            disabled
              ? "Configure API key first..."
              : "Describe changes..."
          }
          disabled={disabled || isPasting}
          rows={1}
          className="w-full bg-white text-[#1A1A1A] placeholder-[#B5B0A8] resize-none max-h-32 disabled:opacity-50 disabled:cursor-not-allowed text-[15px] leading-relaxed"
          style={{ border: 'none', boxShadow: 'none', outline: 'none', WebkitAppearance: 'none' }}
        />

        {/* Bottom row - actions left, send right */}
        <div className="flex items-center justify-between mt-2">
          {/* Left side - action buttons */}
          <div className="flex items-center gap-1">
            <ImageUploadButton
              userId={userId}
              projectId={projectId}
              onImageUploaded={onImageChange}
              onImageRemoved={() => onImageChange(null)}
              currentImageUrl={null}
              disabled={disabled || isLoading || isPasting || !!imageUrl}
            />
            {/* Model selector - admin only */}
            {isAdmin && (
              <>
                <div className="w-px h-5 bg-[#E8E4E0] mx-1" />
                <ModelSelector
                  value={selectedModel}
                  onChange={onModelChange}
                  compact
                  userPlan={userPlan}
                />
              </>
            )}
          </div>

          {/* Right side - send button */}
          <button
            onClick={onSubmit}
            disabled={disabled || isLoading || isPasting || !value.trim()}
            className="w-9 h-9 bg-[#C9B896] rounded-full flex items-center justify-center hover:bg-[#B8A77D] transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <ArrowUp className="w-[18px] h-[18px] text-white stroke-[2.5]" />
            )}
          </button>
        </div>

        {/* Paste upload overlay */}
        {isPasting && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
            <div className="flex items-center gap-2 text-[#B8956F]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Uploading...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Component: API Key Warning
// ============================================================================

function ApiKeyWarning() {
  const router = useRouter();

  return (
    <div className="bg-[#FEF3E7] border border-[#F5D5B5] rounded-xl p-4 m-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[#B8956F] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-[#6B6B6B] mb-2">
            Configure your API key to start generating designs.
          </p>
          <button
            onClick={() => router.push("/home/settings")}
            className="text-sm text-[#B8956F] hover:text-[#A6845F] underline"
          >
            Go to Settings →
          </button>
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// Main Design Page Component
// ============================================================================

const SIDEBAR_MIN_WIDTH = 320;
const SIDEBAR_DEFAULT_WIDTH = 400;

export default function DesignPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const projectId = params.id as string;

  // Mobile detection
  const isMobile = useIsMobile();

  // User sync for admin role check
  const { dbUser } = useUserSync();
  const isAdmin = dbUser?.role === "admin";

  // Subscription state for quota management
  const { messagesRemaining, isLoading: isSubscriptionLoading, refresh: refreshSubscription } = useSubscription();

  // Local quota exceeded state - set when API returns QUOTA_EXCEEDED
  // This is more reliable than checking messagesRemaining because it's set immediately
  const [localQuotaExceeded, setLocalQuotaExceeded] = useState(false);

  // Ref to always have latest dbUser in callbacks
  const dbUserRef = useRef(dbUser);
  useEffect(() => {
    dbUserRef.current = dbUser;
  }, [dbUser]);

  // State
  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [savedScreens, setSavedScreens] = useState<ParsedScreen[]>([]);
  const [input, setInput] = useState("");
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [hasAutoGenerated, setHasAutoGenerated] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [editingScreenNames, setEditingScreenNames] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [mobileActiveTab, setMobileActiveTab] = useState<MobileTab>("chat");
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [totalSessionCost, setTotalSessionCost] = useState(0);
  const [selectedModel, setSelectedModelState] = useState<ModelId>("gemini-3-pro-preview");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userMessageRef = useRef<Message | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle sidebar resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const maxWidth = containerRect.width * 0.5; // Max 50%
      const newWidth = Math.min(Math.max(e.clientX - containerRect.left, SIDEBAR_MIN_WIDTH), maxWidth);
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      // Prevent text selection while resizing
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isResizing]);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Check API key on mount
  useEffect(() => {
    const config = getApiConfig();
    setHasApiKey(!!config?.key);
  }, []);

  // Load selected model from localStorage on mount, respecting user's plan
  const userPlan: PlanType = (dbUser?.plan as PlanType) || "free";
  useEffect(() => {
    const savedModel = getSelectedModel(userPlan);
    setSelectedModelState(savedModel);
  }, [userPlan]);

  // Determine if quota is exceeded
  // Use local state OR subscription state - whichever indicates exceeded
  // User can still send if they have their own API key (BYOK mode)
  const isQuotaExceeded = !hasApiKey && (localQuotaExceeded || (messagesRemaining <= 0 && !isSubscriptionLoading));
  // User can send if: has API key OR (has messages remaining AND not locally marked as exceeded)
  const canSendMessage = hasApiKey || (messagesRemaining > 0 && !localQuotaExceeded);

  // Handle model change
  const handleModelChange = useCallback((model: ModelId) => {
    setSelectedModelState(model);
    setSelectedModel(model);
  }, []);

  // Ref to store the submit function for auto-generation
  const submitRef = useRef<(() => void) | null>(null);

  // Handle project name change
  const handleNameChange = useCallback(
    async (newName: string) => {
      if (!project) return;

      const supabase = createClient();
      const { error } = await supabase
        .from("projects")
        .update({ name: newName, updated_at: new Date().toISOString() })
        .eq("id", project.id);

      if (error) {
        console.error("Error updating project name:", error);
        return;
      }

      setProject((prev) => (prev ? { ...prev, name: newName } : null));
    },
    [project]
  );

  // Handle project icon change
  const handleIconChange = useCallback(
    async (newIcon: string) => {
      if (!project) return;

      const supabase = createClient();
      const { error } = await supabase
        .from("projects")
        .update({ icon: newIcon, updated_at: new Date().toISOString() })
        .eq("id", project.id);

      if (error) {
        console.error("Error updating project icon:", error);
        return;
      }

      setProject((prev) => (prev ? { ...prev, icon: newIcon } : null));
    },
    [project]
  );

  // Streaming callbacks
  const streamingCallbacks = useCallback(() => ({
    onMessage: async (message: string) => {
      // Add LLM message to chat
      const llmMessage: Message = {
        id: `llm-${Date.now()}-${Math.random()}`,
        role: "assistant",
        content: message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, llmMessage]);

      // Save assistant message to database
      const supabase = createClient();
      await supabase.from("design_messages").insert({
        project_id: projectId,
        role: "assistant",
        content: message,
      });
    },
    onProjectName: (name: string) => {
      // Update immediately if project name is still "Untitled Project"
      if (project?.name === "Untitled Project") {
        console.log(`[Page] Updating project name immediately: "${name}"`);
        handleNameChange(name);
      }
    },
    onProjectIcon: (icon: string) => {
      // Update immediately if icon is still default
      if (project?.icon === "📱") {
        console.log(`[Page] Updating project icon immediately: "${icon}"`);
        handleIconChange(icon);
      }
    },
    onScreenStart: (screenName: string) => {
      // New screen started - add to editing set
      console.log(`[Page] New screen started: "${screenName}"`);
      setEditingScreenNames((prev) => new Set(prev).add(screenName));
    },
    onScreenEditStart: (screenName: string) => {
      // Editing existing screen - add to editing set
      console.log(`[Page] Editing screen started: "${screenName}"`);
      setEditingScreenNames((prev) => new Set(prev).add(screenName));
    },
    onScreenComplete: (screen: ParsedScreen) => {
      // Screen completed - remove from editing set
      console.log(`[Page] Screen completed: "${screen.name}", isEdit: ${screen.isEdit}`);
      setEditingScreenNames((prev) => {
        const next = new Set(prev);
        next.delete(screen.name);
        return next;
      });
    },
    onStreamComplete: async (screens: ParsedScreen[]) => {
      console.log(`[Page] onStreamComplete called with ${screens.length} screens:`, screens.map(s => s.name));

      // Clear all editing states
      setEditingScreenNames(new Set());

      // Show completion indicator (stays until next message)
      setJustCompleted(true);

      // Merge new screens with existing saved screens
      // - Update screens with matching names
      // - Add new screens that don't exist
      // - Keep old screens that weren't regenerated
      setSavedScreens((prevScreens) => {
        console.log(`[Page] Merging: ${screens.length} new + ${prevScreens.length} existing`);
        const mergedScreens = [...prevScreens];

        for (const newScreen of screens) {
          const existingIndex = mergedScreens.findIndex(s => s.name === newScreen.name);
          if (existingIndex >= 0) {
            // Update existing screen
            console.log(`[Page] Updating existing screen: "${newScreen.name}"`);
            mergedScreens[existingIndex] = newScreen;
          } else {
            // Add new screen
            console.log(`[Page] Adding new screen: "${newScreen.name}"`);
            mergedScreens.push(newScreen);
          }
        }

        console.log(`[Page] Merged result: ${mergedScreens.length} screens`, mergedScreens.map(s => s.name));
        return mergedScreens;
      });

      // Refresh subscription to get updated messages remaining
      refreshSubscription();

      // Save to database
      const supabase = createClient();

      // Save/update designs
      for (let i = 0; i < screens.length; i++) {
        const screen = screens[i];
        await supabase.from("project_designs").upsert(
          {
            project_id: projectId,
            screen_name: screen.name,
            html_content: screen.html,
            sort_order: i,
          },
          { onConflict: "project_id,screen_name" }
        );
      }

      // Project name and icon are now updated immediately in onProjectName/onProjectIcon callbacks
    },
    onUsage: async (usage: UsageData) => {
      console.log(`[Page] Usage received:`, usage);

      // Get the latest dbUser from ref (avoids stale closure)
      const currentDbUser = dbUserRef.current;

      // Calculate cost
      const costBreakdown = calculateCost(
        usage.inputTokens,
        usage.outputTokens,
        usage.cachedTokens,
        usage.model,
        usage.provider
      );

      // Create usage log entry
      const usageLog: UsageLog = {
        id: `temp-${Date.now()}`,
        project_id: projectId,
        user_id: currentDbUser?.id || "",
        input_tokens: usage.inputTokens,
        output_tokens: usage.outputTokens,
        cached_tokens: usage.cachedTokens,
        input_cost: costBreakdown.inputCost,
        output_cost: costBreakdown.outputCost,
        total_cost: costBreakdown.totalCost,
        model: usage.model,
        provider: usage.provider,
        created_at: new Date().toISOString(),
      };

      // Update local state
      setUsageLogs((prev) => [...prev, usageLog]);
      setTotalSessionCost((prev) => prev + costBreakdown.totalCost);

      // Save to database if we have a valid user
      if (currentDbUser?.id) {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("usage_logs")
          .insert({
            project_id: projectId,
            user_id: currentDbUser.id,
            input_tokens: usage.inputTokens,
            output_tokens: usage.outputTokens,
            cached_tokens: usage.cachedTokens,
            input_cost: costBreakdown.inputCost,
            output_cost: costBreakdown.outputCost,
            total_cost: costBreakdown.totalCost,
            model: usage.model,
            provider: usage.provider,
          })
          .select()
          .single();

        if (error) {
          console.error("[Page] Failed to save usage log:", error);
        } else {
          // Update with real ID from database
          setUsageLogs((prev) =>
            prev.map((log) =>
              log.id === usageLog.id ? { ...log, id: data.id } : log
            )
          );
        }
      } else {
        console.warn("[Page] No dbUser available, usage not saved to database");
      }
    },
    onError: (error: string) => {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `Error: ${error}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
    onQuotaExceeded: (data: QuotaExceededData) => {
      console.log("[Page] Quota exceeded:", data);
      // Set local state immediately
      setLocalQuotaExceeded(true);
      // Refresh subscription to sync state
      refreshSubscription();
      // Show user-friendly message in chat (not raw JSON!)
      const friendlyMessage: Message = {
        id: `quota-${Date.now()}`,
        role: "assistant",
        content: data.plan === "free"
          ? "You've used all your free messages this month. Upgrade to Pro for 50 messages/month, or configure your own API key in Settings to continue for free!"
          : "You've used all your messages this month. Purchase more messages or configure your own API key in Settings.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, friendlyMessage]);
    },
  }), [projectId, project?.name, project?.icon, handleNameChange, handleIconChange, refreshSubscription]);

  // Use streaming hook
  const {
    isStreaming,
    completedScreens,
    currentStreamingHtml,
    currentScreenName,
    isEditingExistingScreen,
    startStreaming,
  } = useDesignStreaming(streamingCallbacks());

  // Merge saved screens with newly completed screens during streaming
  // This ensures existing screens remain visible while new ones are being generated
  const displayScreens = (() => {
    if (!isStreaming && completedScreens.length === 0) {
      console.log(`[Page] displayScreens: using savedScreens (${savedScreens.length})`, savedScreens.map(s => s.name));
      return savedScreens;
    }

    // Merge: start with saved screens, update/add completed screens
    const merged = [...savedScreens];
    for (const completed of completedScreens) {
      const existingIndex = merged.findIndex(s => s.name === completed.name);
      if (existingIndex >= 0) {
        merged[existingIndex] = completed;
      } else {
        merged.push(completed);
      }
    }
    console.log(`[Page] displayScreens: merged ${savedScreens.length} saved + ${completedScreens.length} completed = ${merged.length}`, merged.map(s => s.name));
    return merged;
  })();


  // Fetch project data
  useEffect(() => {
    if (!isLoaded || !user) return;

    // Capture user.id to avoid closure issues with TypeScript
    const userId = user.id;

    async function fetchProject() {
      const supabase = createClient();

      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .eq("user_id", userId)
        .single();

      if (projectError || !projectData) {
        console.error("Error fetching project:", projectError);
        router.push("/home");
        return;
      }

      setProject(projectData);

      // Fetch existing designs
      const { data: designs } = await supabase
        .from("project_designs")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order");

      if (designs && designs.length > 0) {
        setSavedScreens(
          designs.map((d) => ({
            name: d.screen_name,
            html: d.html_content,
          }))
        );
      }

      // Fetch message history
      const { data: messageHistory } = await supabase
        .from("design_messages")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at");

      if (messageHistory && messageHistory.length > 0) {
        setMessages(
          messageHistory.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            imageUrl: m.image_url,
            timestamp: new Date(m.created_at),
          }))
        );
      }

      // Fetch usage logs for this session (admin only)
      const { data: usageData } = await supabase
        .from("usage_logs")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at");

      if (usageData && usageData.length > 0) {
        setUsageLogs(usageData);
        const total = usageData.reduce((sum, log) => sum + log.total_cost, 0);
        setTotalSessionCost(total);
      }

      // Auto-start with app idea if no messages yet
      if (
        projectData.app_idea &&
        (!messageHistory || messageHistory.length === 0)
      ) {
        setInput(projectData.app_idea);
        // Also set the initial image if one was attached during creation
        if (projectData.initial_image_url) {
          setPendingImageUrl(projectData.initial_image_url);
        }
      }

      setIsPageLoading(false);
    }

    fetchProject();
  }, [isLoaded, user, projectId, router]);

  // Handle submit - uses streaming hook
  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isStreaming || !canSendMessage) return;

    // Clear completion indicator when sending new message
    setJustCompleted(false);

    const currentImageUrl = pendingImageUrl;
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      imageUrl: currentImageUrl,
      timestamp: new Date(),
    };

    // Add to UI immediately
    setMessages((prev) => [...prev, userMessage]);

    // Save user message to database IMMEDIATELY (before streaming starts)
    // This ensures correct ordering when messages are loaded later
    const supabase = createClient();
    await supabase.from("design_messages").insert({
      project_id: projectId,
      role: "user",
      content: userMessage.content,
      image_url: currentImageUrl,
    });

    // Clear the ref since we saved immediately
    userMessageRef.current = null;

    const promptText = input.trim();
    setInput("");
    setPendingImageUrl(null);

    // Get API config (may be null if using platform key)
    const apiConfig = getApiConfig();

    // Prepare headers - only include API key if user has their own (BYOK)
    const headers: Record<string, string> = {};
    if (apiConfig?.key) {
      headers["x-api-key"] = apiConfig.key;
      headers["x-provider"] = apiConfig.provider;
    }

    // Start streaming with platform, image, and model
    await startStreaming(
      "/api/ai/generate-design",
      {
        prompt: promptText,
        projectId,
        existingScreens: savedScreens,
        conversationHistory: messages.map((m) => ({
          role: m.role,
          content: m.content,
          imageUrl: m.imageUrl,
        })),
        platform: project?.platform || "mobile",
        imageUrl: currentImageUrl,
        model: selectedModel,
      },
      headers
    );
  }, [input, isStreaming, canSendMessage, startStreaming, projectId, savedScreens, messages, project?.platform, pendingImageUrl, selectedModel]);

  // Store handleSubmit in ref for auto-generation
  submitRef.current = handleSubmit;

  // Auto-generate design when project has app_idea and no messages
  useEffect(() => {
    if (
      !isPageLoading &&
      !hasAutoGenerated &&
      canSendMessage &&
      project?.app_idea &&
      messages.length === 0 &&
      input.trim() &&
      !isStreaming
    ) {
      setHasAutoGenerated(true);
      // Call submit on next tick
      setTimeout(() => {
        submitRef.current?.();
      }, 100);
    }
  }, [isPageLoading, hasAutoGenerated, canSendMessage, project?.app_idea, messages.length, input, isStreaming]);

  // Loading state
  if (!isLoaded || isPageLoading) {
    return <ProjectSkeleton />;
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className={`flex items-center border-b border-[#E8E4E0] bg-white ${
        isMobile ? "gap-2 px-3 py-3" : "gap-4 px-6 py-4"
      }`}>
        <button
          onClick={() => router.push("/home")}
          className="p-2 text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#F5F2EF] rounded-lg transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        {project && (
          <EditableProjectHeader
            name={project.name}
            icon={project.icon}
            description={isMobile ? undefined : project.app_idea}
            onNameChange={handleNameChange}
            onIconChange={handleIconChange}
            compact={isMobile}
          />
        )}

        {/* Preview/Code Toggle - Desktop only */}
        {!isMobile && (
          <div className="flex bg-[#F5F2EF] rounded-lg p-1 border border-[#E8E4E0] ml-auto flex-shrink-0">
            <button
              onClick={() => setViewMode("preview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === "preview"
                  ? "bg-white text-[#1A1A1A] shadow-sm"
                  : "text-[#6B6B6B] hover:text-[#1A1A1A]"
              }`}
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            <button
              onClick={() => setViewMode("code")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === "code"
                  ? "bg-white text-[#1A1A1A] shadow-sm"
                  : "text-[#6B6B6B] hover:text-[#1A1A1A]"
              }`}
            >
              <Code2 className="w-4 h-4" />
              Code
            </button>
          </div>
        )}
      </div>

      {/* Mobile Tab Switcher */}
      {isMobile && (
        <div className="px-4 py-3 border-b border-[#E8E4E0] bg-white">
          <SegmentedControl
            options={[
              { value: "chat" as MobileTab, label: "Chat", icon: <MessageSquare className="w-4 h-4" /> },
              { value: "canvas" as MobileTab, label: "Canvas", icon: <Layers className="w-4 h-4" /> },
              { value: "code" as MobileTab, label: "Code", icon: <Code2 className="w-4 h-4" /> },
            ]}
            value={mobileActiveTab}
            onChange={setMobileActiveTab}
          />
        </div>
      )}

      {/* Main Content */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden">
        {/* Desktop: Split View */}
        {!isMobile && (
          <>
            {/* Left Panel - Chat */}
            <div
              style={{ width: sidebarWidth }}
              className="flex-shrink-0 flex flex-col border-r border-[#E8E4E0] bg-white"
            >
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && !canSendMessage && !isQuotaExceeded && <ApiKeyWarning />}

                {messages.length === 0 && canSendMessage && (
                  <div className="text-center py-8">
                    <Sparkles className="w-8 h-8 mx-auto mb-3 text-[#D4CFC9]" />
                    <p className="text-sm text-[#9A9A9A]">
                      Describe your app and I&apos;ll generate UI designs
                    </p>
                  </div>
                )}

                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    userImageUrl={user?.imageUrl}
                    onImageClick={setLightboxImage}
                  />
                ))}

                {isStreaming && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="bg-white border border-[#E8E4E0] rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-[#6B6B6B]">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {currentScreenName ? `Generating ${currentScreenName}...` : "Generating designs..."}
                      </div>
                    </div>
                  </motion.div>
                )}

                {justCompleted && !isStreaming && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <CheckCircle2 className="w-4 h-4" />
                        Generation complete! {displayScreens.length} screen{displayScreens.length !== 1 ? "s" : ""} ready.
                      </div>
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Cost Indicator (admin only) */}
              {isAdmin && (
                <div className="px-3 pt-2">
                  <CostIndicator
                    usageLogs={usageLogs}
                    totalCost={totalSessionCost}
                    isVisible={usageLogs.length > 0}
                  />
                </div>
              )}

              {/* Input or Quota Exceeded Banner */}
              {isQuotaExceeded ? (
                <div className="p-3">
                  <QuotaExceededBanner />
                </div>
              ) : (
                <ChatInput
                  value={input}
                  onChange={setInput}
                  onSubmit={handleSubmit}
                  isLoading={isStreaming}
                  disabled={!canSendMessage}
                  userId={user?.id || ""}
                  projectId={projectId}
                  imageUrl={pendingImageUrl}
                  onImageChange={setPendingImageUrl}
                  onImageClick={setLightboxImage}
                  selectedModel={selectedModel}
                  onModelChange={handleModelChange}
                  isAdmin={isAdmin}
                  userPlan={userPlan}
                />
              )}
            </div>

            {/* Resize Handle */}
            <div
              onMouseDown={handleMouseDown}
              className={`w-1 cursor-col-resize bg-transparent hover:bg-[#B8956F]/30 transition-colors relative group ${
                isResizing ? "bg-[#B8956F]/50" : ""
              }`}
            >
              <div className="absolute inset-y-0 -left-1 -right-1" />
              <div
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full transition-colors ${
                  isResizing ? "bg-[#B8956F]" : "bg-[#D4CFC9] group-hover:bg-[#B8956F]"
                }`}
              />
            </div>

            {/* Right Panel - Canvas or Code View */}
            {viewMode === "preview" ? (
              <DesignCanvas
                completedScreens={displayScreens}
                currentStreamingHtml={currentStreamingHtml}
                currentScreenName={currentScreenName}
                isStreaming={isStreaming}
                editingScreenNames={editingScreenNames}
                isEditingExistingScreen={isEditingExistingScreen}
                platform={project?.platform || "mobile"}
              />
            ) : (
              <CodeView
                screens={displayScreens}
                projectName={project?.name || "Untitled"}
              />
            )}
          </>
        )}

        {/* Mobile: Chat Tab */}
        {isMobile && mobileActiveTab === "chat" && (
          <div className="flex-1 flex flex-col bg-white">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && !canSendMessage && !isQuotaExceeded && <ApiKeyWarning />}

              {messages.length === 0 && canSendMessage && (
                <div className="text-center py-8">
                  <Sparkles className="w-8 h-8 mx-auto mb-3 text-[#D4CFC9]" />
                  <p className="text-sm text-[#9A9A9A]">
                    Describe your app and I&apos;ll generate UI designs
                  </p>
                </div>
              )}

              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  userImageUrl={user?.imageUrl}
                  onImageClick={setLightboxImage}
                />
              ))}

              {isStreaming && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="bg-white border border-[#E8E4E0] rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-[#6B6B6B]">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {currentScreenName ? `Generating ${currentScreenName}...` : "Generating designs..."}
                    </div>
                  </div>
                </motion.div>
              )}

              {justCompleted && !isStreaming && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <CheckCircle2 className="w-4 h-4" />
                      Generation complete! {displayScreens.length} screen{displayScreens.length !== 1 ? "s" : ""} ready.
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Cost Indicator (admin only) */}
            {isAdmin && (
              <div className="px-3 py-2 border-t border-[#E8E4E0]">
                <CostIndicator
                  usageLogs={usageLogs}
                  totalCost={totalSessionCost}
                  isVisible={usageLogs.length > 0}
                />
              </div>
            )}

            {/* Input or Quota Exceeded Banner */}
            {isQuotaExceeded ? (
              <div className="p-3">
                <QuotaExceededBanner />
              </div>
            ) : (
              <ChatInput
                value={input}
                onChange={setInput}
                onSubmit={handleSubmit}
                isLoading={isStreaming}
                disabled={!canSendMessage}
                userId={user?.id || ""}
                projectId={projectId}
                imageUrl={pendingImageUrl}
                onImageChange={setPendingImageUrl}
                onImageClick={setLightboxImage}
                selectedModel={selectedModel}
                onModelChange={handleModelChange}
                isAdmin={isAdmin}
                userPlan={userPlan}
              />
            )}
          </div>
        )}

        {/* Mobile: Canvas Tab */}
        {isMobile && mobileActiveTab === "canvas" && (
          <DesignCanvas
            completedScreens={displayScreens}
            currentStreamingHtml={currentStreamingHtml}
            currentScreenName={currentScreenName}
            isStreaming={isStreaming}
            editingScreenNames={editingScreenNames}
            isEditingExistingScreen={isEditingExistingScreen}
            platform={project?.platform || "mobile"}
            isMobileView={true}
          />
        )}

        {/* Mobile: Code Tab */}
        {isMobile && mobileActiveTab === "code" && (
          <CodeView
            screens={displayScreens}
            projectName={project?.name || "Untitled"}
            isMobileView={true}
          />
        )}
      </div>

      {/* Image Lightbox Modal */}
      <ImageLightbox
        src={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
}
