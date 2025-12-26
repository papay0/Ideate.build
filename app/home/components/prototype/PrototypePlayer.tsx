"use client";

/**
 * PrototypePlayer - Full-screen interactive prototype preview
 *
 * Displays the combined prototype HTML in a device frame,
 * allowing users to click through and test navigation.
 */

import { useEffect, useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Smartphone, Monitor, ExternalLink, Copy, Check, MousePointer2 } from "lucide-react";

interface PrototypePlayerProps {
  isOpen: boolean;
  onClose: () => void;
  prototypeHtml: string;
  platform: "mobile" | "desktop";
  projectName: string;
  prototypeUrl?: string | null;
}

export function PrototypePlayer({
  isOpen,
  onClose,
  prototypeHtml,
  platform,
  projectName,
  prototypeUrl,
}: PrototypePlayerProps) {
  const [copied, setCopied] = useState(false);
  const [showHotspots, setShowHotspots] = useState(true);
  const [scale, setScale] = useState(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const viewport = platform === "mobile"
    ? { width: 390, height: 844 }
    : { width: 1440, height: 900 };

  // Calculate scale to fit container
  useEffect(() => {
    const calculateScale = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const availableWidth = container.clientWidth - 48; // padding
      const availableHeight = container.clientHeight - 48;

      // Frame dimensions (content + frame chrome)
      const frameWidth = platform === "mobile" ? viewport.width + 24 : viewport.width;
      const frameHeight = platform === "mobile" ? viewport.height + 24 : viewport.height + 44;

      const scaleX = availableWidth / frameWidth;
      const scaleY = availableHeight / frameHeight;
      const newScale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 1

      setScale(newScale);
    };

    calculateScale();
    window.addEventListener("resize", calculateScale);
    return () => window.removeEventListener("resize", calculateScale);
  }, [isOpen, platform, viewport.width, viewport.height]);

  // Send hotspot toggle message to iframe
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'toggleHotspots', show: showHotspots },
        '*'
      );
    }
  }, [showHotspots]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleCopyLink = useCallback(async () => {
    if (!prototypeUrl) return;
    await navigator.clipboard.writeText(prototypeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [prototypeUrl]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col bg-black/90"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-black/50 backdrop-blur-sm border-b border-white/10">
            <div className="flex items-center gap-3">
              {platform === "mobile" ? (
                <Smartphone className="w-5 h-5 text-white/70" />
              ) : (
                <Monitor className="w-5 h-5 text-white/70" />
              )}
              <span className="text-white font-medium">{projectName}</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Click/Tap areas toggle */}
              <button
                onClick={() => setShowHotspots(!showHotspots)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  showHotspots
                    ? 'bg-purple-500/30 text-purple-300 hover:bg-purple-500/40'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
                title="Toggle clickable area highlights"
              >
                <MousePointer2 className="w-4 h-4" />
                <span className="hidden sm:inline">Click areas</span>
                <span className="sm:hidden">Tap areas</span>
              </button>

              {prototypeUrl && (
                <>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Link
                      </>
                    )}
                  </button>
                  <a
                    href={prototypeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open
                  </a>
                </>
              )}
              <button
                onClick={onClose}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Close (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Device Frame + Iframe */}
          <div ref={containerRef} className="flex-1 flex items-center justify-center p-6 overflow-hidden">
            <div
              className="flex items-center justify-center transition-transform duration-150"
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
                      // Send initial hotspot state after iframe loads
                      iframeRef.current?.contentWindow?.postMessage(
                        { type: 'toggleHotspots', show: showHotspots },
                        '*'
                      );
                    }}
                  />
                </MobileFrame>
              ) : (
                <BrowserFrame>
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
                      // Send initial hotspot state after iframe loads
                      iframeRef.current?.contentWindow?.postMessage(
                        { type: 'toggleHotspots', show: showHotspots },
                        '*'
                      );
                    }}
                  />
                </BrowserFrame>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Mobile phone frame wrapper
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
          <div className="rounded-[45px] overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// Browser window frame wrapper
function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {/* Browser window */}
      <div className="bg-[#2a2a2a] rounded-xl overflow-hidden shadow-2xl">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#3a3a3a] border-b border-[#444]">
          {/* Traffic lights */}
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          {/* URL bar */}
          <div className="flex-1 mx-4">
            <div className="bg-[#2a2a2a] rounded-md px-3 py-1.5 text-sm text-white/50 text-center">
              prototype preview
            </div>
          </div>
          {/* Spacer for symmetry */}
          <div className="w-16" />
        </div>

        {/* Page content */}
        <div className="overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
