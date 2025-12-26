"use client";

/**
 * PrototypeViewer - Client component for public prototype viewing
 *
 * Displays the prototype with:
 * - Slim header: OpenDesign branding + hotspot toggle
 * - Desktop: edge-to-edge, scaled to fit viewport
 * - Mobile: phone frame, scaled to fit
 * - Dark background
 */

import { useState, useRef, useEffect } from "react";
import { MousePointer2 } from "lucide-react";

interface PrototypeViewerProps {
  prototypeHtml: string;
  platform: "mobile" | "desktop";
  projectName: string;
  projectIcon?: string | null;
}

// Header height in pixels (py-3 = 12px * 2 + content ~28px)
const HEADER_HEIGHT = 52;

export function PrototypeViewer({
  prototypeHtml,
  platform,
  projectName,
}: PrototypeViewerProps) {
  const [showHotspots, setShowHotspots] = useState(true);
  const [scale, setScale] = useState(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const viewport =
    platform === "mobile"
      ? { width: 390, height: 844 }
      : { width: 1440, height: 900 };

  // Calculate scale to fit viewport
  useEffect(() => {
    function calculateScale() {
      const availableHeight = window.innerHeight - HEADER_HEIGHT - 48; // 48px total padding
      const availableWidth = window.innerWidth - 48; // 48px total padding

      // Phone frame dimensions: p-3 (12px) padding + rounded corners + buttons
      // Total adds ~30px on width and height
      const frameExtraWidth = platform === "mobile" ? 30 : 0;
      const frameExtraHeight = platform === "mobile" ? 30 : 0;

      const contentWidth = viewport.width + frameExtraWidth;
      const contentHeight = viewport.height + frameExtraHeight;

      const scaleX = availableWidth / contentWidth;
      const scaleY = availableHeight / contentHeight;

      // Use the smaller scale to ensure it fits, max 1
      const newScale = Math.min(scaleX, scaleY, 1);
      setScale(Math.max(newScale, 0.3)); // Minimum 30% scale
    }

    calculateScale();
    window.addEventListener("resize", calculateScale);
    return () => window.removeEventListener("resize", calculateScale);
  }, [platform, viewport.width, viewport.height]);

  // Send hotspot toggle message to iframe
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: "toggleHotspots", show: showHotspots },
        "*"
      );
    }
  }, [showHotspots]);

  return (
    <div className="h-screen bg-[#0a0a0a] flex flex-col overflow-hidden">
      {/* Slim Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#111] border-b border-white/10 flex-shrink-0">
        {/* Left: Branding */}
        <a
          href="https://opendesign.build"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
        >
          <img
            src="/logo.svg"
            alt="OpenDesign"
            className="w-6 h-6 rounded-md"
          />
          <span className="text-sm font-medium">
            Made with <span className="text-white">OpenDesign</span>
          </span>
        </a>

        {/* Right: Hotspot toggle */}
        <button
          onClick={() => setShowHotspots(!showHotspots)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            showHotspots
              ? "bg-purple-500/30 text-purple-300"
              : "bg-white/10 text-white/60 hover:bg-white/15"
          }`}
        >
          <MousePointer2 className="w-4 h-4" />
          <span className="hidden sm:inline">Show clickable areas</span>
          <span className="sm:hidden">Hotspots</span>
        </button>
      </header>

      {/* Prototype Display */}
      <main
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-hidden"
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          {platform === "mobile" ? (
            <MobileFrame>
              <iframe
                ref={iframeRef}
                srcDoc={prototypeHtml}
                style={{
                  width: viewport.width,
                  height: viewport.height,
                  border: "none",
                  backgroundColor: "white",
                }}
                title={`${projectName} Prototype`}
                sandbox="allow-scripts allow-same-origin"
                onLoad={() => {
                  iframeRef.current?.contentWindow?.postMessage(
                    { type: "toggleHotspots", show: showHotspots },
                    "*"
                  );
                }}
              />
            </MobileFrame>
          ) : (
            <DesktopView>
              <iframe
                ref={iframeRef}
                srcDoc={prototypeHtml}
                style={{
                  width: viewport.width,
                  height: viewport.height,
                  border: "none",
                  backgroundColor: "white",
                }}
                title={`${projectName} Prototype`}
                sandbox="allow-scripts allow-same-origin"
                onLoad={() => {
                  iframeRef.current?.contentWindow?.postMessage(
                    { type: "toggleHotspots", show: showHotspots },
                    "*"
                  );
                }}
              />
            </DesktopView>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * Mobile phone frame wrapper
 * Shows a realistic iPhone-style frame around the prototype
 */
function MobileFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {/* Phone outer shell */}
      <div
        className="relative bg-[#1a1a1a] rounded-[55px] p-3 shadow-2xl"
        style={{
          boxShadow: "0 0 0 2px #333, 0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Side buttons */}
        <div className="absolute left-[-2px] top-[100px] w-[3px] h-[30px] bg-[#333] rounded-l-sm" />
        <div className="absolute left-[-2px] top-[150px] w-[3px] h-[60px] bg-[#333] rounded-l-sm" />
        <div className="absolute left-[-2px] top-[220px] w-[3px] h-[60px] bg-[#333] rounded-l-sm" />
        <div className="absolute right-[-2px] top-[150px] w-[3px] h-[80px] bg-[#333] rounded-r-sm" />

        {/* Screen area with notch */}
        <div className="relative bg-black rounded-[45px] overflow-hidden">
          {/* Dynamic Island / Notch */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[120px] h-[35px] bg-black rounded-full z-10" />

          {/* Screen content */}
          <div className="rounded-[45px] overflow-hidden">{children}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Desktop view wrapper
 * Edge-to-edge display with subtle border
 */
function DesktopView({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10">
      {children}
    </div>
  );
}
