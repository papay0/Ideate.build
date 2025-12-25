"use client";

import { useState, useEffect } from "react";
import { ChevronDown, FileCode } from "lucide-react";
import type { ParsedScreen } from "./StreamingScreenPreview";
import { CodeFileSidebar } from "./CodeFileSidebar";
import { CodeViewer } from "./CodeViewer";
import { CodeViewToolbar } from "./CodeViewToolbar";

interface CodeViewProps {
  screens: ParsedScreen[];
  projectName: string;
  isMobileView?: boolean;
}

// Convert screen name to filename
function toFileName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-") + ".html";
}

export function CodeView({ screens, projectName, isMobileView = false }: CodeViewProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Auto-select first file when screens change
  useEffect(() => {
    if (screens.length > 0 && !selectedFile) {
      setSelectedFile(screens[0].name);
    }
    // If selected file was removed, select first available
    if (selectedFile && !screens.find((s) => s.name === selectedFile)) {
      setSelectedFile(screens.length > 0 ? screens[0].name : null);
    }
  }, [screens, selectedFile]);

  const selectedScreen = screens.find((s) => s.name === selectedFile);

  // Mobile layout
  if (isMobileView) {
    return (
      <div className="flex-1 flex flex-col bg-[#FAF8F5] overflow-hidden min-h-0">
        {/* Mobile toolbar: file selector + actions in one row */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[#E8E4E0] bg-white">
          {/* File dropdown selector */}
          <div className="relative flex-1 min-w-0">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 bg-[#F5F2EF] border border-[#E8E4E0] rounded-lg text-sm font-medium text-[#1A1A1A] w-full"
            >
              <FileCode className="w-4 h-4 text-[#6B6B6B] flex-shrink-0" />
              <span className="truncate flex-1 text-left">
                {selectedFile ? toFileName(selectedFile) : "Select file"}
              </span>
              <ChevronDown className={`w-4 h-4 text-[#6B6B6B] transition-transform flex-shrink-0 ${isDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E8E4E0] rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                {screens.map((screen) => (
                  <button
                    key={screen.name}
                    onClick={() => {
                      setSelectedFile(screen.name);
                      setIsDropdownOpen(false);
                    }}
                    className={`flex items-center gap-2 px-3 py-2.5 text-sm w-full text-left hover:bg-[#F5F2EF] transition-colors ${
                      selectedFile === screen.name ? "bg-[#F5F2EF] text-[#B8956F]" : "text-[#1A1A1A]"
                    }`}
                  >
                    <FileCode className="w-4 h-4 text-[#6B6B6B]" />
                    <span className="truncate">{toFileName(screen.name)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions - inline with file selector */}
          <CodeViewToolbar screens={screens} projectName={projectName} isMobileView={true} />
        </div>

        {/* Full-width code viewer */}
        <div className="flex-1 overflow-hidden min-h-0">
          <CodeViewer screen={selectedScreen} fileName={selectedFile} isMobileView={true} />
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="flex-1 flex flex-col bg-[#FAF8F5] overflow-hidden h-full">
      <CodeViewToolbar screens={screens} projectName={projectName} />
      <div className="flex-1 flex overflow-hidden min-h-0">
        <CodeFileSidebar
          screens={screens}
          selectedFile={selectedFile}
          onSelectFile={setSelectedFile}
        />
        <CodeViewer screen={selectedScreen} fileName={selectedFile} />
      </div>
    </div>
  );
}
