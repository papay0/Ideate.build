"use client";

/**
 * PrototypeCanvas Component
 *
 * A Figma-like canvas for displaying prototype screens in a grid layout.
 * Unlike DesignCanvas (horizontal row), this positions screens based on
 * their [col, row] grid coordinates from the AI.
 *
 * Features:
 * - Grid-based layout using gridCol/gridRow positions
 * - Flow arrows between connected screens
 * - Zoom/pan with @use-gesture/react
 * - Toggle for showing/hiding flow connections
 */

import { useRef, useState, useEffect, memo, useCallback, ReactNode } from "react";
import { flushSync } from "react-dom";
import { useGesture, useDrag } from "@use-gesture/react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Smartphone,
  Monitor,
  Loader2,
  Copy,
  Check,
  Camera,
  GitBranch,
  Move,
} from "lucide-react";
import { captureElement, downloadBlob, toScreenFilename } from "@/lib/utils/screenshot";
import type { ParsedScreen } from "../StreamingScreenPreview";
import { PLATFORM_CONFIG, type Platform } from "@/lib/constants/platforms";
import { gridToPixels, getGridConfig, calculateCanvasBounds } from "@/lib/prototype/grid";
import { FlowConnections } from "./FlowConnections";

const PHONE_WIDTH = PLATFORM_CONFIG.mobile.width;
const PHONE_HEIGHT = PLATFORM_CONFIG.mobile.height;
const DESKTOP_WIDTH = PLATFORM_CONFIG.desktop.width;
const DESKTOP_HEIGHT = PLATFORM_CONFIG.desktop.height;

// Position override for a dragged screen (stores delta from original position)
interface PositionOverride {
  deltaX: number;
  deltaY: number;
}

// Map of screen name to position override
type PositionOverrides = Record<string, PositionOverride>;

// Get localStorage key for position overrides (scoped by prototype ID)
function getStorageKey(prototypeId?: string): string {
  return prototypeId ? `prototype-positions-${prototypeId}` : "prototype-positions-temp";
}

// Load position overrides from localStorage
function loadPositionOverrides(prototypeId?: string): PositionOverrides {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(getStorageKey(prototypeId));
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// Save position overrides to localStorage
function savePositionOverrides(overrides: PositionOverrides, prototypeId?: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getStorageKey(prototypeId), JSON.stringify(overrides));
  } catch {
    // Ignore storage errors
  }
}

interface PrototypeCanvasProps {
  completedScreens: ParsedScreen[];
  currentStreamingHtml: string;
  currentScreenName: string | null;
  isStreaming: boolean;
  editingScreenNames?: Set<string>;
  isEditingExistingScreen?: boolean;
  platform: Platform;
  isMobileView?: boolean;
  prototypeId?: string;
  isAdmin?: boolean;
  // Grid position for currently streaming screen (from GRID section)
  currentStreamingGridCol?: number;
  currentStreamingGridRow?: number;
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
 * Phone mockup content (without absolute positioning)
 * Used inside DraggableScreen for drag-to-move functionality
 */
const PhoneMockupContent = memo(function PhoneMockupContent({
  screen,
  isEditing = false,
  streamingHtml,
  isAdmin = false,
}: {
  screen: ParsedScreen;
  isEditing?: boolean;
  streamingHtml?: string | null;
  isAdmin?: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const initializedRef = useRef(false);

  const displayHtml = streamingHtml || screen.html;

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
    * { margin: 0; padding: 0; box-sizing: border-box; -ms-overflow-style: none; scrollbar-width: none; }
    *::-webkit-scrollbar { display: none; }
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
<body>${displayHtml}</body>
</html>`);
    doc.close();
    initializedRef.current = true;
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;

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
    * { margin: 0; padding: 0; box-sizing: border-box; -ms-overflow-style: none; scrollbar-width: none; }
    *::-webkit-scrollbar { display: none; }
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
<body>${displayHtml}</body>
</html>`);
        doc.close();
        initializedRef.current = true;
      }
      return;
    }

