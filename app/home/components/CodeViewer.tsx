"use client";

import { useState } from "react";
import { Copy, Check, Download } from "lucide-react";
import Editor, { BeforeMount } from "@monaco-editor/react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import type { ParsedScreen } from "./StreamingScreenPreview";
import { toFileName } from "./CodeFileSidebar";

// Custom warm theme for mobile syntax highlighter (matches Monaco theme)
const mobileCodeTheme: { [key: string]: React.CSSProperties } = {
  'code[class*="language-"]': {
    color: "#1A1A1A",
    background: "#FAF8F5",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: "12px",
    lineHeight: "1.6",
  },
  'pre[class*="language-"]': {
    color: "#1A1A1A",
    background: "#FAF8F5",
    padding: "16px",
    margin: 0,
    overflow: "auto",
  },
  comment: { color: "#9A9A9A", fontStyle: "italic" },
  tag: { color: "#C4784F" },
  "attr-name": { color: "#B8956F" },
  "attr-value": { color: "#6B8E6B" },
  string: { color: "#6B8E6B" },
  keyword: { color: "#B8956F" },
  number: { color: "#B8956F" },
  punctuation: { color: "#6B6B6B" },
  operator: { color: "#6B6B6B" },
};

interface CodeViewerProps {
  screen: ParsedScreen | undefined;
  fileName: string | null;
  isMobileView?: boolean;
}

// Define custom warm theme for Monaco
const handleEditorWillMount: BeforeMount = (monaco) => {
  monaco.editor.defineTheme("opendesign-warm", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "9A9A9A", fontStyle: "italic" },
      { token: "keyword", foreground: "B8956F" },
      { token: "string", foreground: "6B8E6B" },
      { token: "number", foreground: "B8956F" },
      { token: "tag", foreground: "C4784F" },
      { token: "attribute.name", foreground: "B8956F" },
      { token: "attribute.value", foreground: "6B8E6B" },
      { token: "delimiter", foreground: "6B6B6B" },
      { token: "delimiter.html", foreground: "6B6B6B" },
      { token: "metatag", foreground: "9A9A9A" },
      { token: "metatag.content.html", foreground: "1A1A1A" },
    ],
    colors: {
      "editor.background": "#FAF8F5",
      "editor.foreground": "#1A1A1A",
      "editor.lineHighlightBackground": "#F5F2EF",
      "editor.selectionBackground": "#E8E4E0",
      "editor.inactiveSelectionBackground": "#F5F2EF",
      "editorLineNumber.foreground": "#9A9A9A",
      "editorLineNumber.activeForeground": "#6B6B6B",
      "editorCursor.foreground": "#B8956F",
      "editor.selectionHighlightBackground": "#E8E4E080",
      "editorIndentGuide.background": "#E8E4E0",
      "editorIndentGuide.activeBackground": "#D4CFC9",
      "scrollbarSlider.background": "#E8E4E080",
      "scrollbarSlider.hoverBackground": "#D4CFC9",
      "scrollbarSlider.activeBackground": "#B8956F80",
      "minimap.background": "#FAF8F5",
      "editorGutter.background": "#FAF8F5",
    },
  });
};

export function CodeViewer({ screen, fileName, isMobileView = false }: CodeViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!screen) return;
    await navigator.clipboard.writeText(screen.html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!screen || !fileName) return;
    const blob = new Blob([screen.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = toFileName(screen.name);
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!screen || !fileName) {
    return (
      <div className="flex-1 bg-[#FAF8F5] flex items-center justify-center">
        <p className="text-[#9A9A9A]">Select a file to view its code</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#FAF8F5] overflow-hidden min-h-0">
      {/* Tab bar - hidden on mobile since CodeView shows file selector */}
      {!isMobileView && (
        <div className="h-10 bg-white border-b border-[#E8E4E0] flex items-center px-3 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FAF8F5] border-b-2 border-b-[#B8956F] text-sm text-[#1A1A1A] font-medium rounded-t-lg">
            <span>{toFileName(screen.name)}</span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={handleCopy}
              className="p-1.5 text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#F5F2EF] rounded-lg transition-colors"
              title="Copy code"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={handleDownload}
              className="p-1.5 text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#F5F2EF] rounded-lg transition-colors"
              title="Download file"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Code display - lightweight pre for mobile, Monaco for desktop */}
      <div className={isMobileView ? "h-[calc(100vh-180px)] overflow-y-auto bg-[#FAF8F5]" : "flex-1 min-h-0 h-full overflow-hidden"}>
        {isMobileView ? (
          <SyntaxHighlighter
            language="html"
            style={mobileCodeTheme}
            customStyle={{
              margin: 0,
              padding: "16px",
              background: "#FAF8F5",
              fontSize: "12px",
              lineHeight: "1.6",
            }}
            wrapLongLines={true}
          >
            {screen.html}
          </SyntaxHighlighter>
        ) : (
          <Editor
            height="100%"
            language="html"
            theme="opendesign-warm"
            value={screen.html}
            beforeMount={handleEditorWillMount}
            options={{
              readOnly: true,
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              fontSize: 13,
              lineNumbers: "on",
              folding: true,
              wordWrap: "on",
              automaticLayout: true,
              scrollbar: {
                vertical: "visible",
                horizontal: "visible",
              },
              padding: { top: 16 },
            }}
          />
        )}
      </div>
    </div>
  );
}
