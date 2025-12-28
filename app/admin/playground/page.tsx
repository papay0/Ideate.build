"use client";

/**
 * Admin Playground - Model Comparison
 *
 * A beautiful side-by-side comparison tool for testing different AI models.
 * Designed for clean Twitter screenshots with elegant phone mockups.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Square, Check, Sparkles, Brain, Bot, Cpu, Zap, X, DollarSign } from "lucide-react";
import { AVAILABLE_MODELS, type ModelId } from "@/app/home/components/ModelSelector";
import { useUserSync } from "@/lib/hooks/useUserSync";
import { useRouter } from "next/navigation";

// ============================================================================
// Types
// ============================================================================

interface UsageData {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

interface GenerationResult {
  modelId: ModelId;
  modelName: string;
  html: string;
  isStreaming: boolean;
  isComplete: boolean;
  error?: string;
  usage?: UsageData;
  cost?: number;
}

// Pricing per 1M tokens (from OpenRouter - Dec 2025)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gemini-3-pro-preview": { input: 2.0, output: 12.0 },
  "gemini-3-flash-preview": { input: 0.5, output: 3.0 },
  "anthropic/claude-opus-4.5": { input: 5.0, output: 25.0 },
  "anthropic/claude-sonnet-4.5": { input: 3.0, output: 15.0 },
  "openai/gpt-5.2": { input: 2.5, output: 10.0 },
};

function calculateCost(modelId: string, usage: UsageData): number {
  const pricing = MODEL_PRICING[modelId] || { input: 0, output: 0 };
  const inputCost = (usage.inputTokens / 1_000_000) * pricing.input;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

// ============================================================================
// Phone Mockup Component
// ============================================================================

function PhoneMockup({
  result,
  index,
  showPrice,
}: {
  result: GenerationResult;
  index: number;
  showPrice: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const initializedRef = useRef(false);

  // Get icon for model
  const getModelIcon = (modelId: string) => {
    const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
    if (!model) return Cpu;
    return model.icon;
  };

  const Icon = getModelIcon(result.modelId);

  // Get accent color based on model provider
  const getAccentColor = (modelId: string) => {
    if (modelId.includes("claude")) return "#D97706"; // Amber for Anthropic
    if (modelId.includes("gpt") || modelId.includes("openai")) return "#10B981"; // Emerald for OpenAI
    return "#B8956F"; // Default accent for Gemini
  };

  const accentColor = getAccentColor(result.modelId);

  // Parse the HTML to extract first screen
  const extractFirstScreen = (rawHtml: string): string => {
    // Look for SCREEN_START or SCREEN_EDIT
    const screenMatch = rawHtml.match(
      /<!-- SCREEN_(?:START|EDIT): .+? -->([\s\S]*?)(?:<!-- SCREEN_END -->|$)/
    );
    if (screenMatch) {
      return screenMatch[1].trim();
    }
    // If no screen delimiter, try to extract just the HTML content
    // Remove comments and metadata
    let cleaned = rawHtml
      .replace(/<!-- PROJECT_NAME:.*?-->/g, "")
      .replace(/<!-- PROJECT_ICON:.*?-->/g, "")
      .replace(/<!-- MESSAGE:.*?-->/g, "")
      .replace(/<!-- GRID:[\s\S]*?-->/g, "")
      .trim();
    return cleaned;
  };

  // Initialize and update iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const html = extractFirstScreen(result.html);
    const doc = iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=390, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"><\/script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: white;
      min-height: 100%;
      width: 390px;
      overflow-x: hidden;
    }
    img { max-width: 100%; height: auto; }
    ::-webkit-scrollbar { width: 0; height: 0; }
  </style>
</head>
<body>${html}</body>
</html>`);
    doc.close();
  }, [result.html]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.23, 1, 0.32, 1] }}
      className="flex flex-col items-center gap-4"
    >
      {/* Model Name Badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 + 0.2 }}
        className="flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm"
        style={{
          backgroundColor: `${accentColor}10`,
          borderColor: `${accentColor}30`,
        }}
      >
        <Icon className="w-4 h-4" style={{ color: accentColor }} />
        <span
          className="font-semibold text-sm tracking-tight"
          style={{ color: accentColor }}
        >
          {result.modelName}
        </span>
        {result.isStreaming && (
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: accentColor }}
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
        {result.isComplete && !result.error && (
          <Check className="w-4 h-4" style={{ color: accentColor }} />
        )}
      </motion.div>

      {/* Phone Frame */}
      <div className="relative">
        {/* Phone bezel - thin */}
        <div
          className="relative rounded-[2rem] p-1.5 shadow-xl"
          style={{
            background: "linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)",
            boxShadow: `
              0 20px 40px -12px rgba(0, 0, 0, 0.35),
              0 0 0 1px rgba(255, 255, 255, 0.1) inset
            `,
          }}
        >
          {/* Screen area */}
          <div
            className="relative rounded-[1.5rem] overflow-hidden bg-white"
            style={{
              width: 234,
              height: 506,
            }}
          >
            {/* Dynamic Island - smaller */}
            <div
              className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-10"
            />

            {/* Content iframe */}
            {result.html ? (
              <iframe
                ref={iframeRef}
                className="w-full h-full border-0"
                style={{
                  transform: "scale(0.6)",
                  transformOrigin: "top left",
                  width: 390,
                  height: 844,
                }}
                title={result.modelName}
              />
            ) : result.isStreaming ? (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
                <div className="flex flex-col items-center gap-3">
                  <motion.div
                    className="w-8 h-8 rounded-full border-2 border-t-transparent"
                    style={{ borderColor: `${accentColor}40`, borderTopColor: "transparent" }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <span className="text-xs text-gray-400">Generating...</span>
                </div>
              </div>
            ) : result.error ? (
              <div className="w-full h-full flex items-center justify-center bg-red-50 p-4">
                <p className="text-xs text-red-500 text-center">{result.error}</p>
              </div>
            ) : (
              <SkeletonLoader />
            )}
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/30 rounded-full" />
        </div>

        {/* Subtle reflection */}
        <div
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-48 h-8 rounded-full opacity-20 blur-xl"
          style={{ backgroundColor: accentColor }}
        />
      </div>

      {/* Price Display */}
      {showPrice && result.isComplete && result.cost !== undefined && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 text-center"
        >
          <span className="text-lg font-semibold text-[#1A1A1A]">
            ${result.cost.toFixed(4)}
          </span>
          {result.usage && (
            <p className="text-xs text-[#9A9A9A] mt-1">
              {result.usage.inputTokens.toLocaleString()} in / {result.usage.outputTokens.toLocaleString()} out
            </p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// ============================================================================
// Skeleton Loader
// ============================================================================

function SkeletonLoader() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-gray-50 to-gray-100 p-4 pt-12">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-2 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Content skeletons */}
      <div className="space-y-4">
        <div className="h-32 bg-gray-200 rounded-xl animate-pulse" />
        <div className="flex gap-2">
          <div className="h-20 flex-1 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-20 flex-1 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
}

// ============================================================================
// Model Selector Checkbox
// ============================================================================

function ModelCheckbox({
  model,
  isSelected,
  onToggle,
}: {
  model: (typeof AVAILABLE_MODELS)[number];
  isSelected: boolean;
  onToggle: () => void;
}) {
  const Icon = model.icon;

  return (
    <button
      onClick={onToggle}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200
        ${isSelected
          ? "bg-[#B8956F]/10 border-[#B8956F] shadow-sm"
          : "bg-white border-[#E8E4E0] hover:border-[#B8956F]/50 hover:bg-[#FAF8F5]"
        }
      `}
    >
      <div
        className={`
          w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all
          ${isSelected ? "bg-[#B8956F] border-[#B8956F]" : "border-[#D4D4D4]"}
        `}
      >
        {isSelected && <Check className="w-3 h-3 text-white" />}
      </div>
      <Icon className={`w-4 h-4 ${isSelected ? "text-[#B8956F]" : "text-[#6B6B6B]"}`} />
      <div className="flex flex-col items-start">
        <span className={`text-sm font-medium ${isSelected ? "text-[#1A1A1A]" : "text-[#6B6B6B]"}`}>
          {model.name}
        </span>
        <span className="text-xs text-[#9A9A9A]">{model.description}</span>
      </div>
      {model.adminOnly && (
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#B8956F]/20 text-[#B8956F] font-medium">
          Admin
        </span>
      )}
    </button>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function PlaygroundPage() {
  const router = useRouter();
  const { dbUser, isLoading: isUserLoading } = useUserSync();

  // State
  const [prompt, setPrompt] = useState("");
  const [selectedModels, setSelectedModels] = useState<ModelId[]>([]);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPrices, setShowPrices] = useState(false);

  // Abort controllers for cancellation
  const abortControllersRef = useRef<AbortController[]>([]);

  // Auth check
  useEffect(() => {
    if (!isUserLoading && dbUser && dbUser.role !== "admin") {
      router.push("/home");
    }
  }, [dbUser, isUserLoading, router]);

  // Toggle model selection
  const toggleModel = (modelId: ModelId) => {
    setSelectedModels((prev) =>
      prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId]
    );
  };

  // Generate with all selected models
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || selectedModels.length === 0) return;

    setIsGenerating(true);
    setResults([]);

    // Initialize results for all selected models
    const initialResults: GenerationResult[] = selectedModels.map((modelId) => {
      const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
      return {
        modelId,
        modelName: model?.name || modelId,
        html: "",
        isStreaming: true,
        isComplete: false,
      };
    });
    setResults(initialResults);

    // Create abort controllers
    abortControllersRef.current = selectedModels.map(() => new AbortController());

    // Stream from each model in parallel
    const promises = selectedModels.map(async (modelId, index) => {
      try {
        const response = await fetch("/api/ai/generate-prototype", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            platform: "mobile",
            model: modelId,
          }),
          signal: abortControllersRef.current[index].signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Generation failed");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.chunk) {
                  setResults((prev) =>
                    prev.map((r) =>
                      r.modelId === modelId ? { ...r, html: r.html + data.chunk } : r
                    )
                  );
                }

                if (data.usage) {
                  const usage: UsageData = {
                    inputTokens: data.usage.inputTokens || 0,
                    outputTokens: data.usage.outputTokens || 0,
                    totalTokens: data.usage.totalTokens || 0,
                  };
                  const cost = calculateCost(modelId, usage);
                  setResults((prev) =>
                    prev.map((r) =>
                      r.modelId === modelId ? { ...r, usage, cost } : r
                    )
                  );
                }

                if (data.done) {
                  setResults((prev) =>
                    prev.map((r) =>
                      r.modelId === modelId ? { ...r, isStreaming: false, isComplete: true } : r
                    )
                  );
                }

                if (data.error) {
                  throw new Error(data.error);
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;

        setResults((prev) =>
          prev.map((r) =>
            r.modelId === modelId
              ? {
                  ...r,
                  isStreaming: false,
                  isComplete: true,
                  error: (error as Error).message,
                }
              : r
          )
        );
      }
    });

    await Promise.all(promises);
    setIsGenerating(false);
  }, [prompt, selectedModels]);

  // Cancel generation
  const handleCancel = () => {
    abortControllersRef.current.forEach((controller) => controller.abort());
    setIsGenerating(false);
    setResults((prev) =>
      prev.map((r) => (r.isStreaming ? { ...r, isStreaming: false, isComplete: true } : r))
    );
  };

  // Clear results
  const handleClear = () => {
    setResults([]);
    setPrompt("");
  };

  // Loading state
  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9]">
        <motion.div
          className="w-8 h-8 border-2 border-[#B8956F] border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  // Non-admin state
  if (!dbUser || dbUser.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9]">
        <p className="text-[#6B6B6B]">Access denied</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Header */}
      <div className="border-b border-[#E8E4E0] bg-white/50 backdrop-blur-sm sticky top-14 z-30">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-2xl text-[#1A1A1A] tracking-tight">
                Model Playground
              </h1>
              <p className="text-sm text-[#6B6B6B] mt-1">
                Compare AI model outputs side by side
              </p>
            </div>

            {results.length > 0 && (
              <div className="flex items-center gap-2">
                {/* Price Toggle */}
                <button
                  onClick={() => setShowPrices(!showPrices)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all ${
                    showPrices
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#F5F2EF]"
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  {showPrices ? "Hide Prices" : "Show Prices"}
                </button>

                <button
                  onClick={handleClear}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Input Section */}
        <div className="bg-white rounded-2xl border border-[#E8E4E0] shadow-sm p-6 mb-8">
          {/* Prompt Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the mobile app you want to generate..."
              className="w-full h-32 px-4 py-3 rounded-xl border border-[#E8E4E0] bg-[#FAFAF9]
                text-[#1A1A1A] placeholder-[#9A9A9A] resize-none
                focus:outline-none focus:ring-2 focus:ring-[#B8956F]/20 focus:border-[#B8956F]
                transition-all"
              disabled={isGenerating}
            />
          </div>

          {/* Model Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#1A1A1A] mb-3">
              Select Models to Compare
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {AVAILABLE_MODELS.map((model) => (
                <ModelCheckbox
                  key={model.id}
                  model={model}
                  isSelected={selectedModels.includes(model.id)}
                  onToggle={() => toggleModel(model.id)}
                />
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={isGenerating ? handleCancel : handleGenerate}
              disabled={!isGenerating && (!prompt.trim() || selectedModels.length === 0)}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all
                ${isGenerating
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-[#B8956F] hover:bg-[#A07850] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                }
              `}
            >
              {isGenerating ? (
                <>
                  <Square className="w-4 h-4" />
                  Stop Generation
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Generate with {selectedModels.length} model{selectedModels.length !== 1 ? "s" : ""}
                </>
              )}
            </button>

            {selectedModels.length === 0 && !isGenerating && (
              <p className="text-sm text-[#9A9A9A]">Select at least one model to compare</p>
            )}
          </div>
        </div>

        {/* Results - Horizontal Row */}
        <AnimatePresence mode="wait">
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pb-16 overflow-x-auto"
            >
              <div className="flex gap-8 justify-center items-start min-w-max px-4">
                {results.map((result, index) => (
                  <PhoneMockup key={result.modelId} result={result} index={index} showPrice={showPrices} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {results.length === 0 && !isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-[#F5F2EF] flex items-center justify-center mb-6">
              <Sparkles className="w-8 h-8 text-[#B8956F]" />
            </div>
            <h3 className="font-serif text-xl text-[#1A1A1A] mb-2">Ready to Compare</h3>
            <p className="text-[#6B6B6B] max-w-md">
              Enter a prompt and select the models you want to compare. Results will appear here as beautiful phone mockups.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
