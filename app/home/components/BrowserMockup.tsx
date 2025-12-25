"use client";

/**
 * BrowserMockup Component
 *
 * Displays generated HTML in a browser window mockup.
 * Used for desktop/website designs (1440x900 viewport).
 */

import { useRef, useState, useEffect, memo } from "react";
import { Loader2, Copy, Check, Camera } from "lucide-react";
import { PLATFORM_CONFIG } from "@/lib/constants/platforms";
import { captureElement, downloadBlob, toScreenFilename } from "@/lib/utils/screenshot";
import type { ParsedScreen } from "./StreamingScreenPreview";

const BROWSER_WIDTH = PLATFORM_CONFIG.desktop.width;
const BROWSER_HEIGHT = PLATFORM_CONFIG.desktop.height;

/**
 * Browser mockup that displays completed HTML
 * Uses stable iframe initialization to prevent flashing
 */
export const BrowserMockup = memo(function BrowserMockup({
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
  <meta name="viewport" content="width=${BROWSER_WIDTH}, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #ffffff;
      min-height: 100vh;
      width: ${BROWSER_WIDTH}px;
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
  <meta name="viewport" content="width=${BROWSER_WIDTH}, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #ffffff;
      min-height: 100vh;
      width: ${BROWSER_WIDTH}px;
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
    <div className="flex flex-col items-center gap-3 flex-shrink-0" data-screen-name={screen.name} data-mockup-type="browser">
      {/* Browser Frame */}
      <div
        ref={mockupRef}
        className={`relative bg-[#E8E4E0] rounded-xl overflow-hidden shadow-2xl transition-all duration-300 ${
          isEditing ? "ring-4 ring-blue-500/50 animate-pulse" : ""
        }`}
      >
        {/* Editing indicator badge */}
        {isEditing && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 bg-blue-500 text-white text-xs px-3 py-1 rounded-full flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Updating...
          </div>
        )}

        {/* Window Chrome */}
        <div className="h-10 bg-[#F5F2EF] border-b border-[#E8E4E0] flex items-center px-4">
          {/* Traffic lights */}
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
            <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
            <div className="w-3 h-3 rounded-full bg-[#28C840]" />
          </div>
        </div>

        {/* Browser Content */}
        <div style={{ width: BROWSER_WIDTH, height: BROWSER_HEIGHT }}>
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0"
            title={screen.name}
            sandbox="allow-scripts allow-same-origin"
            style={{ pointerEvents: "none" }}
          />
        </div>
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
 * Streaming browser mockup that shows HTML as it arrives
 * Uses incremental body updates to prevent flashing
 */
export const StreamingBrowserMockup = memo(function StreamingBrowserMockup({
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
  <meta name="viewport" content="width=${BROWSER_WIDTH}, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #ffffff;
      min-height: 100vh;
      width: ${BROWSER_WIDTH}px;
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
  <meta name="viewport" content="width=${BROWSER_WIDTH}, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #ffffff;
      min-height: 100vh;
      width: ${BROWSER_WIDTH}px;
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
      {/* Browser Frame */}
      <div className="relative bg-[#E8E4E0] rounded-xl overflow-hidden shadow-2xl">
        {/* Streaming indicator */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 bg-[#B8956F] text-white text-xs px-3 py-1 rounded-full flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          Generating {screenName}...
        </div>

        {/* Window Chrome */}
        <div className="h-10 bg-[#F5F2EF] border-b border-[#E8E4E0] flex items-center px-4">
          {/* Traffic lights */}
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
            <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
            <div className="w-3 h-3 rounded-full bg-[#28C840]" />
          </div>
        </div>

        {/* Window Content */}
        <div style={{ width: BROWSER_WIDTH, height: BROWSER_HEIGHT }}>
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0"
            title={screenName}
            sandbox="allow-scripts allow-same-origin"
            style={{ pointerEvents: "none" }}
          />
        </div>

        {/* Pulsing ring while streaming */}
        <div className="absolute inset-0 rounded-xl ring-4 ring-[#B8956F]/50 animate-pulse pointer-events-none" />
      </div>

      {/* Screen Label */}
      <span className="text-sm text-[#B8956F] font-medium">{screenName}</span>
    </div>
  );
});
