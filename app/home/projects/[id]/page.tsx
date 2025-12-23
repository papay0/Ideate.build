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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/lib/supabase/types";
import { EditableProjectHeader } from "../../components/EditableProjectHeader";
import { useDesignStreaming, type ParsedScreen } from "../../components/StreamingScreenPreview";
import { DesignCanvas } from "../../components/DesignCanvas";

// ============================================================================
// Types
// ============================================================================

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

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
}: {
  message: Message;
  userImageUrl?: string;
}) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      {isUser && userImageUrl ? (
        <img
          src={userImageUrl}
          alt="You"
          className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
        />
      ) : (
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isUser ? "bg-[#B8956F]" : "bg-[#1A1A1A]"
          }`}
        >
          {isUser ? (
            <User className="w-4 h-4 text-white" />
          ) : (
            <Sparkles className="w-4 h-4 text-white" />
          )}
        </div>
      )}

      {/* Message Content */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-[#B8956F]/10 border border-[#B8956F]/20"
            : "bg-white border border-[#E8E4E0]"
        }`}
      >
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
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  disabled: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <div className="border-t border-[#E8E4E0] p-4 bg-white">
      <div className="flex gap-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled
              ? "Configure your API key in Settings first..."
              : "Describe your app design..."
          }
          disabled={disabled}
          rows={1}
          className="flex-1 bg-[#F5F2EF] border border-[#E8E4E0] rounded-xl px-4 py-3 text-[#1A1A1A] placeholder-[#9A9A9A] focus:outline-none focus:border-[#B8956F] focus:ring-2 focus:ring-[#B8956F]/10 transition-colors resize-none max-h-32 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          onClick={onSubmit}
          disabled={disabled || isLoading || !value.trim()}
          className="w-12 h-12 bg-[#B8956F] rounded-xl flex items-center justify-center hover:bg-[#A6845F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Send className="w-5 h-5 text-white" />
          )}
        </button>
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

export default function DesignPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const projectId = params.id as string;

  // State
  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [savedScreens, setSavedScreens] = useState<ParsedScreen[]>([]);
  const [input, setInput] = useState("");
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [hasAutoGenerated, setHasAutoGenerated] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [editingScreenNames, setEditingScreenNames] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userMessageRef = useRef<Message | null>(null);
  const pendingProjectNameRef = useRef<string | null>(null);
  const pendingProjectIconRef = useRef<string | null>(null);

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
      // Store in ref for later - we'll update after streaming completes
      pendingProjectNameRef.current = name;
    },
    onProjectIcon: (icon: string) => {
      // Store in ref for later - we'll update after streaming completes
      pendingProjectIconRef.current = icon;
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

      // Show completion indicator
      setJustCompleted(true);
      setTimeout(() => setJustCompleted(false), 3000);

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

      // Update project name and icon if suggested
      const suggestedName = pendingProjectNameRef.current;
      const suggestedIcon = pendingProjectIconRef.current;

      if (suggestedName && project?.name === "Untitled Project") {
        await handleNameChange(suggestedName);
        pendingProjectNameRef.current = null;
      }

      // Update icon if suggested and current is default
      if (suggestedIcon && project?.icon === "📱") {
        const supabaseForIcon = createClient();
        await supabaseForIcon
          .from("projects")
          .update({ icon: suggestedIcon, updated_at: new Date().toISOString() })
          .eq("id", projectId);
        setProject((prev) => (prev ? { ...prev, icon: suggestedIcon } : null));
        pendingProjectIconRef.current = null;
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
  }), [projectId, project?.name, project?.icon, handleNameChange]);

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
      }

      setIsPageLoading(false);
    }

    fetchProject();
  }, [isLoaded, user, projectId, router]);

  // Handle submit - uses streaming hook
  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isStreaming || !hasApiKey) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
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
    });

    // Clear the ref since we saved immediately
    userMessageRef.current = null;

    const promptText = input.trim();
    setInput("");

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

    // Start streaming
    await startStreaming(
      "/api/ai/generate-design",
      {
        prompt: promptText,
        projectId,
        existingScreens: savedScreens,
        conversationHistory: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      },
      {
        "x-api-key": apiConfig.key,
        "x-provider": apiConfig.provider,
      }
    );
  }, [input, isStreaming, hasApiKey, startStreaming, projectId, savedScreens, messages]);

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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#B8956F] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-[#E8E4E0] bg-white">
        <button
          onClick={() => router.push("/home")}
          className="p-2 text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#F5F2EF] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        {project && (
          <EditableProjectHeader
            name={project.name}
            icon={project.icon}
            description={project.app_idea}
            onNameChange={handleNameChange}
            onIconChange={handleIconChange}
          />
        )}
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Chat */}
        <div className="w-1/3 min-w-[320px] max-w-[480px] flex flex-col border-r border-[#E8E4E0] bg-white">
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
              />
            ))}

            {isStreaming && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
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
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
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
          />
        </div>

        {/* Right Panel - Canvas */}
        <DesignCanvas
          completedScreens={displayScreens}
          currentStreamingHtml={currentStreamingHtml}
          currentScreenName={currentScreenName}
          isStreaming={isStreaming}
          editingScreenNames={editingScreenNames}
          isEditingExistingScreen={isEditingExistingScreen}
        />
      </div>
    </div>
  );
}
