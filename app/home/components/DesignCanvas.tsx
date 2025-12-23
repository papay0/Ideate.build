"use client";

/**
 * DesignCanvas Component
 *
 * A Figma-like canvas for displaying generated app screens.
 * Features:
 * - Horizontal layout with zoom/pan (using react-zoom-pan-pinch)
 * - Real-time streaming preview
 * - Completed screens displayed in phone mockups
 */

import { useRef, useState, useEffect, memo } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ZoomIn, ZoomOut, RotateCcw, Smartphone, Loader2, Copy, Check } from "lucide-react";
import type { ParsedScreen } from "./StreamingScreenPreview";

const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;

interface DesignCanvasProps {
  completedScreens: ParsedScreen[];
  currentStreamingHtml: string;
  currentScreenName: string | null;
  isStreaming: boolean;
  editingScreenNames?: Set<string>;
  isEditingExistingScreen?: boolean;
}

/**
 * Get streaming HTML for a screen if it's currently being edited
 */
function getStreamingHtmlForScreen(
  screenName: string,
  currentScreenName: string | null,
  isEditingExistingScreen: boolean,
  currentStreamingHtml: string
): string | null {
  if (
    currentScreenName === screenName &&
    isEditingExistingScreen &&
    currentStreamingHtml
  ) {
    return currentStreamingHtml;
  }
  return null;
}

/**
 * Phone mockup that displays completed HTML
 * Uses stable iframe initialization to prevent flashing
 */
const PhoneMockup = memo(function PhoneMockup({
  screen,
  isEditing = false,
  streamingHtml,
}: {
  screen: ParsedScreen;
  isEditing?: boolean;
  streamingHtml?: string | null;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [copied, setCopied] = useState(false);
  const initializedRef = useRef(false);

  // The HTML to display - streaming HTML if editing, otherwise completed HTML
  const displayHtml = streamingHtml || screen.html;

  // Initialize iframe once with base document
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || initializedRef.current) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

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
<body>${displayHtml}</body>
</html>`);
    doc.close();
    initializedRef.current = true;
  }, []);

  // Update body content when HTML changes (without replacing the whole document)
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;

    // If document not ready yet, write the full document
    if (!doc?.body || !initializedRef.current) {
      if (doc) {
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
<body>${displayHtml}</body>
</html>`);
        doc.close();
        initializedRef.current = true;
      }
      return;
    }

    // Only update innerHTML - this doesn't cause a flash
    doc.body.innerHTML = displayHtml;
  }, [displayHtml]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(screen.html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center gap-3 flex-shrink-0">
      {/* Phone Frame */}
      <div className={`relative bg-[#1A1A1A] rounded-[3rem] p-3 shadow-2xl transition-all duration-300 ${
        isEditing
          ? "ring-4 ring-blue-500/50 animate-pulse"
          : "ring-2 ring-green-500/30"
      }`}>
        {/* Editing/Complete indicator badge */}
        {isEditing && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 bg-blue-500 text-white text-xs px-3 py-1 rounded-full flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Updating...
          </div>
        )}

        {/* Screen - fixed height with scrollable content */}
        <div
          className="bg-white rounded-[2.5rem] overflow-hidden"
          style={{ width: PHONE_WIDTH, height: PHONE_HEIGHT }}
        >
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0"
            title={screen.name}
            sandbox="allow-scripts allow-same-origin"
            style={{ pointerEvents: "none" }}
          />
        </div>

        {/* Home Indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-zinc-700 rounded-full" />
      </div>

      {/* Screen Label & Copy Button */}
      <div className="flex items-center gap-2">
        {isEditing ? (
          <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-green-500" />
        )}
        <span className="text-sm text-[#6B6B6B] font-medium">{screen.name}</span>
        {isEditing ? (
          <span className="text-xs text-blue-400">Updating...</span>
        ) : (
          <span className="text-xs text-green-400">Complete</span>
        )}
        <button
          onClick={handleCopy}
          className="text-[#9A9A9A] hover:text-[#6B6B6B] p-1 rounded transition-colors"
          title="Copy HTML"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
});

/**
 * Streaming phone mockup that shows HTML as it arrives
 * Uses incremental body updates to prevent flashing
 */
