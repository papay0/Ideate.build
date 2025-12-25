"use client";

/**
 * DesignCanvas Component
 *
 * A Figma-like canvas for displaying generated app screens.
 * Features:
 * - Horizontal layout with zoom/pan (using @use-gesture/react)
 * - Two-finger scroll to pan, pinch to zoom
 * - Real-time streaming preview
 * - Completed screens displayed in phone or browser mockups
 * - Platform-aware rendering (mobile vs desktop)
 */

import { useRef, useState, useEffect, memo } from "react";
import { useGesture } from "@use-gesture/react";
import { ZoomIn, ZoomOut, RotateCcw, Smartphone, Monitor, Loader2, Copy, Check, Camera } from "lucide-react";
import { captureElement, downloadBlob, toScreenFilename } from "@/lib/utils/screenshot";
import type { ParsedScreen } from "./StreamingScreenPreview";
import { BrowserMockup, StreamingBrowserMockup } from "./BrowserMockup";
import { PLATFORM_CONFIG, type Platform } from "@/lib/constants/platforms";

const PHONE_WIDTH = PLATFORM_CONFIG.mobile.width;
const PHONE_HEIGHT = PLATFORM_CONFIG.mobile.height;

interface DesignCanvasProps {
  completedScreens: ParsedScreen[];
  currentStreamingHtml: string;
  currentScreenName: string | null;
  isStreaming: boolean;
  editingScreenNames?: Set<string>;
  isEditingExistingScreen?: boolean;
  platform: Platform;
  /** Whether the viewport is mobile-sized (for responsive layout) */
  isMobileView?: boolean;
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
  const mockupRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
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

