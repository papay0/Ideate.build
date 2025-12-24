"use client";

/**
 * StreamingScreenPreview Component
 *
 * Handles real-time streaming of AI-generated HTML designs.
 * Parses screen delimiters and writes HTML to iframe incrementally.
 *
 * Supported delimiters:
 * - <!-- MESSAGE: ... --> - Chat messages from the LLM
 * - <!-- PROJECT_NAME: ... --> - Suggested project name
 * - <!-- PROJECT_ICON: ... --> - Suggested project emoji icon
 * - <!-- SCREEN_START: Name --> - Start of a screen
 * - <!-- SCREEN_END --> - End of a screen
 */

import { useRef, useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";

const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;

export interface ParsedScreen {
  name: string;
  html: string;
  isEdit?: boolean;
}

export interface UsageData {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  totalTokens: number;
  model: string;
  provider: 'openrouter' | 'gemini';
}

export interface StreamingCallbacks {
  onMessage?: (message: string) => void;
  onProjectName?: (name: string) => void;
  onProjectIcon?: (icon: string) => void;
  onScreenStart?: (screenName: string) => void;
  onScreenEditStart?: (screenName: string) => void;
  onScreenComplete?: (screen: ParsedScreen) => void;
  onStreamComplete?: (screens: ParsedScreen[]) => void;
  onUsage?: (usage: UsageData) => void;
  onError?: (error: string) => void;
}

interface StreamingScreenPreviewProps {
  isStreaming: boolean;
  callbacks: StreamingCallbacks;
}

export function StreamingScreenPreview({
  isStreaming,
  callbacks,
}: StreamingScreenPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [currentScreenName, setCurrentScreenName] = useState<string | null>(null);
  const [contentHeight, setContentHeight] = useState(PHONE_HEIGHT);

  // Initialize iframe with base HTML
  const initializeIframe = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return null;

    const doc = iframe.contentDocument;
    if (!doc) return null;

    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${PHONE_WIDTH}, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #ffffff;
      min-height: 100vh;
      width: ${PHONE_WIDTH}px;
    }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>`);

    return doc;
  }, []);

  // Measure content height after render
  const measureHeight = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument?.body) return;

    setTimeout(() => {
      const height = iframe.contentDocument?.body?.scrollHeight || PHONE_HEIGHT;
      setContentHeight(Math.max(height, PHONE_HEIGHT));
    }, 100);
  }, []);

  // Reset when not streaming
  useEffect(() => {
    if (!isStreaming) {
      setCurrentScreenName(null);
    }
  }, [isStreaming]);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Phone Frame */}
      <div
        className="relative bg-[#1A1A1A] rounded-[3rem] p-3 shadow-2xl"
        style={{ transformOrigin: "top center" }}
      >
        {/* Streaming indicator */}
        {isStreaming && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 bg-[#B8956F] text-white text-xs px-3 py-1 rounded-full flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            {currentScreenName ? `Generating ${currentScreenName}...` : "Starting..."}
          </div>
        )}

        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-[#1A1A1A] rounded-b-2xl z-10" />

        {/* Screen */}
        <div
          className="bg-white rounded-[2.5rem] overflow-hidden"
          style={{ width: PHONE_WIDTH, height: contentHeight }}
        >
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0"
            title={currentScreenName || "Design Preview"}
            sandbox="allow-scripts allow-same-origin"
            style={{ pointerEvents: "none" }}
          />
        </div>

        {/* Home Indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-zinc-700 rounded-full" />

        {/* Pulsing ring while streaming */}
        {isStreaming && (
          <div className="absolute inset-0 rounded-[3rem] ring-4 ring-[#B8956F]/50 animate-pulse" />
        )}
      </div>

      {/* Screen Label */}
      {currentScreenName && (
        <span className="text-sm text-[#6B6B6B]">{currentScreenName}</span>
      )}
    </div>
  );
}

/**
 * Hook to manage streaming state and parse SSE responses
 */
export function useDesignStreaming(callbacks: StreamingCallbacks) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [completedScreens, setCompletedScreens] = useState<ParsedScreen[]>([]);
  const [currentStreamingHtml, setCurrentStreamingHtml] = useState("");
  const [currentScreenName, setCurrentScreenName] = useState<string | null>(null);
  const [isEditingExistingScreen, setIsEditingExistingScreen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startStreaming = useCallback(
    async (
      apiUrl: string,
      body: object,
      headers: Record<string, string>
    ) => {
      // Abort any existing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setIsStreaming(true);
      setCompletedScreens([]);
      setCurrentStreamingHtml("");
      setCurrentScreenName(null);
      setIsEditingExistingScreen(false);

      let buffer = "";
      let rawContent = "";
      let inScreen = false;
      let screenName = "";
      let screenHtml = "";
      let isEditingScreen = false;
      const screens: ParsedScreen[] = [];

      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: JSON.stringify(body),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE format
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.error) {
                  throw new Error(data.error);
                }

                if (data.chunk) {
                  rawContent += data.chunk;
                  console.log(`[Stream] Chunk received, buffer length: ${rawContent.length}`);

                  // Parse MESSAGE delimiter
                  const messageMatch = rawContent.match(/<!-- MESSAGE: ([\s\S]*?) -->/g);
                  if (messageMatch) {
                    for (const match of messageMatch) {
                      const msg = match.replace(/<!-- MESSAGE: /, "").replace(/ -->/, "");
                      console.log(`[Stream] MESSAGE found: "${msg.substring(0, 50)}..."`);
                      callbacks.onMessage?.(msg);
                      rawContent = rawContent.replace(match, "");
                    }
                  }

                  // Parse PROJECT_NAME delimiter
                  const nameMatch = rawContent.match(/<!-- PROJECT_NAME: (.+?) -->/);
                  if (nameMatch) {
                    console.log(`[Stream] PROJECT_NAME found: "${nameMatch[1].trim()}"`);
                    callbacks.onProjectName?.(nameMatch[1].trim());
                    rawContent = rawContent.replace(nameMatch[0], "");
                  }

                  // Parse PROJECT_ICON delimiter
                  const iconMatch = rawContent.match(/<!-- PROJECT_ICON: (.+?) -->/);
                  if (iconMatch) {
                    console.log(`[Stream] PROJECT_ICON found: "${iconMatch[1].trim()}"`);
                    callbacks.onProjectIcon?.(iconMatch[1].trim());
                    rawContent = rawContent.replace(iconMatch[0], "");
                  }

                  // Parse SCREEN_START delimiter (new screen)
                  const startMatch = rawContent.match(/<!-- SCREEN_START: (.+?) -->/);
                  if (startMatch && !inScreen) {
                    inScreen = true;
                    isEditingScreen = false;
                    screenName = startMatch[1].trim();
                    screenHtml = "";
                    console.log(`[Stream] SCREEN_START (new): "${screenName}"`);
                    setCurrentScreenName(screenName);
                    setIsEditingExistingScreen(false);
                    callbacks.onScreenStart?.(screenName);
                    rawContent = rawContent.replace(startMatch[0], "");
                  }

                  // Parse SCREEN_EDIT delimiter (editing existing screen)
                  const editMatch = rawContent.match(/<!-- SCREEN_EDIT: (.+?) -->/);
                  if (editMatch && !inScreen) {
                    inScreen = true;
                    isEditingScreen = true;
                    screenName = editMatch[1].trim();
                    screenHtml = "";
                    console.log(`[Stream] SCREEN_EDIT (updating): "${screenName}"`);
                    setCurrentScreenName(screenName);
                    setIsEditingExistingScreen(true);
                    callbacks.onScreenEditStart?.(screenName);
                    rawContent = rawContent.replace(editMatch[0], "");
                  }

                  // If we're in a screen, accumulate HTML
                  if (inScreen) {
                    // Check for SCREEN_END
                    const endIndex = rawContent.indexOf("<!-- SCREEN_END -->");
                    if (endIndex !== -1) {
                      screenHtml += rawContent.substring(0, endIndex);
                      rawContent = rawContent.substring(endIndex + "<!-- SCREEN_END -->".length);

                      // Complete the screen
                      const completedScreen: ParsedScreen = {
                        name: screenName,
                        html: screenHtml.trim(),
                        isEdit: isEditingScreen,
                      };
                      console.log(`[Stream] SCREEN_END: "${screenName}", isEdit: ${isEditingScreen}, HTML length: ${completedScreen.html.length}`);
                      screens.push(completedScreen);
                      console.log(`[Stream] Total completed screens: ${screens.length}`, screens.map(s => `${s.name}${s.isEdit ? ' (edit)' : ''}`));
                      setCompletedScreens([...screens]);
                      callbacks.onScreenComplete?.(completedScreen);

                      inScreen = false;
                      screenName = "";
                      screenHtml = "";
                      isEditingScreen = false;
                      setCurrentScreenName(null);
                      setCurrentStreamingHtml("");
                      setIsEditingExistingScreen(false);
                    } else {
                      // Still streaming this screen
                      screenHtml += rawContent;
                      setCurrentStreamingHtml(screenHtml);
                      rawContent = "";
                    }
                  }
                }

                // Handle usage data
                if (data.usage) {
                  console.log(`[Stream] USAGE received:`, data.usage);
                  const usageData: UsageData = {
                    inputTokens: data.usage.inputTokens || 0,
                    outputTokens: data.usage.outputTokens || 0,
                    cachedTokens: data.usage.cachedTokens || 0,
                    totalTokens: data.usage.totalTokens || 0,
                    model: data.usage.model || 'gemini-3-pro-preview',
                    provider: data.usage.provider || 'openrouter',
                  };
                  callbacks.onUsage?.(usageData);
                }

                if (data.done) {
                  // If we're still in a screen when done, capture it (stream might have ended abruptly)
                  if (inScreen && screenName && screenHtml.trim()) {
                    console.log(`[Stream] DONE but still in screen "${screenName}" - capturing partial screen`);
                    const partialScreen: ParsedScreen = {
                      name: screenName,
                      html: screenHtml.trim(),
                      isEdit: isEditingScreen,
                    };
                    screens.push(partialScreen);
                    setCompletedScreens([...screens]);
                    callbacks.onScreenComplete?.(partialScreen);
                  }
                  console.log(`[Stream] DONE - Final screens: ${screens.length}`, screens.map(s => `${s.name}${s.isEdit ? ' (edit)' : ''}`));
                  callbacks.onStreamComplete?.(screens);
                }
              } catch (e) {
                // JSON parse error - might be incomplete data
                if (e instanceof SyntaxError) continue;
                throw e;
              }
            }
          }
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        callbacks.onError?.(errorMsg);
      } finally {
        setIsStreaming(false);
        setCurrentScreenName(null);
      }
    },
    [callbacks]
  );

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return {
    isStreaming,
    completedScreens,
    currentStreamingHtml,
    currentScreenName,
    isEditingExistingScreen,
    startStreaming,
    stopStreaming,
  };
}