    doc.body.innerHTML = displayHtml;
  }, [displayHtml]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering drag
    await navigator.clipboard.writeText(screen.html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering drag
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
    <>
      {/* ROOT badge */}
      {screen.isRoot && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-green-500 text-white text-xs font-medium rounded-full z-10">
          ROOT
        </div>
      )}

      {/* Phone Frame */}
      <div
        ref={mockupRef}
        className={`relative bg-[#1A1A1A] rounded-[3rem] p-3 shadow-2xl overflow-hidden transition-all duration-300 ${
          isEditing ? "ring-4 ring-blue-500/50 animate-pulse" : ""
        }`}
        data-screen-name={screen.name}
        data-mockup-type="phone"
      >
        {isEditing && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 bg-blue-500 text-white text-xs px-3 py-1 rounded-full flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Updating...
          </div>
        )}

        <div
          className="bg-[#1A1A1A] rounded-[2.25rem] overflow-hidden"
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

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-zinc-700 rounded-full" />
      </div>

      {/* Screen Label & Actions */}
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

      {/* Grid position indicator (admin only) */}
      {isAdmin && (
        <div className="text-xs text-[#9A9A9A] font-mono">
          [{screen.gridCol ?? 0}, {screen.gridRow ?? 0}]
        </div>
      )}
    </>
  );
});

/**
 * Browser mockup content (without absolute positioning)
 * Used inside DraggableScreen for drag-to-move functionality
 */