  const handleExport = async () => {
    if (!mockupRef.current || exporting) return;
    setExporting(true);
    try {
      const blob = await captureElement(mockupRef.current, { scale: 2 });
      downloadBlob(blob, toScreenFilename(screen.name));
    } catch (error) {
      console.error("Failed to export screenshot:", error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 flex-shrink-0" data-screen-name={screen.name} data-mockup-type="phone">
      {/* Phone Frame */}
      <div
        ref={mockupRef}
        className={`relative bg-[#1A1A1A] rounded-[3rem] p-3 shadow-2xl transition-all duration-300 ${
        isEditing ? "ring-4 ring-blue-500/50 animate-pulse" : ""
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
        <button
          onClick={handleExport}
          disabled={exporting}
          className="text-[#9A9A9A] hover:text-[#6B6B6B] p-1 rounded transition-colors disabled:opacity-50"
          title="Export as PNG"
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Camera className="w-4 h-4" />
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
  platform,
  isMobileView = false,
}: DesignCanvasProps) {
  const hasScreens = completedScreens.length > 0 || (isStreaming && currentScreenName && !isEditingExistingScreen);

  // Platform-specific settings (mobile vs desktop design platform)
  const isMobilePlatform = platform === "mobile";
  // Viewport-aware scale: larger default zoom on mobile viewports
  const initialScale = isMobileView ? 0.7 : (isMobilePlatform ? 0.5 : 0.35);
  const PlatformIcon = isMobilePlatform ? Smartphone : Monitor;
  const platformLabel = isMobilePlatform ? "app" : "website";

  // Canvas transform state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: initialScale });
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset transform when platform changes
  useEffect(() => {
    setTransform({ x: 0, y: 0, scale: initialScale });
  }, [initialScale]);

  // Gesture handlers using @use-gesture/react
  useGesture(
    {
      onWheel: ({ event, delta: [dx, dy], ctrlKey }) => {
        event.preventDefault();

        if (ctrlKey) {
          // Pinch-to-zoom towards mouse position
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;

          const mouseX = (event as WheelEvent).clientX - rect.left;
          const mouseY = (event as WheelEvent).clientY - rect.top;

          const zoomFactor = 1 - dy * 0.01;

          setTransform((prev) => {
            const newScale = Math.min(Math.max(prev.scale * zoomFactor, 0.1), 2);
            const scaleChange = newScale / prev.scale;

            // Adjust position to zoom towards mouse
            const newX = mouseX - (mouseX - prev.x) * scaleChange;
            const newY = mouseY - (mouseY - prev.y) * scaleChange;

            return { x: newX, y: newY, scale: newScale };
          });
        } else {
          // Two-finger scroll → pan
          setTransform((prev) => ({
            ...prev,
            x: prev.x - dx,
            y: prev.y - dy,
          }));
        }
      },
      onPinch: ({ offset: [scale], origin: [ox, oy], event }) => {
        event?.preventDefault();
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const mouseX = ox - rect.left;
        const mouseY = oy - rect.top;

        setTransform((prev) => {
          const newScale = Math.min(Math.max(scale, 0.1), 2);
          const scaleChange = newScale / prev.scale;

          const newX = mouseX - (mouseX - prev.x) * scaleChange;
          const newY = mouseY - (mouseY - prev.y) * scaleChange;

          return { x: newX, y: newY, scale: newScale };
        });
      },
      onDrag: ({ delta: [dx, dy], buttons }) => {
        // Left click drag to pan
        if (buttons === 1) {
          setTransform((prev) => ({
            ...prev,
            x: prev.x + dx,
            y: prev.y + dy,
          }));
        }
      },
    },
    {
      target: containerRef,
      wheel: { eventOptions: { passive: false } },
      drag: { pointer: { buttons: [1] } },
      pinch: {
        scaleBounds: { min: 0.1, max: 2 },
        from: () => [transform.scale, 0],
      },
    }
  );

  // Prevent Safari gesture zoom on the document
  useEffect(() => {
    const preventDefault = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", preventDefault);
    document.addEventListener("gesturechange", preventDefault);
    return () => {
      document.removeEventListener("gesturestart", preventDefault);
      document.removeEventListener("gesturechange", preventDefault);
    };
  }, []);

  const handleZoomIn = () => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(prev.scale * 1.2, 2),
    }));
  };

  const handleZoomOut = () => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(prev.scale / 1.2, 0.1),
    }));
  };

  const handleReset = () => {
    setTransform({ x: 0, y: 0, scale: initialScale });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F0EDE8] overflow-hidden">
      {/* Canvas Content */}
      <div className="flex-1 overflow-hidden relative">
        {!hasScreens ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#E8E4E0] flex items-center justify-center mb-4">
              <PlatformIcon className="w-8 h-8 text-[#9A9A9A]" />
            </div>
            <h3 className="text-lg font-medium text-[#6B6B6B] mb-2">
              {isStreaming ? "Starting generation..." : "No designs yet"}
            </h3>
            <p className="text-sm text-[#9A9A9A] max-w-md">
              {isStreaming
                ? "The AI is preparing your designs"
                : `Enter a prompt to generate your first ${platformLabel} design`}
            </p>
            {isStreaming && (
              <Loader2 className="w-8 h-8 text-[#B8956F] animate-spin mt-6" />
            )}
          </div>
        ) : (
          <>
            {/* Zoom controls */}
            <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2 bg-white rounded-lg shadow-lg p-1 border border-[#E8E4E0]">
              <button
                onClick={handleZoomOut}
                className="p-2 text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#F5F2EF] rounded transition-colors"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-[#9A9A9A] min-w-[3rem] text-center">
                {Math.round(transform.scale * 100)}%
              </span>
              <button
                onClick={handleReset}
                className="p-2 text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#F5F2EF] rounded transition-colors"
                title="Reset zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomIn}
                className="p-2 text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#F5F2EF] rounded transition-colors"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Canvas with gestures */}
            <div
              ref={containerRef}
              className="w-full h-full touch-none"
            >
              <div
                className="flex flex-row gap-[60px] p-20 min-w-max origin-top-left"
                style={{
                  transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                }}
              >
                {/* Completed screens - render appropriate mockup based on platform */}
                {completedScreens.map((screen) =>
                  isMobilePlatform ? (
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
                  ) : (
                    <BrowserMockup
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
                  )
                )}

                {/* Currently streaming NEW screen (not editing existing) */}
                {isStreaming &&
                  currentScreenName &&
                  currentStreamingHtml &&
                  !isEditingExistingScreen &&
                  (isMobilePlatform ? (
                    <StreamingPhoneMockup
                      html={currentStreamingHtml}
                      screenName={currentScreenName}
                    />
                  ) : (
                    <StreamingBrowserMockup
                      html={currentStreamingHtml}
                      screenName={currentScreenName}
                    />
                  ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