const StreamingPhoneMockup = memo(function StreamingPhoneMockup({
  html,
  screenName,
}: {
  html: string;
  screenName: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const initializedRef = useRef(false);

  // Initialize iframe once with base document
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || initializedRef.current) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

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
<body></body>
</html>`);
    doc.close();
    initializedRef.current = true;
  }, []);

  // Update body content incrementally (without replacing the whole document)
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;

    // If document not ready yet, write the full document
    if (!doc?.body || !initializedRef.current) {
      if (doc) {
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
<body>${html}</body>
</html>`);
        doc.close();
        initializedRef.current = true;
      }
      return;
    }

    // Only update innerHTML - this doesn't cause a flash
    doc.body.innerHTML = html;
  }, [html]);

  return (
    <div className="flex flex-col items-center gap-3 flex-shrink-0">
      {/* Phone Frame */}
      <div className="relative bg-[#1A1A1A] rounded-[3rem] p-3 shadow-2xl">
        {/* Streaming indicator */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 bg-[#B8956F] text-white text-xs px-3 py-1 rounded-full flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          Generating {screenName}...
        </div>

        {/* Screen - fixed height with scrollable content */}
        <div
          className="bg-white rounded-[2.5rem] overflow-hidden"
          style={{ width: PHONE_WIDTH, height: PHONE_HEIGHT }}
        >
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0"
            title={screenName}
            sandbox="allow-scripts allow-same-origin"
            style={{ pointerEvents: "none" }}
          />
        </div>

        {/* Home Indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-zinc-700 rounded-full" />

        {/* Pulsing ring while streaming */}
        <div className="absolute inset-0 rounded-[3rem] ring-4 ring-[#B8956F]/50 animate-pulse" />
      </div>

      {/* Screen Label */}
      <span className="text-sm text-[#B8956F] font-medium">{screenName}</span>
    </div>
  );
});

/**
 * Main canvas component
 */
export function DesignCanvas({
  completedScreens,
  currentStreamingHtml,
  currentScreenName,
  isStreaming,
  editingScreenNames = new Set(),
  isEditingExistingScreen = false,
}: DesignCanvasProps) {
  const hasScreens = completedScreens.length > 0 || (isStreaming && currentScreenName && !isEditingExistingScreen);

  return (
    <div className="flex-1 flex flex-col bg-[#F0EDE8] overflow-hidden">
      {/* Canvas Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E4E0] bg-white/50">
        <span className="text-sm text-[#6B6B6B]">
          {completedScreens.length} screen{completedScreens.length !== 1 ? "s" : ""}
          {isStreaming && currentScreenName && " (streaming...)"}
        </span>
        <div className="flex items-center gap-1 text-sm text-[#9A9A9A]">
          <span>Scroll to pan, pinch to zoom</span>
        </div>
      </div>

      {/* Canvas Content */}
      <div className="flex-1 overflow-hidden">
        {!hasScreens ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#E8E4E0] flex items-center justify-center mb-4">
              <Smartphone className="w-8 h-8 text-[#9A9A9A]" />
            </div>
            <h3 className="text-lg font-medium text-[#6B6B6B] mb-2">
              {isStreaming ? "Starting generation..." : "No designs yet"}
            </h3>
            <p className="text-sm text-[#9A9A9A] max-w-md">
              {isStreaming
                ? "The AI is preparing your designs"
                : "Enter a prompt to generate your first app design"}
            </p>
            {isStreaming && (
              <Loader2 className="w-8 h-8 text-[#B8956F] animate-spin mt-6" />
            )}
          </div>
        ) : (
          <TransformWrapper
            initialScale={0.5}
            minScale={0.2}
            maxScale={2}
            centerOnInit
            limitToBounds={false}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                {/* Zoom controls */}
                <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2 bg-white rounded-lg shadow-lg p-1 border border-[#E8E4E0]">
                  <button
                    onClick={() => zoomOut()}
                    className="p-2 text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#F5F2EF] rounded transition-colors"
                    title="Zoom out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => resetTransform()}
                    className="p-2 text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#F5F2EF] rounded transition-colors"
                    title="Reset zoom"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => zoomIn()}
                    className="p-2 text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#F5F2EF] rounded transition-colors"
                    title="Zoom in"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>

                <TransformComponent
                  wrapperStyle={{
                    width: "100%",
                    height: "100%",
                  }}
                  contentStyle={{
                    display: "flex",
                    flexDirection: "row",
                    gap: "60px",
                    padding: "80px",
                    minWidth: "max-content",
                  }}
                >
                  {/* Completed screens */}
                  {completedScreens.map((screen) => (
                    <PhoneMockup
                      key={screen.name}
                      screen={screen}
                      isEditing={editingScreenNames.has(screen.name)}
                      streamingHtml={getStreamingHtmlForScreen(
                        screen.name,
                        currentScreenName,
                        isEditingExistingScreen,
                        currentStreamingHtml
                      )}
                    />
                  ))}

                  {/* Currently streaming NEW screen (not editing existing) */}
                  {isStreaming && currentScreenName && currentStreamingHtml && !isEditingExistingScreen && (
                    <StreamingPhoneMockup
                      html={currentStreamingHtml}
                      screenName={currentScreenName}
                    />
                  )}
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        )}
      </div>
    </div>
  );
}
