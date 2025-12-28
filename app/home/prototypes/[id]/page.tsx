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
  Bug,
  X,
  Share2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { PrototypeProject, PrototypeScreen, UsageLog } from "@/lib/supabase/types";
import { EditableProjectHeader } from "../../components/EditableProjectHeader";
import { useDesignStreaming, type ParsedScreen, type UsageData, type QuotaExceededData, type GridPosition } from "../../components/StreamingScreenPreview";
import { PrototypeCanvas } from "../../components/prototype/PrototypeCanvas";
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
import { PrototypePlayer } from "../../components/prototype/PrototypePlayer";

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
  isAdmin,
  lastRawOutput,
  onDebugClick,
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
  isAdmin?: boolean;
  lastRawOutput?: string | null;
  onDebugClick?: () => void;
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
              isAdmin={isAdmin}
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
            {isAdmin && (
              <>
                <div className="w-px h-5 bg-[#E8E4E0] mx-1" />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={onDebugClick}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
                          lastRawOutput
                            ? "bg-orange-50 text-orange-600 hover:bg-orange-100"
                            : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                        }`}
                      >
                        <Bug className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View raw LLM output</p>
                      <p className="text-[10px] opacity-70">{lastRawOutput ? "Debug mode" : "No output yet"}</p>
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
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [playerHtml, setPlayerHtml] = useState<string | null>(null);
  const [isLoadingPlayer, setIsLoadingPlayer] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userMessageRef = useRef<Message | null>(null);

  // Debug state (admin only)
  const [lastRawOutput, setLastRawOutput] = useState<string | null>(null);
  const [isDebugModalOpen, setIsDebugModalOpen] = useState(false);
  const [debugCopied, setDebugCopied] = useState(false);
  const [isLoadingDebug, setIsLoadingDebug] = useState(false);

  // Grid state for position management
  const gridMapRef = useRef<Map<string, GridPosition>>(new Map());

  // Fetch debug output from Supabase when modal opens and no in-memory output
  const fetchDebugOutput = useCallback(async () => {
    if (lastRawOutput || !projectId) return;

    setIsLoadingDebug(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("prototype_debug_logs")
        .select("raw_output")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data?.raw_output && !error) {
        setLastRawOutput(data.raw_output);
      }
    } catch (err) {
      console.error("Failed to fetch debug output:", err);
    } finally {
      setIsLoadingDebug(false);
    }
  }, [lastRawOutput, projectId]);

  // Fetch debug output when modal opens
  useEffect(() => {
    if (isDebugModalOpen && !lastRawOutput && isAdmin) {
      fetchDebugOutput();
    }
  }, [isDebugModalOpen, lastRawOutput, isAdmin, fetchDebugOutput]);

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

  const handlePlay = useCallback(async () => {
    if (savedScreens.length === 0) return;

    setIsLoadingPlayer(true);
    try {
      const response = await fetch("/api/prototype/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        throw new Error("Failed to build prototype");
      }

      const { html } = await response.json();
      setPlayerHtml(html);
      setIsPlayerOpen(true);
    } catch (error) {
      console.error("Error building prototype:", error);
    } finally {
      setIsLoadingPlayer(false);
    }
  }, [projectId, savedScreens.length]);

  // Share prototype - copy public URL to clipboard
  const handleShare = useCallback(async () => {
    const shareUrl = `${window.location.origin}/p/${projectId}`;
    await navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  }, [projectId]);

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
    onGrid: (gridMap: Map<string, GridPosition>) => {
      // Store the grid map for use when saving screens
      gridMapRef.current = gridMap;
      console.log("[Prototype] GRID received:", Array.from(gridMap.entries()));
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
        const { error } = await supabase.from("prototype_screens").upsert(
          {
            project_id: projectId,
            screen_name: screen.name,
            html_content: screen.html,
            sort_order: i,
            grid_col: screen.gridCol ?? 0,
            grid_row: screen.gridRow ?? i,
            is_root: screen.isRoot ?? (i === 0),
          },
          { onConflict: "project_id,screen_name", ignoreDuplicates: false }
        );
        if (error) {
          console.error(`[Prototype] Failed to save screen "${screen.name}":`, error);
        }
      }
    },
    onRawOutput: async (rawOutput: string) => {
      // Store in state for debug UI
      setLastRawOutput(rawOutput);

      const supabase = createClient();

      // =====================================================================
      // Parse GRID section first - this is the source of truth for positions
      // =====================================================================
      const gridMap = new Map<string, { col: number; row: number; isRoot: boolean }>();
      const gridSectionMatch = rawOutput.match(/<!-- GRID:\s*([\s\S]*?)\s*-->/);

      if (gridSectionMatch) {
        const gridContent = gridSectionMatch[1];
        const lineRegex = /^\s*(.+?):\s*\[(-?\d+),(-?\d+),([01])\]\s*$/gm;
        let gridMatch;

        while ((gridMatch = lineRegex.exec(gridContent)) !== null) {
          const screenName = gridMatch[1].trim();
          const col = parseInt(gridMatch[2], 10);
          const row = parseInt(gridMatch[3], 10);
          const isRoot = gridMatch[4] === "1";
          gridMap.set(screenName, { col, row, isRoot });
        }
        console.log(`[Prototype] GRID section parsed: ${gridMap.size} screens`, Array.from(gridMap.entries()));
      } else {
        console.log("[Prototype] No GRID section found, using legacy inline positions");
      }

      // Store in ref for other callbacks to use
      gridMapRef.current = new Map(
        Array.from(gridMap.entries()).map(([name, pos]) => [name, { col: pos.col, row: pos.row, isRoot: pos.isRoot }])
      );

      // =====================================================================
      // Parse ALL screens from raw output (SCREEN_START and SCREEN_EDIT)
      // =====================================================================
      const screenRegex = /<!-- SCREEN_(?:START|EDIT):\s*([^\n>]+?)(?:\s*-->|(?=\s*\n)|(?=<))([\s\S]*?)<!-- SCREEN_END -->/g;

      let match;
      const parsedScreens: { name: string; html: string; gridCol: number; gridRow: number; isRoot: boolean }[] = [];

      while ((match = screenRegex.exec(rawOutput)) !== null) {
        const rawName = match[1].trim();
        const html = match[2].trim();

        // Parse name (clean up any legacy inline markers)
        let name = rawName;
        let gridCol = 0;
        let gridRow = parsedScreens.length;
        let isRoot = false;

        // Remove legacy [ROOT] marker from name if present
        if (name.includes("[ROOT]")) {
          name = name.replace("[ROOT]", "").trim();
        }

        // Remove legacy [col,row] from name if present
        const legacyGridMatch = name.match(/\[(-?\d+),(-?\d+)\]/);
        if (legacyGridMatch) {
          name = name.replace(legacyGridMatch[0], "").trim();
        }

        // Clean up any remaining --> from name
        name = name.replace(/-->$/, "").trim();

        // Get position from GRID section (preferred) or fallback to legacy inline
        const gridPosition = gridMap.get(name);
        if (gridPosition) {
          gridCol = gridPosition.col;
          gridRow = gridPosition.row;
          isRoot = gridPosition.isRoot;
        } else if (legacyGridMatch) {
          // Fall back to legacy inline position
          gridCol = parseInt(legacyGridMatch[1], 10);
          gridRow = parseInt(legacyGridMatch[2], 10);
          isRoot = rawName.includes("[ROOT]");
        }

        if (name && html) {
          parsedScreens.push({ name, html, gridCol, gridRow, isRoot });
        }
      }

      console.log(`[Prototype] Raw output parsed: ${parsedScreens.length} screens found:`, parsedScreens.map(s => `${s.name} [${s.gridCol},${s.gridRow}]${s.isRoot ? " ROOT" : ""}`));

      // =====================================================================
      // Delete screens not in GRID (if GRID section exists)
      // =====================================================================
      if (gridMap.size > 0) {
        // Get screen names that are in GRID
        const screensInGrid = new Set(gridMap.keys());

        // Find screens to delete (exist in DB but not in GRID)
        const { data: existingScreens } = await supabase
          .from("prototype_screens")
          .select("screen_name")
          .eq("project_id", projectId);

        if (existingScreens) {
          const screensToDelete = existingScreens
            .map(s => s.screen_name)
            .filter(name => !screensInGrid.has(name));

          if (screensToDelete.length > 0) {
            console.log(`[Prototype] Deleting screens not in GRID:`, screensToDelete);

            const { error: deleteError } = await supabase
              .from("prototype_screens")
              .delete()
              .eq("project_id", projectId)
              .in("screen_name", screensToDelete);

            if (deleteError) {
              console.error("[Prototype] Failed to delete screens:", deleteError);
            } else {
              console.log(`[Prototype] Deleted ${screensToDelete.length} screen(s)`);

              // Update local state to remove deleted screens
              setSavedScreens((prevScreens) =>
                prevScreens.filter(s => !screensToDelete.includes(s.name))
              );
            }
          }
        }
      }

      // =====================================================================
      // Save ALL screens to database (upsert)
      // =====================================================================
      for (let i = 0; i < parsedScreens.length; i++) {
        const screen = parsedScreens[i];
        const { error: saveError } = await supabase.from("prototype_screens").upsert(
          {
            project_id: projectId,
            screen_name: screen.name,
            html_content: screen.html,
            sort_order: i,
            grid_col: screen.gridCol,
            grid_row: screen.gridRow,
            is_root: screen.isRoot,
          },
          { onConflict: "project_id,screen_name", ignoreDuplicates: false }
        );
        if (saveError) {
          console.error(`[Prototype] Failed to save screen "${screen.name}":`, saveError);
        } else {
          console.log(`[Prototype] Saved screen "${screen.name}" at [${screen.gridCol},${screen.gridRow}]${screen.isRoot ? " ROOT" : ""}`);
        }
      }

      // Update local state by MERGING parsed screens
      setSavedScreens((prevScreens) => {
        const mergedScreens = [...prevScreens];
        for (const newScreen of parsedScreens) {
          const existingIndex = mergedScreens.findIndex(s => s.name === newScreen.name);
          if (existingIndex >= 0) {
            // Update existing screen
            mergedScreens[existingIndex] = {
              name: newScreen.name,
              html: newScreen.html,
              gridCol: newScreen.gridCol,
              gridRow: newScreen.gridRow,
              isRoot: newScreen.isRoot,
            };
          } else {
            // Add new screen
            mergedScreens.push({
              name: newScreen.name,
              html: newScreen.html,
              gridCol: newScreen.gridCol,
              gridRow: newScreen.gridRow,
              isRoot: newScreen.isRoot,
            });
          }
        }
        return mergedScreens;
      });

      // Save debug log
      const { error } = await supabase.from("prototype_debug_logs").insert({
        project_id: projectId,
        raw_output: rawOutput,
        parsed_screens_count: parsedScreens.length,
        expected_screens: Array.from(gridMap.keys()),
        actual_screens: parsedScreens.map(s => s.name),
      });

      if (error) {
        console.error("[Prototype] Failed to save debug log:", error);
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
    currentStreamingGridCol,
    currentStreamingGridRow,
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

    trackEvent("prototype_generated", {
      project_id: projectId,
      model: selectedModel,
      is_byok: !!apiConfig?.key,
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

        {/* Mobile action buttons */}
        {isMobile && (
          <div className="flex items-center gap-1.5 ml-auto">
            {/* Play button */}
            <button
              onClick={handlePlay}
              disabled={savedScreens.length === 0 || isLoadingPlayer}
              className="h-8 w-8 flex items-center justify-center bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingPlayer ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
            </button>

            {/* Share button */}
            <button
              onClick={handleShare}
              disabled={savedScreens.length === 0}
              className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                shareCopied
                  ? "bg-green-50 border-green-200 text-green-600"
                  : "bg-white hover:bg-[#F5F2EF] border-[#E8E4E0] text-[#6B6B6B] hover:text-[#1A1A1A]"
              }`}
            >
              {shareCopied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>
          </div>
        )}

        {/* Preview/Code Toggle + Actions */}
        {!isMobile && (
          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            {/* Preview/Code toggle */}
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

            <div className="w-px h-7 bg-[#E8E4E0]" />

            {/* Action buttons - same height */}
            <div className="flex items-center gap-1.5">
              {/* Play button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handlePlay}
                      disabled={savedScreens.length === 0 || isLoadingPlayer}
                      className="h-8 w-8 flex items-center justify-center bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoadingPlayer ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 fill-current" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Play prototype</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Share button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleShare}
                      disabled={savedScreens.length === 0}
                      className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        shareCopied
                          ? "bg-green-50 border-green-200 text-green-600"
                          : "bg-white hover:bg-[#F5F2EF] border-[#E8E4E0] text-[#6B6B6B] hover:text-[#1A1A1A]"
                      }`}
                    >
                      {shareCopied ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Share2 className="w-4 h-4" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{shareCopied ? "Link copied!" : "Copy share link"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Export button */}
              <ExportMenu
                screens={displayScreens}
                projectName={project?.name || "Untitled"}
                projectId={projectId}
                platform={project?.platform || "mobile"}
                iconOnly
              />
            </div>
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
                    isAdmin={isAdmin}
                    lastRawOutput={lastRawOutput}
                    onDebugClick={() => setIsDebugModalOpen(true)}
                  />
                )}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={70}>
              {viewMode === "preview" ? (
                <PrototypeCanvas
                  completedScreens={displayScreens}
                  currentStreamingHtml={currentStreamingHtml}
                  currentScreenName={currentScreenName}
                  isStreaming={isStreaming}
                  editingScreenNames={editingScreenNames}
                  isEditingExistingScreen={isEditingExistingScreen}
                  platform={project?.platform || "mobile"}
                  prototypeId={projectId}
                  isAdmin={isAdmin}
                  currentStreamingGridCol={currentStreamingGridCol}
                  currentStreamingGridRow={currentStreamingGridRow}
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
                isAdmin={isAdmin}
                lastRawOutput={lastRawOutput}
                onDebugClick={() => setIsDebugModalOpen(true)}
              />
            )}
          </div>
        )}

        {isMobile && mobileActiveTab === "canvas" && (
          <PrototypeCanvas
            completedScreens={displayScreens}
            currentStreamingHtml={currentStreamingHtml}
            currentScreenName={currentScreenName}
            isStreaming={isStreaming}
            editingScreenNames={editingScreenNames}
            isEditingExistingScreen={isEditingExistingScreen}
            platform={project?.platform || "mobile"}
            isMobileView={true}
            prototypeId={projectId}
            isAdmin={isAdmin}
            currentStreamingGridCol={currentStreamingGridCol}
            currentStreamingGridRow={currentStreamingGridRow}
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

      {/* Prototype Player Modal */}
      {playerHtml && (
        <PrototypePlayer
          isOpen={isPlayerOpen}
          onClose={() => setIsPlayerOpen(false)}
          prototypeHtml={playerHtml}
          platform={project?.platform || "mobile"}
          projectName={project?.name || "Untitled"}
          prototypeUrl={project?.prototype_url}
        />
      )}

      {/* Debug Modal (Admin Only) */}
      {isDebugModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-[90vw] max-w-4xl max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Bug className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-semibold text-gray-900">Raw LLM Output</h2>
                {lastRawOutput && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {lastRawOutput.length.toLocaleString()} chars
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {lastRawOutput && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(lastRawOutput);
                      setDebugCopied(true);
                      setTimeout(() => setDebugCopied(false), 2000);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    {debugCopied ? (
                      <>
                        <Check className="w-4 h-4 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy All
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => setIsDebugModalOpen(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {isLoadingDebug ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Loader2 className="w-8 h-8 mb-4 animate-spin text-orange-500" />
                  <p className="text-sm">Loading debug output...</p>
                </div>
              ) : lastRawOutput ? (
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded-xl border border-gray-200 leading-relaxed">
                  {lastRawOutput}
                </pre>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Bug className="w-12 h-12 mb-4 opacity-30" />
                  <p className="text-lg font-medium">No debug output found</p>
                  <p className="text-sm mt-1">No LLM output has been captured for this prototype</p>
                </div>
              )}
            </div>

            {/* Footer with stats */}
            {lastRawOutput && (
              <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>GRID: {lastRawOutput.includes("<!-- GRID:") ? "✓" : "✗"}</span>
                  <span>SCREEN_START: {(lastRawOutput.match(/SCREEN_START/g) || []).length}</span>
                  <span>SCREEN_EDIT: {(lastRawOutput.match(/SCREEN_EDIT/g) || []).length}</span>
                  <span>SCREEN_END: {(lastRawOutput.match(/SCREEN_END/g) || []).length}</span>
                  <span>MESSAGE: {(lastRawOutput.match(/<!-- MESSAGE:/g) || []).length}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
