"use client";

/**
 * Prototype Page - AI-Powered Interactive Prototype Generator
 *
 * This is the prototype interface where admins:
 * 1. Enter prompts to describe their app
 * 2. Watch AI generate interactive UI screens in real-time
 * 3. Click "Play" to navigate between screens
 *
 * Key differences from Design mode:
 * - Screens have grid positions [col, row]
 * - Navigation uses anchor links with data-flow attributes
 * - One screen is marked as [ROOT] entry point
 * - Uses prototype_* tables instead of project_* tables
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
  Infinity,
  Play,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { PrototypeProject, PrototypeScreen, UsageLog } from "@/lib/supabase/types";
import { EditableProjectHeader } from "../../components/EditableProjectHeader";
import { useDesignStreaming, type ParsedScreen, type UsageData, type QuotaExceededData } from "../../components/StreamingScreenPreview";
import { DesignCanvas } from "../../components/DesignCanvas";
import { CodeView } from "../../components/CodeView";
import { ExportMenu } from "../../components/ExportMenu";
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
import { ModelSelector, setSelectedModel, type ModelId } from "../../components/ModelSelector";
import { calculateCost } from "@/lib/constants/pricing";
import { useUserSync } from "@/lib/hooks/useUserSync";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { useBYOK, getApiConfig } from "@/lib/hooks/useBYOK";
import { trackEvent } from "@/lib/hooks/useAnalytics";
import { QuotaExceededBanner } from "../../components/QuotaExceededBanner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
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

      <div
        className={`relative max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-[#B8956F]/10 border border-[#B8956F]/20"
            : "bg-white border border-[#E8E4E0]"
        }`}
      >
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
  userPlan,
  isBYOKActive,
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
  userPlan: PlanType;
  isBYOKActive: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isPasting, setIsPasting] = useState(false);

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

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();

        const file = item.getAsFile();
        if (!file) return;

        const validationError = validateImage(file);
        if (validationError) {
          alert(validationError.message);
          return;
        }

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
    <div className="px-3 pb-3">
      <div className="relative bg-white rounded-[20px] px-4 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
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

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={
            disabled
              ? "Configure API key first..."
              : "Describe your prototype..."
          }
          disabled={disabled || isPasting}
          rows={1}
          className="w-full bg-white text-[#1A1A1A] placeholder-[#B5B0A8] resize-none max-h-32 disabled:opacity-50 disabled:cursor-not-allowed text-[15px] leading-relaxed"
          style={{ border: 'none', boxShadow: 'none', outline: 'none', WebkitAppearance: 'none' }}
        />

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
            <ImageUploadButton
              userId={userId}
              projectId={projectId}
              onImageUploaded={onImageChange}
              onImageRemoved={() => onImageChange(null)}
              currentImageUrl={null}
              disabled={disabled || isLoading || isPasting || !!imageUrl}
            />
            <div className="w-px h-5 bg-[#E8E4E0] mx-1" />
            <ModelSelector
              value={selectedModel}
              onChange={onModelChange}
              compact
              userPlan={userPlan}
              isBYOKActive={isBYOKActive}
              userId={userId}
            />
            {isBYOKActive && (
              <>
                <div className="w-px h-5 bg-[#E8E4E0] mx-1" />
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
            Configure your API key to start generating prototypes.
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
// Main Prototype Page Component
// ============================================================================

export default function PrototypePage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const projectId = params.id as string;

  const isMobile = useIsMobile();
  const { dbUser } = useUserSync();
  const isAdmin = dbUser?.role === "admin";

  // Redirect non-admins
  useEffect(() => {
    if (dbUser && dbUser.role !== "admin") {
      router.push("/home");
    }
  }, [dbUser, router]);

  const { messagesRemaining, bonusMessagesRemaining, isLoading: isSubscriptionLoading, refresh: refreshSubscription } = useSubscription();
  const { isBYOKActive, isInitialized: isBYOKInitialized } = useBYOK();
  const [localQuotaExceeded, setLocalQuotaExceeded] = useState(false);

  const dbUserRef = useRef(dbUser);
  useEffect(() => {
    dbUserRef.current = dbUser;
  }, [dbUser]);

  // State
  const [project, setProject] = useState<PrototypeProject | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [savedScreens, setSavedScreens] = useState<ParsedScreen[]>([]);
  const [input, setInput] = useState("");
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [hasAutoGenerated, setHasAutoGenerated] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [editingScreenNames, setEditingScreenNames] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [mobileActiveTab, setMobileActiveTab] = useState<MobileTab>("chat");
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [totalSessionCost, setTotalSessionCost] = useState(0);
  const [selectedModel, setSelectedModelState] = useState<ModelId>("gemini-3-flash-preview");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userMessageRef = useRef<Message | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const userPlan: PlanType = (dbUser?.plan as PlanType) || "free";
  const totalMessagesRemaining = messagesRemaining + (bonusMessagesRemaining || 0);
  const isQuotaExceeded = !isBYOKActive && (localQuotaExceeded || (totalMessagesRemaining <= 0 && !isSubscriptionLoading));
  const canSendMessage = isBYOKActive || (totalMessagesRemaining > 0 && !localQuotaExceeded);

  const handleModelChange = useCallback(async (model: ModelId) => {
    setSelectedModelState(model);
    setSelectedModel(user?.id || null, model);

    if (project?.id) {
      const supabase = createClient();
      await supabase
        .from("prototype_projects")
        .update({ model, updated_at: new Date().toISOString() })
        .eq("id", project.id);
    }
  }, [project?.id, user?.id]);

  const submitRef = useRef<(() => void) | null>(null);

  const handleNameChange = useCallback(
    async (newName: string) => {
      if (!project) return;

      const supabase = createClient();
      const { error } = await supabase
        .from("prototype_projects")
        .update({ name: newName, updated_at: new Date().toISOString() })
        .eq("id", project.id);

      if (error) {
        console.error("Error updating prototype name:", error);
        return;
      }

      setProject((prev) => (prev ? { ...prev, name: newName } : null));
    },
    [project]
  );

  const handleIconChange = useCallback(
    async (newIcon: string) => {
      if (!project) return;

      const supabase = createClient();
      const { error } = await supabase
        .from("prototype_projects")
        .update({ icon: newIcon, updated_at: new Date().toISOString() })
        .eq("id", project.id);

      if (error) {
        console.error("Error updating prototype icon:", error);
        return;
      }

      setProject((prev) => (prev ? { ...prev, icon: newIcon } : null));
    },
    [project]
  );

  // Streaming callbacks for prototype mode
  const streamingCallbacks = useCallback(() => ({
    onMessage: async (message: string) => {
      const llmMessage: Message = {
        id: `llm-${Date.now()}-${Math.random()}`,
        role: "assistant",
        content: message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, llmMessage]);

      const supabase = createClient();
      await supabase.from("prototype_messages").insert({
        project_id: projectId,
        role: "assistant",
        content: message,
      });
    },
    onProjectName: (name: string) => {
      if (project?.name === "Untitled Prototype") {
        handleNameChange(name);
      }
    },
    onProjectIcon: (icon: string) => {
      if (project?.icon === "🎨") {
        handleIconChange(icon);
      }
    },
    onScreenStart: (screenName: string) => {
      setEditingScreenNames((prev) => new Set(prev).add(screenName));
    },
    onScreenEditStart: (screenName: string) => {
      setEditingScreenNames((prev) => new Set(prev).add(screenName));
    },
    onScreenComplete: (screen: ParsedScreen) => {
      setEditingScreenNames((prev) => {
        const next = new Set(prev);
        next.delete(screen.name);
        return next;
      });
    },
    onStreamComplete: async (screens: ParsedScreen[]) => {
      setEditingScreenNames(new Set());
      setJustCompleted(true);

      setSavedScreens((prevScreens) => {
        const mergedScreens = [...prevScreens];
        for (const newScreen of screens) {
          const existingIndex = mergedScreens.findIndex(s => s.name === newScreen.name);
          if (existingIndex >= 0) {
            mergedScreens[existingIndex] = newScreen;
          } else {
            mergedScreens.push(newScreen);
          }
        }
        return mergedScreens;
      });

      refreshSubscription();

      // Save to prototype_screens table
      const supabase = createClient();
      for (let i = 0; i < screens.length; i++) {
        const screen = screens[i];
        // Use parsed grid position and isRoot from AI response
        await supabase.from("prototype_screens").upsert(
          {
            project_id: projectId,
            screen_name: screen.name,
            html_content: screen.html,
            sort_order: i,
            grid_col: screen.gridCol ?? 0,
            grid_row: screen.gridRow ?? i,
            is_root: screen.isRoot ?? (i === 0),
          },
          { onConflict: "project_id,screen_name" }
        );
      }
    },
    onUsage: async (usage: UsageData) => {
      const currentDbUser = dbUserRef.current;
      const costBreakdown = calculateCost(
        usage.inputTokens,
        usage.outputTokens,
        usage.cachedTokens,
        usage.model,
        usage.provider
      );

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

      setUsageLogs((prev) => [...prev, usageLog]);
      setTotalSessionCost((prev) => prev + costBreakdown.totalCost);

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

        if (!error && data) {
          setUsageLogs((prev) =>
            prev.map((log) =>
              log.id === usageLog.id ? { ...log, id: data.id } : log
            )
          );
        }
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
      setLocalQuotaExceeded(true);
      refreshSubscription();
      const friendlyMessage: Message = {
        id: `quota-${Date.now()}`,
        role: "assistant",
        content: data.plan === "free"
          ? "You've used all your free messages this month. Upgrade to Pro or configure your own API key to continue."
          : "You've used all your messages this month. Purchase more or configure your own API key.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, friendlyMessage]);
    },
  }), [projectId, project?.name, project?.icon, handleNameChange, handleIconChange, refreshSubscription]);

  const {
    isStreaming,
    completedScreens,
    currentStreamingHtml,
    currentScreenName,
    isEditingExistingScreen,
    startStreaming,
  } = useDesignStreaming(streamingCallbacks());

  const displayScreens = (() => {
    if (!isStreaming && completedScreens.length === 0) {
      return savedScreens;
    }
    const merged = [...savedScreens];
    for (const completed of completedScreens) {
      const existingIndex = merged.findIndex(s => s.name === completed.name);
      if (existingIndex >= 0) {
        merged[existingIndex] = completed;
      } else {
        merged.push(completed);
      }
    }
    return merged;
  })();

  // Fetch prototype project data
  useEffect(() => {
    if (!isLoaded || !user) return;

    const userId = user.id;

    async function fetchPrototype() {
      const supabase = createClient();

      const { data: projectData, error: projectError } = await supabase
        .from("prototype_projects")
        .select("*")
        .eq("id", projectId)
        .eq("user_id", userId)
        .single();

      if (projectError || !projectData) {
        console.error("Error fetching prototype:", projectError);
        router.push("/home");
        return;
      }

      setProject(projectData);

      if (projectData.model) {
        setSelectedModelState(projectData.model as ModelId);
      }

      // Fetch existing screens
      const { data: screens } = await supabase
        .from("prototype_screens")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order");

      if (screens && screens.length > 0) {
        setSavedScreens(
          screens.map((s) => ({
            name: s.screen_name,
            html: s.html_content,
            gridCol: s.grid_col,
            gridRow: s.grid_row,
            isRoot: s.is_root,
          }))
        );
      }

      // Fetch message history
      const { data: messageHistory } = await supabase
        .from("prototype_messages")
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

      // Fetch usage logs
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
        if (projectData.initial_image_url) {
          setPendingImageUrl(projectData.initial_image_url);
        }
      }

      setIsPageLoading(false);
    }

    fetchPrototype();
  }, [isLoaded, user, projectId, router]);

  // Handle submit - uses prototype API endpoint
  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isStreaming || !canSendMessage) return;

    setJustCompleted(false);

    const currentImageUrl = pendingImageUrl;
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      imageUrl: currentImageUrl,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    const supabase = createClient();
    await supabase.from("prototype_messages").insert({
      project_id: projectId,
      role: "user",
      content: userMessage.content,
      image_url: currentImageUrl,
    });

    userMessageRef.current = null;

    const promptText = input.trim();
    setInput("");
    setPendingImageUrl(null);

    const apiConfig = user?.id ? getApiConfig(user.id) : null;
    const headers: Record<string, string> = {};
    if (apiConfig?.key) {
      headers["x-api-key"] = apiConfig.key;
      headers["x-provider"] = apiConfig.provider;
    }

    trackEvent("design_generated", {
      project_id: projectId,
      model: selectedModel,
      is_byok: !!apiConfig?.key,
      type: "prototype",
    });

    // Use prototype API endpoint
    await startStreaming(
      "/api/ai/generate-prototype",
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
  }, [input, isStreaming, canSendMessage, startStreaming, projectId, savedScreens, messages, project?.platform, pendingImageUrl, selectedModel, user?.id]);

  submitRef.current = handleSubmit;

  // Auto-generate on load
  useEffect(() => {
    if (
      !isPageLoading &&
      !hasAutoGenerated &&
      dbUser &&
      canSendMessage &&
      project?.app_idea &&
      messages.length === 0 &&
      input.trim() &&
      !isStreaming
    ) {
      setHasAutoGenerated(true);
      setTimeout(() => {
        submitRef.current?.();
      }, 100);
    }
  }, [isPageLoading, hasAutoGenerated, dbUser, canSendMessage, project?.app_idea, messages.length, input, isStreaming]);

  // Loading state
  if (!isLoaded || isPageLoading || !isBYOKInitialized) {
    return <ProjectSkeleton />;
  }

  // Non-admin redirect (already handled in useEffect, but add fallback)
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex flex-col h-dvh">
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

        {/* Prototype badge + Play button + Preview/Code Toggle + Export */}
        {!isMobile && (
          <div className="flex items-center gap-3 ml-auto flex-shrink-0">
            {/* Prototype badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium">
              <Play className="w-3.5 h-3.5" />
              Prototype
            </div>
            <div className="flex bg-[#F5F2EF] rounded-lg p-1 border border-[#E8E4E0]">
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
            <ExportMenu
              screens={displayScreens}
              projectName={project?.name || "Untitled"}
              projectId={projectId}
              platform={project?.platform || "mobile"}
            />
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
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop: Split View */}
        {!isMobile && (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
              <div className="h-full flex flex-col bg-white">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 && !canSendMessage && !isQuotaExceeded && <ApiKeyWarning />}

                  {messages.length === 0 && canSendMessage && (
                    <div className="text-center py-8">
                      <Sparkles className="w-8 h-8 mx-auto mb-3 text-[#D4CFC9]" />
                      <p className="text-sm text-[#9A9A9A]">
                        Describe your app and I&apos;ll generate an interactive prototype
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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <div className="bg-white border border-[#E8E4E0] rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-[#6B6B6B]">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {currentScreenName ? `Generating ${currentScreenName}...` : "Generating prototype..."}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {justCompleted && !isStreaming && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-green-700">
                          <CheckCircle2 className="w-4 h-4" />
                          Prototype ready! {displayScreens.length} screen{displayScreens.length !== 1 ? "s" : ""}.
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {isAdmin && (
                  <div className="px-3 py-2">
                    <CostIndicator
                      usageLogs={usageLogs}
                      totalCost={totalSessionCost}
                      isVisible={usageLogs.length > 0}
                    />
                  </div>
                )}

                {isQuotaExceeded ? (
                  <div className="p-3">
                    <QuotaExceededBanner compact />
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
                    userPlan={userPlan}
                    isBYOKActive={isBYOKActive}
                  />
                )}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={70}>
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
            </ResizablePanel>
          </ResizablePanelGroup>
        )}

        {/* Mobile views */}
        {isMobile && mobileActiveTab === "chat" && (
          <div className="flex-1 flex flex-col bg-white">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && !canSendMessage && !isQuotaExceeded && <ApiKeyWarning />}

              {messages.length === 0 && canSendMessage && (
                <div className="text-center py-8">
                  <Sparkles className="w-8 h-8 mx-auto mb-3 text-[#D4CFC9]" />
                  <p className="text-sm text-[#9A9A9A]">
                    Describe your app and I&apos;ll generate an interactive prototype
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
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="bg-white border border-[#E8E4E0] rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-[#6B6B6B]">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {currentScreenName ? `Generating ${currentScreenName}...` : "Generating prototype..."}
                    </div>
                  </div>
                </motion.div>
              )}

              {justCompleted && !isStreaming && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <CheckCircle2 className="w-4 h-4" />
                      Prototype ready! {displayScreens.length} screen{displayScreens.length !== 1 ? "s" : ""}.
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {isAdmin && (
              <div className="px-3 py-2 border-t border-[#E8E4E0]">
                <CostIndicator
                  usageLogs={usageLogs}
                  totalCost={totalSessionCost}
                  isVisible={usageLogs.length > 0}
                />
              </div>
            )}

            {isQuotaExceeded ? (
              <div className="p-3">
                <QuotaExceededBanner compact />
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
                userPlan={userPlan}
                isBYOKActive={isBYOKActive}
              />
            )}
          </div>
        )}

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

        {isMobile && mobileActiveTab === "code" && (
          <CodeView
            screens={displayScreens}
            projectName={project?.name || "Untitled"}
            isMobileView={true}
          />
        )}
      </div>

      <ImageLightbox
        src={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
}