const BrowserMockupContent = memo(function BrowserMockupContent({
  screen,
  isEditing = false,
  streamingHtml,
  isAdmin = false,
}: {
  screen: ParsedScreen;
  isEditing?: boolean;
  streamingHtml?: string | null;
  isAdmin?: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const initializedRef = useRef(false);

  const displayHtml = streamingHtml || screen.html;

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
  <meta name="viewport" content="width=${DESKTOP_WIDTH}, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -ms-overflow-style: none; scrollbar-width: none; }
    *::-webkit-scrollbar { display: none; }
    html, body { overflow: hidden; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: transparent;
      min-height: 100vh;
      width: ${DESKTOP_WIDTH}px;
    }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>${displayHtml}</body>
</html>`);
    doc.close();
    initializedRef.current = true;
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;

    if (!doc?.body || !initializedRef.current) {
      if (doc) {
        doc.open();
        doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${DESKTOP_WIDTH}, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -ms-overflow-style: none; scrollbar-width: none; }
    *::-webkit-scrollbar { display: none; }
    html, body { overflow: hidden; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: transparent;
      min-height: 100vh;
      width: ${DESKTOP_WIDTH}px;
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

    doc.body.innerHTML = displayHtml;
  }, [displayHtml]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering drag
    await navigator.clipboard.writeText(screen.html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering drag
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
    <>
      {/* ROOT badge */}
      {screen.isRoot && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-green-500 text-white text-xs font-medium rounded-full z-10">
          ROOT
        </div>
      )}

      {/* Browser Frame */}
      <div
        ref={mockupRef}
        className={`relative bg-[#2a2a2a] rounded-xl overflow-hidden shadow-2xl transition-all duration-300 ${
          isEditing ? "ring-4 ring-blue-500/50 animate-pulse" : ""
        }`}
        data-screen-name={screen.name}
        data-mockup-type="browser"
      >
        {isEditing && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 bg-blue-500 text-white text-xs px-3 py-1 rounded-full flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Updating...
          </div>
        )}

        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#3a3a3a] border-b border-[#444]">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex-1 mx-4">
            <div className="bg-[#2a2a2a] rounded-md px-3 py-1.5 text-sm text-white/50 text-center">
              {screen.name.toLowerCase().replace(/\s+/g, "-")}
            </div>
          </div>
          <div className="w-16" />
        </div>

        <div style={{ width: DESKTOP_WIDTH, height: DESKTOP_HEIGHT }}>
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0"
            title={screen.name}
            sandbox="allow-scripts allow-same-origin"
            style={{ pointerEvents: "none" }}
          />
        </div>
      </div>

      {/* Screen Label & Actions */}
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

      {/* Grid position indicator (admin only) */}
      {isAdmin && (
        <div className="text-xs text-[#9A9A9A] font-mono">
          [{screen.gridCol ?? 0}, {screen.gridRow ?? 0}]
        </div>
      )}
    </>
  );
});

/**
 * Streaming phone mockup at an absolute position
 */
const StreamingPositionedPhoneMockup = memo(function StreamingPositionedPhoneMockup({
  html,
  screenName,
  x,
  y,
  gridCol,
  gridRow,
  isAdmin = false,
}: {
  html: string;
  screenName: string;
  x: number;
  y: number;
  gridCol: number;
  gridRow: number;
  isAdmin?: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const initializedRef = useRef(false);

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
    * { margin: 0; padding: 0; box-sizing: border-box; -ms-overflow-style: none; scrollbar-width: none; }
    *::-webkit-scrollbar { display: none; }
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
<body></body>
</html>`);
    doc.close();
    initializedRef.current = true;
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;

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
    * { margin: 0; padding: 0; box-sizing: border-box; -ms-overflow-style: none; scrollbar-width: none; }
    *::-webkit-scrollbar { display: none; }
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
<body>${html}</body>
</html>`);
        doc.close();
        initializedRef.current = true;
      }
      return;
    }

    doc.body.innerHTML = html;
  }, [html]);

  return (
    <div
      className="absolute flex flex-col items-center gap-3"
      style={{ left: x, top: y }}
    >
      <div className="relative bg-[#1A1A1A] rounded-[3rem] p-3 shadow-2xl overflow-hidden">
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 bg-[#B8956F] text-white text-xs px-3 py-1 rounded-full flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          Generating {screenName}...
        </div>

        <div
          className="bg-[#1A1A1A] rounded-[2.25rem] overflow-hidden"
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

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-zinc-700 rounded-full" />
        <div className="absolute inset-0 rounded-[3rem] ring-4 ring-[#B8956F]/50 animate-pulse" />
      </div>

      <span className="text-sm text-[#B8956F] font-medium">{screenName}</span>
      {isAdmin && (
        <div className="text-xs text-[#9A9A9A] font-mono">[{gridCol}, {gridRow}]</div>
      )}
    </div>
  );
});

/**
 * Streaming browser mockup at an absolute position
 */
const StreamingPositionedBrowserMockup = memo(function StreamingPositionedBrowserMockup({
  html,
  screenName,
  x,
  y,
  gridCol,
  gridRow,
  isAdmin = false,
}: {
  html: string;
  screenName: string;
  x: number;
  y: number;
  gridCol: number;
  gridRow: number;
  isAdmin?: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const initializedRef = useRef(false);

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
  <meta name="viewport" content="width=${DESKTOP_WIDTH}, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -ms-overflow-style: none; scrollbar-width: none; }
    *::-webkit-scrollbar { display: none; }
    html, body { overflow: hidden; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: transparent;
      min-height: 100vh;
      width: ${DESKTOP_WIDTH}px;
    }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body></body>
</html>`);
    doc.close();
    initializedRef.current = true;
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;

    if (!doc?.body || !initializedRef.current) {
      if (doc) {
        doc.open();
        doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${DESKTOP_WIDTH}, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -ms-overflow-style: none; scrollbar-width: none; }
    *::-webkit-scrollbar { display: none; }
    html, body { overflow: hidden; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: transparent;
      min-height: 100vh;
      width: ${DESKTOP_WIDTH}px;
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

    doc.body.innerHTML = html;
  }, [html]);

  return (
    <div
      className="absolute flex flex-col items-center gap-3"
      style={{ left: x, top: y }}
    >
      <div className="relative bg-[#2a2a2a] rounded-xl overflow-hidden shadow-2xl">
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 bg-[#B8956F] text-white text-xs px-3 py-1 rounded-full flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          Generating {screenName}...
        </div>

        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#3a3a3a] border-b border-[#444]">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex-1 mx-4">
            <div className="bg-[#2a2a2a] rounded-md px-3 py-1.5 text-sm text-white/50 text-center">
              {screenName.toLowerCase().replace(/\s+/g, "-")}
            </div>
          </div>
          <div className="w-16" />
        </div>

        <div style={{ width: DESKTOP_WIDTH, height: DESKTOP_HEIGHT }}>
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0"
            title={screenName}
            sandbox="allow-scripts allow-same-origin"
            style={{ pointerEvents: "none" }}
          />
        </div>

        <div className="absolute inset-0 rounded-xl ring-4 ring-[#B8956F]/50 animate-pulse pointer-events-none" />
      </div>

      <span className="text-sm text-[#B8956F] font-medium">{screenName}</span>
      {isAdmin && (
        <div className="text-xs text-[#9A9A9A] font-mono">[{gridCol}, {gridRow}]</div>
      )}
    </div>
  );
});

/**
 * Draggable wrapper for screen mockups
 * Handles drag-to-move functionality
 */
