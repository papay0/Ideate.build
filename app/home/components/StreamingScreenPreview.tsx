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
 * - <!-- GRID: ... --> - Grid positions for all screens (format: ScreenName: [col,row,isRoot])
 * - <!-- SCREEN_START: Name --> - Start of a screen
 * - <!-- SCREEN_EDIT: Name --> - Start of an edit to an existing screen
 * - <!-- SCREEN_END --> - End of a screen
 */

import { useRef, useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";

const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;

/**
 * Grid position data for a screen
 */
export interface GridPosition {
  col: number;
  row: number;
  isRoot: boolean;
}

/**
 * Parse the GRID section to extract all screen positions.
 * Format: <!-- GRID:\nScreenName: [col,row,isRoot]\n... -->
 * Returns a Map of screen name to position data.
 */
function parseGridSection(content: string): Map<string, GridPosition> {
  const gridMap = new Map<string, GridPosition>();

  // Match the entire GRID section (flexible whitespace)
  const gridMatch = content.match(/<!-- GRID:\s*([\s\S]*?)\s*-->/);
  if (!gridMatch) return gridMap;

  const gridContent = gridMatch[1];
  // Parse each line: ScreenName: [col,row,isRoot] (allow leading/trailing whitespace)
  const lineRegex = /^\s*(.+?):\s*\[(-?\d+),(-?\d+),([01])\]\s*$/gm;
  let match;

  while ((match = lineRegex.exec(gridContent)) !== null) {
    const screenName = match[1].trim();
    const col = parseInt(match[2], 10);
    const row = parseInt(match[3], 10);
    const isRoot = match[4] === "1";
    gridMap.set(screenName, { col, row, isRoot });
  }

  return gridMap;
}

/**
 * Parse prototype screen name to extract grid position and root marker.
 * Format: "Screen Name [col,row]" or "Screen Name [col,row] [ROOT]"
 * @deprecated Use GRID section instead. Kept for backward compatibility.
 */
function parsePrototypeScreenName(rawName: string): {
  name: string;
  gridCol?: number;
  gridRow?: number;
  isRoot?: boolean;
} {
  let name = rawName.trim();
  let gridCol: number | undefined;
  let gridRow: number | undefined;
  let isRoot = false;

  // Check for [ROOT] marker (legacy format)
  if (name.includes("[ROOT]")) {
    isRoot = true;
    name = name.replace("[ROOT]", "").trim();
  }

  // Check for [col,row] grid position (legacy format)
  const gridMatch = name.match(/\[(-?\d+),(-?\d+)\]/);
  if (gridMatch) {
    gridCol = parseInt(gridMatch[1], 10);
    gridRow = parseInt(gridMatch[2], 10);
    name = name.replace(gridMatch[0], "").trim();
  }

  return { name, gridCol, gridRow, isRoot };
}

export interface ParsedScreen {
  name: string;
  html: string;
  isEdit?: boolean;
  // Database ID (for @mention feature)
  id?: string;
  // Prototype-specific fields (parsed from screen name)
  gridCol?: number;
  gridRow?: number;
  isRoot?: boolean;
}

export interface UsageData {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  totalTokens: number;
  model: string;
  provider: 'openrouter' | 'gemini';
}

export interface QuotaExceededData {
  message: string;
  code: string;
  plan: string;
  messagesRemaining: number;
}

export interface StreamingCallbacks {
  onMessage?: (message: string) => void;
  onProjectName?: (name: string) => void;
  onProjectIcon?: (icon: string) => void;
  onGrid?: (gridMap: Map<string, GridPosition>) => void; // Called when GRID section is parsed
  onScreenStart?: (screenName: string) => void;
  onScreenEditStart?: (screenName: string) => void;
  onScreenComplete?: (screen: ParsedScreen) => void;
  onStreamComplete?: (screens: ParsedScreen[]) => void;
  onRawOutput?: (rawOutput: string) => void; // For debugging - raw LLM output
  onUsage?: (usage: UsageData) => void;
  onError?: (error: string) => void;
  onQuotaExceeded?: (data: QuotaExceededData) => void;
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
    html, body { overflow: hidden; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: transparent;
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
        className="relative bg-[#1A1A1A] rounded-[2.5rem] p-2 shadow-2xl overflow-hidden"
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
          className="bg-black rounded-[2rem] overflow-hidden"
          style={{
            width: PHONE_WIDTH,
            height: contentHeight,
            WebkitMaskImage: 'radial-gradient(white, white)',
            maskImage: 'radial-gradient(white, white)',
          }}
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
          <div className="absolute inset-0 rounded-[2.5rem] ring-4 ring-[#B8956F]/50 animate-pulse" />
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
  const [currentStreamingGridCol, setCurrentStreamingGridCol] = useState<number | undefined>(undefined);
  const [currentStreamingGridRow, setCurrentStreamingGridRow] = useState<number | undefined>(undefined);
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
      setCurrentStreamingGridCol(undefined);
      setCurrentStreamingGridRow(undefined);

      let buffer = "";
      let rawContent = "";
      let fullRawOutput = ""; // Accumulate ALL raw output for debugging
      let inScreen = false;
      let screenName = "";
      let screenHtml = "";
      let isEditingScreen = false;
      let screenGridCol: number | undefined;
      let screenGridRow: number | undefined;
      let screenIsRoot = false;
      const screens: ParsedScreen[] = [];
      let gridMap: Map<string, GridPosition> = new Map(); // Store grid positions from GRID section
      let gridParsed = false; // Track if GRID section has been parsed

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
          const errorText = await response.text();
          // Try to parse as JSON to detect QUOTA_EXCEEDED
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.code === "QUOTA_EXCEEDED") {
              callbacks.onQuotaExceeded?.({
                message: errorData.error || "You've used all your messages",
                code: errorData.code,
                plan: errorData.plan || "free",
                messagesRemaining: errorData.messagesRemaining ?? 0,
              });
              setIsStreaming(false);
              return; // Don't throw - handled by callback
            }
            if (errorData.code === "MODEL_RESTRICTED") {
              throw new Error("This model is only available for Pro users. Please upgrade or use the Flash model.");
            }
            // Other JSON error - extract message
            throw new Error(errorData.error || errorText);
          } catch (parseError) {
            // Not JSON, throw as-is
            if (parseError instanceof SyntaxError) {
              throw new Error(errorText);
            }
            throw parseError;
          }
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
                  fullRawOutput += data.chunk; // Keep unmodified copy for debugging
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

                  // Parse GRID section (must come before screens)
                  if (!gridParsed) {
                    const gridSectionMatch = rawContent.match(/<!-- GRID:\s*([\s\S]*?)\s*-->/);
                    if (gridSectionMatch) {
                      gridMap = parseGridSection(rawContent);
                      console.log(`[Stream] GRID section parsed with ${gridMap.size} screens:`, Array.from(gridMap.entries()));
                      callbacks.onGrid?.(gridMap);
                      gridParsed = true;
                      rawContent = rawContent.replace(gridSectionMatch[0], "");
                    }
                  }

                  // Parse SCREEN_START delimiter (new screen)
                  // Relaxed regex: also matches if AI forgets the closing -->
                  const startMatch = rawContent.match(/<!-- SCREEN_START:\s*([^\n<>]+?)(?:\s*-->|(?=\s*\n)|(?=<))/);
                  if (startMatch && !inScreen) {
                    inScreen = true;
                    isEditingScreen = false;
                    const rawScreenName = startMatch[1].trim();
                    // Parse inline position (legacy format) and extract clean name
                    const parsed = parsePrototypeScreenName(rawScreenName);
                    screenName = parsed.name;

                    // Try to get position from GRID section first (new format)
                    const gridPosition = gridMap.get(screenName);
                    if (gridPosition) {
                      screenGridCol = gridPosition.col;
                      screenGridRow = gridPosition.row;
                      screenIsRoot = gridPosition.isRoot;
                    } else {
                      // Fall back to inline position (legacy format)
                      screenGridCol = parsed.gridCol;
                      screenGridRow = parsed.gridRow;
                      screenIsRoot = parsed.isRoot || false;
                    }
                    screenHtml = "";
                    console.log(`[Stream] SCREEN_START (new): "${screenName}"${screenGridCol !== undefined ? ` at [${screenGridCol},${screenGridRow}]` : ""}${screenIsRoot ? " [ROOT]" : ""}${gridPosition ? " (from GRID)" : ""}`);
                    setCurrentScreenName(screenName);
                    setIsEditingExistingScreen(false);
                    setCurrentStreamingGridCol(screenGridCol);
                    setCurrentStreamingGridRow(screenGridRow);
                    callbacks.onScreenStart?.(screenName);
                    rawContent = rawContent.replace(startMatch[0], "");
                  }

                  // Parse SCREEN_EDIT delimiter (editing existing screen)
                  // Relaxed regex: also matches if AI forgets the closing -->
                  const editMatch = rawContent.match(/<!-- SCREEN_EDIT:\s*([^\n<>]+?)(?:\s*-->|(?=\s*\n)|(?=<))/);
                  if (editMatch && !inScreen) {
                    inScreen = true;
                    isEditingScreen = true;
                    screenName = editMatch[1].trim();
                    screenHtml = "";

                    // Get position from GRID section (required in new format)
                    const gridPosition = gridMap.get(screenName);
                    if (gridPosition) {
                      screenGridCol = gridPosition.col;
                      screenGridRow = gridPosition.row;
                      screenIsRoot = gridPosition.isRoot;
                    } else {
                      // No position in GRID - will use existing position from DB
                      screenGridCol = undefined;
                      screenGridRow = undefined;
                      screenIsRoot = false;
                    }

                    console.log(`[Stream] SCREEN_EDIT (updating): "${screenName}"${screenGridCol !== undefined ? ` at [${screenGridCol},${screenGridRow}]` : " (no GRID position)"}${screenIsRoot ? " [ROOT]" : ""}`);
                    setCurrentScreenName(screenName);
                    setIsEditingExistingScreen(true);
                    setCurrentStreamingGridCol(screenGridCol);
                    setCurrentStreamingGridRow(screenGridRow);
                    callbacks.onScreenEditStart?.(screenName);
                    rawContent = rawContent.replace(editMatch[0], "");
                  }

                  // Process screens in a loop to handle multiple screens in one chunk
                  let processingScreens = true;
                  while (processingScreens) {
                    processingScreens = false;

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
                          gridCol: screenGridCol,
                          gridRow: screenGridRow,
                          isRoot: screenIsRoot,
                        };
                        console.log(`[Stream] SCREEN_END: "${screenName}", isEdit: ${isEditingScreen}, HTML length: ${completedScreen.html.length}${screenGridCol !== undefined ? `, grid: [${screenGridCol},${screenGridRow}]` : ""}${screenIsRoot ? ", ROOT" : ""}`);
                        screens.push(completedScreen);
                        console.log(`[Stream] Total completed screens: ${screens.length}`, screens.map(s => `${s.name}${s.isEdit ? ' (edit)' : ''}`));
                        setCompletedScreens([...screens]);
                        callbacks.onScreenComplete?.(completedScreen);

                        inScreen = false;
                        screenName = "";
                        screenHtml = "";
                        isEditingScreen = false;
                        screenGridCol = undefined;
                        screenGridRow = undefined;
                        screenIsRoot = false;
                        setCurrentScreenName(null);
                        setCurrentStreamingHtml("");
                        setIsEditingExistingScreen(false);
                        setCurrentStreamingGridCol(undefined);
                        setCurrentStreamingGridRow(undefined);

                        // Continue processing to check for another screen in remaining content
                        processingScreens = rawContent.trim().length > 0;
                      } else {
                        // Still streaming this screen
                        screenHtml += rawContent;
                        setCurrentStreamingHtml(screenHtml);
                        rawContent = "";
                      }
                    } else if (rawContent.trim()) {
                      // Not in a screen - check for new SCREEN_START or SCREEN_EDIT
                      // Parse MESSAGE delimiter first
                      const messageMatch = rawContent.match(/<!-- MESSAGE: ([\s\S]*?) -->/g);
                      if (messageMatch) {
                        for (const match of messageMatch) {
                          const msg = match.replace(/<!-- MESSAGE: /, "").replace(/ -->/, "");
                          console.log(`[Stream] MESSAGE found (in loop): "${msg.substring(0, 50)}..."`);
                          callbacks.onMessage?.(msg);
                          rawContent = rawContent.replace(match, "");
                        }
                      }

                      // Check for SCREEN_START
                      const newStartMatch = rawContent.match(/<!-- SCREEN_START:\s*([^\n<>]+?)(?:\s*-->|(?=\s*\n)|(?=<))/);
                      if (newStartMatch) {
                        inScreen = true;
                        isEditingScreen = false;
                        const rawScreenName = newStartMatch[1].trim();
                        const parsed = parsePrototypeScreenName(rawScreenName);
                        screenName = parsed.name;

                        // Try to get position from GRID section first (new format)
                        const gridPosition = gridMap.get(screenName);
                        if (gridPosition) {
                          screenGridCol = gridPosition.col;
                          screenGridRow = gridPosition.row;
                          screenIsRoot = gridPosition.isRoot;
                        } else {
                          // Fall back to inline position (legacy format)
                          screenGridCol = parsed.gridCol;
                          screenGridRow = parsed.gridRow;
                          screenIsRoot = parsed.isRoot || false;
                        }
                        screenHtml = "";
                        console.log(`[Stream] SCREEN_START (in loop): "${screenName}"${screenGridCol !== undefined ? ` at [${screenGridCol},${screenGridRow}]` : ""}${screenIsRoot ? " [ROOT]" : ""}${gridPosition ? " (from GRID)" : ""}`);
                        setCurrentScreenName(screenName);
                        setIsEditingExistingScreen(false);
                        setCurrentStreamingGridCol(screenGridCol);
                        setCurrentStreamingGridRow(screenGridRow);
                        callbacks.onScreenStart?.(screenName);
                        rawContent = rawContent.replace(newStartMatch[0], "");
                        processingScreens = true; // Continue to process this screen's content
                      }

                      // Check for SCREEN_EDIT
                      const newEditMatch = rawContent.match(/<!-- SCREEN_EDIT:\s*([^\n<>]+?)(?:\s*-->|(?=\s*\n)|(?=<))/);
                      if (newEditMatch && !inScreen) {
                        inScreen = true;
                        isEditingScreen = true;
                        screenName = newEditMatch[1].trim();
                        screenHtml = "";

                        // Get position from GRID section (required in new format)
                        const gridPosition = gridMap.get(screenName);
                        if (gridPosition) {
                          screenGridCol = gridPosition.col;
                          screenGridRow = gridPosition.row;
                          screenIsRoot = gridPosition.isRoot;
                        } else {
                          // No position in GRID - will use existing position from DB
                          screenGridCol = undefined;
                          screenGridRow = undefined;
                          screenIsRoot = false;
                        }

                        console.log(`[Stream] SCREEN_EDIT (in loop): "${screenName}"${screenGridCol !== undefined ? ` at [${screenGridCol},${screenGridRow}]` : " (no GRID position)"}${screenIsRoot ? " [ROOT]" : ""}`);
                        setCurrentScreenName(screenName);
                        setIsEditingExistingScreen(true);
                        setCurrentStreamingGridCol(screenGridCol);
                        setCurrentStreamingGridRow(screenGridRow);
                        callbacks.onScreenEditStart?.(screenName);
                        rawContent = rawContent.replace(newEditMatch[0], "");
                        processingScreens = true;
                      }
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
                  // Log remaining content for debugging
                  if (rawContent.trim()) {
                    console.log(`[Stream] DONE with remaining rawContent (${rawContent.length} chars):`, rawContent.substring(0, 500));
                  }

                  // Check if there's an unprocessed SCREEN_START in remaining content
                  const unprocessedStart = rawContent.match(/<!-- SCREEN_START:\s*([^\n<>]+?)(?:\s*-->|(?=\s*\n)|(?=<))/);
                  if (unprocessedStart) {
                    console.warn(`[Stream] WARNING: Found unprocessed SCREEN_START for "${unprocessedStart[1]}" in remaining content!`);

                    // Try to extract this screen
                    const screenStartIndex = rawContent.indexOf(unprocessedStart[0]);
                    const screenEndMatch = rawContent.indexOf("<!-- SCREEN_END -->");

                    if (screenEndMatch !== -1 && screenEndMatch > screenStartIndex) {
                      const parsed = parsePrototypeScreenName(unprocessedStart[1].trim());
                      const htmlStart = screenStartIndex + unprocessedStart[0].length;
                      const recoveredHtml = rawContent.substring(htmlStart, screenEndMatch).trim();

                      if (recoveredHtml) {
                        console.log(`[Stream] Recovering screen "${parsed.name}" with ${recoveredHtml.length} chars`);
                        const recoveredScreen: ParsedScreen = {
                          name: parsed.name,
                          html: recoveredHtml,
                          isEdit: false,
                          gridCol: parsed.gridCol,
                          gridRow: parsed.gridRow,
                          isRoot: parsed.isRoot,
                        };
                        screens.push(recoveredScreen);
                        setCompletedScreens([...screens]);
                        callbacks.onScreenComplete?.(recoveredScreen);
                      }
                    }
                  }

                  // If we're still in a screen when done, capture it (stream might have ended abruptly)
                  if (inScreen && screenName && screenHtml.trim()) {
                    console.log(`[Stream] DONE but still in screen "${screenName}" - capturing partial screen`);
                    const partialScreen: ParsedScreen = {
                      name: screenName,
                      html: screenHtml.trim(),
                      isEdit: isEditingScreen,
                      gridCol: screenGridCol,
                      gridRow: screenGridRow,
                      isRoot: screenIsRoot,
                    };
                    screens.push(partialScreen);
                    setCompletedScreens([...screens]);
                    callbacks.onScreenComplete?.(partialScreen);
                  }

                  console.log(`[Stream] DONE - Final screens: ${screens.length}`, screens.map(s => `${s.name}${s.isEdit ? ' (edit)' : ''}`));
                  callbacks.onStreamComplete?.(screens);
                  callbacks.onRawOutput?.(fullRawOutput); // Send raw output for debugging
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
    currentStreamingGridCol,
    currentStreamingGridRow,
    startStreaming,
    stopStreaming,
  };
}
