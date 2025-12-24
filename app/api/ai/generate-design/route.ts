/**
 * AI Design Generation API Route - Streaming SSE
 *
 * This endpoint generates UI designs (mobile and desktop) using AI with real-time streaming.
 * It supports BYOK (Bring Your Own Key) with two providers:
 * - OpenRouter: Access to multiple models (recommended)
 * - Google Gemini: Direct API access
 *
 * The user's API key is passed via headers and NEVER stored.
 *
 * Streaming Format (SSE):
 * - Each chunk: data: {"chunk": "html content"}\n\n
 * - Completion: data: {"done": true}\n\n
 * - Error: data: {"error": "message"}\n\n
 *
 * HTML Output Format:
 * <!-- SCREEN_START: Screen Name -->
 * ...html content...
 * <!-- SCREEN_END -->
 * <!-- SUMMARY: Brief description -->
 */

import { streamText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { SYSTEM_PROMPTS, type Platform } from "@/lib/prompts/system-prompts";

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(request: Request): Promise<Response> {
  console.log("[Design Stream] POST request received");

  try {
    // Get user's API key from headers (BYOK)
    const apiKey = request.headers.get("x-api-key");
    const provider = request.headers.get("x-provider") as "openrouter" | "gemini";

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key is required. Please configure your API key in Settings." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { prompt, existingScreens, conversationHistory, platform, imageUrl } = await request.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!platform || !["mobile", "desktop"].includes(platform)) {
      return new Response(
        JSON.stringify({ error: "Platform is required (mobile or desktop)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get the system prompt for this platform
    const systemPrompt = SYSTEM_PROMPTS[platform as Platform];

    console.log(`[Design Stream] Starting stream for: ${prompt.substring(0, 100)}...`);

    // Build the user prompt with context
    let userPrompt = prompt;
    if (existingScreens && existingScreens.length > 0) {
      // Build screen summary (names only)
      const screensSummary = existingScreens.map((s: { name: string }) => s.name).join(", ");

      // Build full HTML context for each screen
      const screensCode = existingScreens
        .map((s: { name: string; html: string }) => `\n=== ${s.name} ===\n${s.html}`)
        .join("\n");

      const platformLabel = platform === "mobile" ? "mobile app" : "website";
      userPrompt = `You are updating an existing ${platformLabel} design.

Current screens: ${screensSummary}

Here is the complete current HTML code for each screen:
${screensCode}

User's request: "${prompt}"

IMPORTANT:
- Use <!-- SCREEN_EDIT: Exact Screen Name --> when modifying an existing screen (use the EXACT same name)
- Use <!-- SCREEN_START: New Screen Name --> only when creating a NEW screen
- Always include the FULL updated HTML when editing
- Do NOT include PROJECT_NAME or PROJECT_ICON for follow-up requests`;
    }

    // Create the appropriate model based on provider
    let model;

    if (provider === "gemini") {
      // Direct Google Gemini API - use Gemini 3 Pro Preview
      const google = createGoogleGenerativeAI({
        apiKey: apiKey,
      });
      model = google("gemini-3-pro-preview");
    } else {
      // OpenRouter (default) - use Gemini 3 Pro Preview
      const openrouter = createOpenRouter({
        apiKey: apiKey,
      });
      model = openrouter.chat("google/gemini-3-pro-preview");
    }

    // Build messages array with support for multimodal content
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [];

    // Add conversation history for context (last 6 messages)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-6);
      for (const msg of recentHistory) {
        // Include images from history if present
        if (msg.role === "user" && msg.imageUrl) {
          messages.push({
            role: "user" as const,
            content: [
              { type: "text" as const, text: msg.content },
              { type: "image" as const, image: msg.imageUrl },
            ],
          });
        } else if (msg.role === "user") {
          messages.push({
            role: "user" as const,
            content: msg.content,
          });
        } else {
          messages.push({
            role: "assistant" as const,
            content: msg.content,
          });
        }
      }
    }

    // Add the current user message (with optional image)
    if (imageUrl) {
      console.log(`[Design Stream] Including reference image: ${imageUrl.substring(0, 80)}...`);
      messages.push({
        role: "user" as const,
        content: [
          { type: "text" as const, text: userPrompt },
          { type: "image" as const, image: imageUrl },
        ],
      });
    } else {
      messages.push({ role: "user" as const, content: userPrompt });
    }

    console.log("[Design Stream] Creating SSE stream...");

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let chunkCount = 0;

        try {
          // Use the AI SDK streaming with platform-specific prompt
          const result = streamText({
            model,
            system: systemPrompt,
            messages,
            temperature: 0.7,
          });

          // Stream the text response
          for await (const textPart of result.textStream) {
            chunkCount++;

            // Send chunk as SSE data
            const sseData = `data: ${JSON.stringify({ chunk: textPart })}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          }

          // Get token usage after streaming completes
          try {
            const usage = await result.usage;
            const modelName = provider === "gemini" ? "gemini-3-pro-preview" : "google/gemini-3-pro-preview";

            // Send usage data before completion signal
            const usageData = `data: ${JSON.stringify({
              usage: {
                inputTokens: usage.inputTokens || 0,
                outputTokens: usage.outputTokens || 0,
                cachedTokens: usage.cachedInputTokens || 0,
                totalTokens: usage.totalTokens || 0,
                model: modelName,
                provider: provider || "openrouter",
              }
            })}\n\n`;
            controller.enqueue(encoder.encode(usageData));

            console.log(`[Design Stream] Usage - Input: ${usage.inputTokens}, Output: ${usage.outputTokens}, Cached: ${usage.cachedInputTokens || 0}`);
          } catch (usageError) {
            console.error("[Design Stream] Failed to get usage:", usageError);
          }

          // Send completion signal
          const doneData = `data: ${JSON.stringify({ done: true })}\n\n`;
          controller.enqueue(encoder.encode(doneData));

          console.log(`[Design Stream] Completed with ${chunkCount} chunks`);
        } catch (error) {
          console.error("[Design Stream] Error:", error);
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          const errorData = `data: ${JSON.stringify({ error: errorMessage })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
        } finally {
          controller.close();
        }
      },
    });

    // Return SSE response
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("[Design Stream] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
