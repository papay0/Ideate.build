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
  Send,
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
import type { Project } from "@/lib/supabase/types";
import { EditableProjectHeader } from "../../components/EditableProjectHeader";
import { useDesignStreaming, type ParsedScreen } from "../../components/StreamingScreenPreview";
import { DesignCanvas } from "../../components/DesignCanvas";
import { CodeView } from "../../components/CodeView";
import { ProjectSkeleton } from "../../components/Skeleton";
import { ImageUploadButton } from "../../components/ImageUploadButton";
import { ImageLightbox, ClickableImage } from "../../components/ImageLightbox";
import { SegmentedControl } from "../../components/SegmentedControl";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import {
  validateImage,
  uploadImage,
} from "@/lib/upload/image-upload";

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
type MobileTab = "chat" | "canvas";

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
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-[#1A1A1A]">
          {message.content}
        </p>
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
    <div className="border-t border-[#E8E4E0] p-3 bg-white">
      {/* Unified input container */}
      <div className="bg-[#F5F2EF] rounded-2xl border border-[#E8E4E0] overflow-hidden transition-all focus-within:border-[#B8956F] focus-within:ring-2 focus-within:ring-[#B8956F]/10">
        {/* Image preview - compact for chat */}
        {imageUrl && (
          <div className="px-3 pt-3 pb-1">
            <div className="flex items-center gap-2.5 p-2 bg-white/60 rounded-lg border border-[#E8E4E0]/50">
              <ClickableImage
                src={imageUrl}
                alt="Reference"
                className="w-10 h-10 rounded-md shadow-sm overflow-hidden"
                onClick={() => onImageClick?.(imageUrl)}
              />
              <span className="text-sm text-[#6B6B6B] flex-1">Reference image</span>
              <button
                onClick={() => onImageChange(null)}
                className="text-xs text-[#9A9A9A] hover:text-red-500 px-1.5 py-1 rounded hover:bg-red-50 transition-colors"
                type="button"
              >
                Remove
              </button>
            </div>
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-2 p-2 relative">
          <ImageUploadButton
            userId={userId}
            projectId={projectId}
            onImageUploaded={onImageChange}
            onImageRemoved={() => onImageChange(null)}
            currentImageUrl={imageUrl}
            disabled={disabled || isLoading || isPasting}
          />
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              disabled
                ? "Configure your API key in Settings first..."
                : "Describe changes or paste an image..."
            }
            disabled={disabled || isPasting}
            rows={1}
            className="flex-1 bg-transparent py-2.5 px-1 text-[#1A1A1A] placeholder-[#9A9A9A] focus:outline-none resize-none max-h-32 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={onSubmit}
            disabled={disabled || isLoading || isPasting || !value.trim()}
            className="w-10 h-10 bg-[#B8956F] rounded-xl flex items-center justify-center hover:bg-[#A6845F] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-sm hover:shadow-md active:scale-95"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Send className="w-4 h-4 text-white" />
            )}
          </button>
          {/* Paste upload overlay */}
          {isPasting && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
              <div className="flex items-center gap-2 text-[#B8956F]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">Uploading...</span>
              </div>
            </div>
          )}
        </div>
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
    onError: (error: string) => {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `Error: ${error}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  }), [projectId, project?.name, project?.icon, handleNameChange, handleIconChange]);

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
    if (!input.trim() || isStreaming || !hasApiKey) return;

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

    // Get API config
    const apiConfig = getApiConfig();
    if (!apiConfig) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Error: API key not configured",
          timestamp: new Date(),
        },
      ]);
      return;
    }

    // Start streaming with platform and image
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
      },
      {
        "x-api-key": apiConfig.key,
        "x-provider": apiConfig.provider,
      }
    );
  }, [input, isStreaming, hasApiKey, startStreaming, projectId, savedScreens, messages, project?.platform, pendingImageUrl]);

  // Store handleSubmit in ref for auto-generation
  submitRef.current = handleSubmit;

  // Auto-generate design when project has app_idea and no messages
  useEffect(() => {
    if (
      !isPageLoading &&
      !hasAutoGenerated &&
      hasApiKey &&
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
  }, [isPageLoading, hasAutoGenerated, hasApiKey, project?.app_idea, messages.length, input, isStreaming]);

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

        {/* Preview/Code Toggle */}
        <div className={`flex bg-[#F5F2EF] rounded-lg p-1 border border-[#E8E4E0] ml-auto flex-shrink-0 ${
          isMobile ? "text-xs" : ""
        }`}>
          <button
            onClick={() => setViewMode("preview")}
            className={`flex items-center gap-1 px-2 py-1.5 text-sm font-medium rounded-md transition-colors ${
              isMobile ? "px-2 text-xs" : "gap-1.5 px-3"
            } ${
              viewMode === "preview"
                ? "bg-white text-[#1A1A1A] shadow-sm"
                : "text-[#6B6B6B] hover:text-[#1A1A1A]"
            }`}
          >
            <Eye className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
            {!isMobile && "Preview"}
          </button>
          <button
            onClick={() => setViewMode("code")}
            className={`flex items-center gap-1 px-2 py-1.5 text-sm font-medium rounded-md transition-colors ${
              isMobile ? "px-2 text-xs" : "gap-1.5 px-3"
            } ${
              viewMode === "code"
                ? "bg-white text-[#1A1A1A] shadow-sm"
                : "text-[#6B6B6B] hover:text-[#1A1A1A]"
            }`}
          >
            <Code2 className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
            {!isMobile && "Code"}
          </button>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      {isMobile && (
        <div className="px-4 py-3 border-b border-[#E8E4E0] bg-white">
          <SegmentedControl
            options={[
              { value: "chat" as MobileTab, label: "Chat", icon: <MessageSquare className="w-4 h-4" /> },
              { value: "canvas" as MobileTab, label: "Canvas", icon: <Layers className="w-4 h-4" /> },
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
                {messages.length === 0 && !hasApiKey && <ApiKeyWarning />}

                {messages.length === 0 && hasApiKey && (
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

              {/* Input */}
              <ChatInput
                value={input}
                onChange={setInput}
                onSubmit={handleSubmit}
                isLoading={isStreaming}
                disabled={!hasApiKey}
                userId={user?.id || ""}
                projectId={projectId}
                imageUrl={pendingImageUrl}
                onImageChange={setPendingImageUrl}
                onImageClick={setLightboxImage}
              />
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
              {messages.length === 0 && !hasApiKey && <ApiKeyWarning />}

              {messages.length === 0 && hasApiKey && (
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

            {/* Input */}
            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              isLoading={isStreaming}
              disabled={!hasApiKey}
              userId={user?.id || ""}
              projectId={projectId}
              imageUrl={pendingImageUrl}
              onImageChange={setPendingImageUrl}
              onImageClick={setLightboxImage}
            />
          </div>
        )}

        {/* Mobile: Canvas Tab */}
        {isMobile && mobileActiveTab === "canvas" && (
          viewMode === "preview" ? (
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
          ) : (
            <CodeView
              screens={displayScreens}
              projectName={project?.name || "Untitled"}
            />
          )
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
