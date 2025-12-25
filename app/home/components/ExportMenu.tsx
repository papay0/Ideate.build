"use client";

/**
 * ExportMenu Component
 *
 * Dropdown menu for bulk export options:
 * - Export All (ZIP): Individual PNGs + combined image in a ZIP file
 * - Export Combined: All screens stitched side-by-side in one PNG
 */

import { useState, useRef, useEffect } from "react";
import { Download, Loader2, Images, FileArchive, ChevronDown } from "lucide-react";
import type { ParsedScreen } from "./StreamingScreenPreview";
import type { Platform } from "@/lib/constants/platforms";
import {
  captureElement,
  downloadBlob,
  downloadAsZip,
  combineImagesHorizontally,
  toScreenFilename,
} from "@/lib/utils/screenshot";

interface ExportMenuProps {
  screens: ParsedScreen[];
  projectName: string;
  platform: Platform;
}

export function ExportMenu({ screens, projectName, platform }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState<"zip" | "combined" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Find and capture actual rendered mockups from the DOM
  const captureAllScreens = async (): Promise<{ blob: Blob; filename: string }[]> => {
    const results: { blob: Blob; filename: string }[] = [];

    // Find all mockup elements in the DOM by their data attributes
    for (const screen of screens) {
      const mockupWrapper = document.querySelector(
        `[data-screen-name="${screen.name}"][data-mockup-type]`
      );

      if (mockupWrapper) {
        // Find the actual mockup frame (first child div with the ref)
        const mockupFrame = mockupWrapper.querySelector(
          '[class*="bg-[#1A1A1A]"], [class*="bg-[#E8E4E0]"]'
        ) as HTMLElement;

        if (mockupFrame) {
          try {
            const blob = await captureElement(mockupFrame, { scale: 2 });
            results.push({
              blob,
              filename: toScreenFilename(screen.name),
            });
          } catch (error) {
            console.error(`Failed to capture screen ${screen.name}:`, error);
          }
        }
      }
    }

    return results;
  };

  // Export all screens as ZIP (includes individual PNGs + combined)
  const handleExportZip = async () => {
    if (exporting || screens.length === 0) return;
    setExporting("zip");
    setIsOpen(false);

    try {
      const files = await captureAllScreens();
      if (files.length > 0) {
        // Create combined image
        const blobs = files.map((f) => f.blob);
        const combinedBlob = await combineImagesHorizontally(blobs, 60);

        // Add combined image to files
        const safeName = projectName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        const allFiles = [
          ...files,
          { blob: combinedBlob, filename: `${safeName}-combined.png` },
        ];

        await downloadAsZip(allFiles, `${safeName}-screens.zip`);
      }
    } catch (error) {
      console.error("Failed to export ZIP:", error);
    } finally {
      setExporting(null);
    }
  };

  // Export combined image only
  const handleExportCombined = async () => {
    if (exporting || screens.length === 0) return;
    setExporting("combined");
    setIsOpen(false);

    try {
      const files = await captureAllScreens();
      if (files.length > 0) {
        const blobs = files.map((f) => f.blob);
        const combinedBlob = await combineImagesHorizontally(blobs, 60);
        const safeName = projectName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        downloadBlob(combinedBlob, `${safeName}-combined.png`);
      }
    } catch (error) {
      console.error("Failed to export combined image:", error);
    } finally {
      setExporting(null);
    }
  };

  const isDisabled = screens.length === 0 || exporting !== null;

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDisabled}
        className="flex items-center gap-2 px-3 py-2.5 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] bg-white hover:bg-[#F5F2EF] rounded-lg border border-[#E8E4E0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {exporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span>Export</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-[#E8E4E0] py-1 min-w-[200px] z-50">
          <button
            onClick={handleExportZip}
            disabled={isDisabled}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#F5F2EF] transition-colors disabled:opacity-50"
          >
            <FileArchive className="w-4 h-4" />
            <div className="text-left">
              <div className="font-medium">Export All (ZIP)</div>
              <div className="text-xs text-[#9A9A9A]">
                {screens.length} PNG{screens.length !== 1 ? "s" : ""} + combined
              </div>
            </div>
          </button>
          <button
            onClick={handleExportCombined}
            disabled={isDisabled}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#F5F2EF] transition-colors disabled:opacity-50"
          >
            <Images className="w-4 h-4" />
            <div className="text-left">
              <div className="font-medium">Export Combined</div>
              <div className="text-xs text-[#9A9A9A]">
                All screens side-by-side
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