const DraggableScreen = memo(function DraggableScreen({
  children,
  screenName,
  x,
  y,
  deltaX,
  deltaY,
  onDragStart,
  onDrag,
  onDragEnd,
  canvasScale,
}: {
  children: ReactNode;
  screenName: string;
  x: number;
  y: number;
  deltaX: number;
  deltaY: number;
  onDragStart: () => void;
  onDrag: (screenName: string, deltaX: number, deltaY: number) => void;
  onDragEnd: (screenName: string, deltaX: number, deltaY: number) => void;
  canvasScale: number;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const initialDeltaRef = useRef({ x: deltaX, y: deltaY });

  const bind = useDrag(
    ({ movement: [mx, my], first, last }) => {
      if (first) {
        // Store the initial delta at drag start
        initialDeltaRef.current = { x: deltaX, y: deltaY };
        setIsDragging(true);
        onDragStart(); // Tell parent we're starting to drag
      }

      // Adjust movement by canvas scale for 1:1 feel
      const scaledMx = mx / canvasScale;
      const scaledMy = my / canvasScale;

      // Calculate new delta from INITIAL position + movement
      const newDeltaX = initialDeltaRef.current.x + scaledMx;
      const newDeltaY = initialDeltaRef.current.y + scaledMy;

      // Update position in real-time so arrows follow
      onDrag(screenName, newDeltaX, newDeltaY);

      if (last) {
        // Final position commit (also saves to localStorage)
        onDragEnd(screenName, newDeltaX, newDeltaY);
        setIsDragging(false);
      }
    },
    {
      filterTaps: true,
    }
  );

  // Calculate final position
  const finalX = x + deltaX;
  const finalY = y + deltaY;

  return (
    <div
      {...bind()}
      className={`absolute flex flex-col items-center gap-3 ${
        isDragging
          ? "cursor-grabbing z-50 touch-none"
          : "cursor-grab touch-none"
      }`}
      style={{
        left: finalX,
        top: finalY,
      }}
    >
      {children}
    </div>
  );
});

/**
 * Main PrototypeCanvas component
 */
export function PrototypeCanvas({
  completedScreens,
  currentStreamingHtml,
  currentScreenName,
  isStreaming,
  editingScreenNames = new Set(),
  isEditingExistingScreen = false,
  platform,
  isMobileView = false,
  prototypeId,
  isAdmin = false,
  currentStreamingGridCol,
  currentStreamingGridRow,
}: PrototypeCanvasProps) {
  const hasScreens =
    completedScreens.length > 0 ||
    (isStreaming && currentScreenName && !isEditingExistingScreen);

  const isMobilePlatform = platform === "mobile";
  const initialScale = isMobileView ? 0.5 : isMobilePlatform ? 0.4 : 0.25;
  const PlatformIcon = isMobilePlatform ? Smartphone : Monitor;
  const platformLabel = isMobilePlatform ? "app" : "website";

  const [transform, setTransform] = useState({ x: 80, y: 80, scale: initialScale });
  const [showFlows, setShowFlows] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Position overrides for dragged screens
  const [positionOverrides, setPositionOverrides] = useState<PositionOverrides>({});

  // Track if any screen is being dragged (to disable canvas pan)
  const [isDraggingScreen, setIsDraggingScreen] = useState(false);

  // Use a ref for instant position updates (screens read from ref for immediate visual feedback)
  const positionOverridesRef = useRef<PositionOverrides>({});

  // Load position overrides from localStorage on mount
  useEffect(() => {
    const loaded = loadPositionOverrides(prototypeId);
    setPositionOverrides(loaded);
    positionOverridesRef.current = loaded;
  }, [prototypeId]);

  // Handle drag start
  const handleDragStart = useCallback(() => {
    setIsDraggingScreen(true);
  }, []);

  // Handle drag - update position in real-time (no save)
  const handleDrag = useCallback(
    (screenName: string, deltaX: number, deltaY: number) => {
      // Update ref immediately for screen position
      positionOverridesRef.current = {
        ...positionOverridesRef.current,
        [screenName]: { deltaX, deltaY },
      };
      // Use flushSync to force synchronous state update (bypasses React 18 batching)
      // This ensures arrows update instantly during drag by updating actual state
      flushSync(() => {
        setPositionOverrides(prev => ({
          ...prev,
          [screenName]: { deltaX, deltaY },
        }));
      });
    },
    []
  );

  // Handle drag end - persist position to localStorage
  const handleDragEnd = useCallback(
    (screenName: string, deltaX: number, deltaY: number) => {
      const updated = {
        ...positionOverridesRef.current,
        [screenName]: { deltaX, deltaY },
      };
      positionOverridesRef.current = updated;
      setPositionOverrides(updated);
      savePositionOverrides(updated, prototypeId);
      setIsDraggingScreen(false);
    },
    [prototypeId]
  );

  // Reset all position overrides
  const handleResetPositions = useCallback(() => {
    setPositionOverrides({});
    positionOverridesRef.current = {};
    savePositionOverrides({}, prototypeId);
  }, [prototypeId]);

  // Check if any positions have been modified (use ref for current state)
  const hasPositionOverrides = Object.keys(positionOverridesRef.current).length > 0;

  // Reset transform when platform changes
  useEffect(() => {
    setTransform({ x: 80, y: 80, scale: initialScale });
  }, [initialScale]);

  // Calculate canvas bounds for fitting content
  const bounds = calculateCanvasBounds(completedScreens, platform);

  // Gesture handlers
  useGesture(
    {
      onWheel: ({ event, delta: [dx, dy], ctrlKey }) => {
        event.preventDefault();

        if (ctrlKey) {
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;

          const mouseX = (event as WheelEvent).clientX - rect.left;
          const mouseY = (event as WheelEvent).clientY - rect.top;

          const zoomFactor = 1 - dy * 0.01;

          setTransform((prev) => {
            const newScale = Math.min(Math.max(prev.scale * zoomFactor, 0.05), 5);
            const scaleChange = newScale / prev.scale;

            const newX = mouseX - (mouseX - prev.x) * scaleChange;
            const newY = mouseY - (mouseY - prev.y) * scaleChange;

            return { x: newX, y: newY, scale: newScale };
          });
        } else {
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
          const newScale = Math.min(Math.max(scale, 0.05), 5);
          const scaleChange = newScale / prev.scale;

          const newX = mouseX - (mouseX - prev.x) * scaleChange;
          const newY = mouseY - (mouseY - prev.y) * scaleChange;

          return { x: newX, y: newY, scale: newScale };
        });
      },
      onDrag: ({ delta: [dx, dy], buttons }) => {
        // Don't pan canvas when dragging a screen
        if (isDraggingScreen) return;

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
        scaleBounds: { min: 0.05, max: 5 },
        from: () => [transform.scale, 0],
      },
    }
  );

  // Prevent Safari gesture zoom
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
      scale: Math.min(prev.scale * 1.2, 5),
    }));
  };

  const handleZoomOut = () => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(prev.scale / 1.2, 0.05),
    }));
  };

  const handleReset = () => {
    setTransform({ x: 80, y: 80, scale: initialScale });
  };

  const handleFitContent = useCallback(() => {
    if (!containerRef.current || completedScreens.length === 0) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const padding = 100;

    // Calculate scale to fit all content
    const scaleX = (containerRect.width - padding * 2) / (bounds.width || 1);
    const scaleY = (containerRect.height - padding * 2) / (bounds.height || 1);
    const scale = Math.min(scaleX, scaleY, 1);

    // Center the content
    const x = (containerRect.width - bounds.width * scale) / 2 - bounds.minX * scale;
    const y = (containerRect.height - bounds.height * scale) / 2 - bounds.minY * scale;

    setTransform({ x, y, scale });
  }, [bounds, completedScreens.length]);

  // Calculate streaming screen position
  const getStreamingScreenPosition = () => {
    // Use GRID position if available (from parsed GRID section)
    if (currentStreamingGridCol !== undefined && currentStreamingGridRow !== undefined) {
      return { gridCol: currentStreamingGridCol, gridRow: currentStreamingGridRow };
    }
    // Fallback: Find max column and put new screen to the right
    let maxCol = -1;
    for (const screen of completedScreens) {
      maxCol = Math.max(maxCol, screen.gridCol ?? 0);
    }
    return { gridCol: maxCol + 1, gridRow: 0 };
  };

  return (
    <div className="h-full w-full bg-[#F0EDE8] overflow-hidden">
      <div className="h-full w-full overflow-hidden relative">
        {!hasScreens ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#E8E4E0] flex items-center justify-center mb-4">
              <PlatformIcon className="w-8 h-8 text-[#9A9A9A]" />
            </div>
            <h3 className="text-lg font-medium text-[#6B6B6B] mb-2">
              {isStreaming ? "Starting generation..." : "No screens yet"}
            </h3>
            <p className="text-sm text-[#9A9A9A] max-w-md">
              {isStreaming
                ? "The AI is preparing your prototype"
                : `Enter a prompt to generate your first ${platformLabel} prototype`}
            </p>
            {isStreaming && (
              <Loader2 className="w-8 h-8 text-[#B8956F] animate-spin mt-6" />
            )}
          </div>
        ) : (
          <>
            {/* Controls */}
            <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2 bg-white rounded-lg shadow-lg p-1 border border-[#E8E4E0]">
              {/* Reset positions (only show if there are overrides) */}
              {hasPositionOverrides && (
                <>
                  <button
                    onClick={handleResetPositions}
                    className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded transition-colors flex items-center gap-1"
                    title="Reset screen positions to original"
                  >
                    <Move className="w-4 h-4" />
                    <span className="text-xs font-medium">Reset</span>
                  </button>
                  <div className="w-px h-6 bg-[#E8E4E0]" />
                </>
              )}

              {/* Flow toggle */}
              <button
                onClick={() => setShowFlows(!showFlows)}
                className={`p-2 rounded transition-colors ${
                  showFlows
                    ? "text-purple-600 bg-purple-50"
                    : "text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#F5F2EF]"
                }`}
                title={showFlows ? "Hide flows" : "Show flows"}
              >
                <GitBranch className="w-4 h-4" />
              </button>

              <div className="w-px h-6 bg-[#E8E4E0]" />

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

            {/* Canvas */}
            <div ref={containerRef} className="w-full h-full touch-none">
              {/* Flow arrows layer (behind screens) */}
              <FlowConnections
                screens={completedScreens}
                platform={platform}
                showFlows={showFlows}
                transform={transform}
                positionOverrides={positionOverrides}
              />

              {/* Screens layer */}
              <div
                className="relative origin-top-left"
                style={{
                  transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                }}
              >
                {/* Completed screens */}
                {completedScreens.map((screen) => {
                  const { x, y } = gridToPixels(
                    screen.gridCol ?? 0,
                    screen.gridRow ?? 0,
                    platform
                  );
                  // Use ref for instant position updates during drag
                  const override = positionOverridesRef.current[screen.name] || { deltaX: 0, deltaY: 0 };

                  return (
                    <DraggableScreen
                      key={screen.name}
                      screenName={screen.name}
                      x={x}
                      y={y}
                      deltaX={override.deltaX}
                      deltaY={override.deltaY}
                      onDragStart={handleDragStart}
                      onDrag={handleDrag}
                      onDragEnd={handleDragEnd}
                      canvasScale={transform.scale}
                    >
                      {isMobilePlatform ? (
                        <PhoneMockupContent
                          screen={screen}
                          isEditing={editingScreenNames.has(screen.name)}
                          streamingHtml={getStreamingHtmlForScreen(
                            screen.name,
                            currentScreenName,
                            isEditingExistingScreen,
                            currentStreamingHtml
                          )}
                          isAdmin={isAdmin}
                        />
                      ) : (
                        <BrowserMockupContent
                          screen={screen}
                          isEditing={editingScreenNames.has(screen.name)}
                          streamingHtml={getStreamingHtmlForScreen(
                            screen.name,
                            currentScreenName,
                            isEditingExistingScreen,
                            currentStreamingHtml
                          )}
                          isAdmin={isAdmin}
                        />
                      )}
                    </DraggableScreen>
                  );
                })}

                {/* Currently streaming NEW screen */}
                {isStreaming &&
                  currentScreenName &&
                  currentStreamingHtml &&
                  !isEditingExistingScreen &&
                  (() => {
                    const streamingPos = getStreamingScreenPosition();
                    const { x, y } = gridToPixels(
                      streamingPos.gridCol,
                      streamingPos.gridRow,
                      platform
                    );

                    return isMobilePlatform ? (
                      <StreamingPositionedPhoneMockup
                        html={currentStreamingHtml}
                        screenName={currentScreenName}
                        x={x}
                        y={y}
                        gridCol={streamingPos.gridCol}
                        gridRow={streamingPos.gridRow}
                        isAdmin={isAdmin}
                      />
                    ) : (
                      <StreamingPositionedBrowserMockup
                        html={currentStreamingHtml}
                        screenName={currentScreenName}
                        x={x}
                        y={y}
                        gridCol={streamingPos.gridCol}
                        gridRow={streamingPos.gridRow}
                        isAdmin={isAdmin}
                      />
                    );
                  })()}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
