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
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { isModelAllowedForPlan, type PlanType } from "@/lib/constants/plans";

// Lazy initialization to avoid build-time errors
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(request: Request): Promise<Response> {
  const supabaseAdmin = getSupabaseAdmin();
  console.log("[Design Stream] POST request received");

  try {
    // ========================================================================
    // Authentication & Usage Quota Check
    // ========================================================================
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return new Response(
        JSON.stringify({ error: "Authentication required. Please sign in." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get user from database to check quota
    const { data: dbUser, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, plan, messages_remaining")
      .eq("clerk_id", clerkUserId)
      .single();

    if (userError || !dbUser) {
      console.error("[Design Stream] User lookup failed:", userError);
      return new Response(
        JSON.stringify({ error: "User not found. Please try signing out and back in." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get user's API key from headers FIRST (BYOK)
    // This check must happen BEFORE quota check - BYOK users are not subject to quota
    const userApiKey = request.headers.get("x-api-key");
    const userProvider = request.headers.get("x-provider") as "openrouter" | "gemini" | null;

    // Check if user has messages remaining - BUT only if they don't have their own API key
    // BYOK users can use the service without quota restrictions
    if (!userApiKey && dbUser.messages_remaining <= 0) {
      const upgradeMessage = dbUser.plan === "free"
        ? "You've used all your free messages this month. Upgrade to Pro for 50 messages/month!"
        : "You've used all your messages this month. Purchase more messages to continue.";

      return new Response(
        JSON.stringify({
          error: upgradeMessage,
          code: "QUOTA_EXCEEDED",
          plan: dbUser.plan,
          messagesRemaining: 0,
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    // Determine which API key to use
    // Priority: 1) User's BYOK key, 2) Platform key for users with quota
    const platformApiKey = process.env.OPENROUTER_API_KEY;
    const hasQuota = dbUser.messages_remaining > 0;

    let apiKey: string;
    let provider: "openrouter" | "gemini";
    let usingPlatformKey = false;

    if (userApiKey) {
      // User provided their own key (BYOK mode) - no quota consumed
      apiKey = userApiKey;
      provider = userProvider || "openrouter";
      console.log("[Design Stream] Using user's own API key (BYOK mode - no quota consumed)");
    } else if (hasQuota && platformApiKey) {
      // User has quota and platform key is available
      apiKey = platformApiKey;
      provider = "openrouter";
      usingPlatformKey = true;
    } else {
      return new Response(
        JSON.stringify({
          error: hasQuota
            ? "Platform API key not configured. Please contact support or use your own API key."
            : "You've used all your messages. Upgrade to Pro or configure your own API key in Settings.",
          code: hasQuota ? "PLATFORM_KEY_MISSING" : "QUOTA_EXCEEDED",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[Design Stream] Using ${usingPlatformKey ? "platform" : "user"} API key`);

    // Parse request body
    const { prompt, existingScreens, conversationHistory, platform, imageUrl, model: requestedModel } = await request.json();

    // ========================================================================
    // Model Access Check (Free users can only use Flash)
    // ========================================================================
    const userPlan = (dbUser.plan || "free") as PlanType;
    const modelToUse = requestedModel || "gemini-3-pro-preview";

    if (!isModelAllowedForPlan(modelToUse, userPlan) && !isModelAllowedForPlan(`google/${modelToUse}`, userPlan)) {
      return new Response(
        JSON.stringify({
          error: "This model is only available for Pro users. Please upgrade or use the Flash model.",
          code: "MODEL_RESTRICTED",
          plan: userPlan,
          requestedModel: modelToUse,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

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

    // Determine which model to use (default: gemini-3-pro-preview)
    const SUPPORTED_MODELS = ["gemini-3-pro-preview", "gemini-3-flash-preview"];
    const selectedModel = requestedModel && SUPPORTED_MODELS.includes(requestedModel)
      ? requestedModel
      : "gemini-3-pro-preview";

    console.log(`[Design Stream] Using model: ${selectedModel}`);

    // Create the appropriate model based on provider
    let model;

    if (provider === "gemini") {
      // Direct Google Gemini API
      const google = createGoogleGenerativeAI({
        apiKey: apiKey,
      });
      model = google(selectedModel);
    } else {
      // OpenRouter (default)
      const openrouter = createOpenRouter({
        apiKey: apiKey,
      });
      model = openrouter.chat(`google/${selectedModel}`);
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
            const modelName = provider === "gemini" ? selectedModel : `google/${selectedModel}`;

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

          // ================================================================
          // Decrement user's message quota after successful generation
          // ONLY when using platform key - BYOK users don't consume quota
          // ================================================================
          let updatedMessagesRemaining = dbUser.messages_remaining;

          if (usingPlatformKey) {
            try {
              const { error: decrementError } = await supabaseAdmin
                .from("users")
                .update({
                  messages_remaining: dbUser.messages_remaining - 1,
                })
                .eq("id", dbUser.id);

              if (decrementError) {
                console.error("[Design Stream] Failed to decrement messages:", decrementError);
              } else {
                updatedMessagesRemaining = dbUser.messages_remaining - 1;
                console.log(`[Design Stream] Decremented messages for user ${dbUser.id}. Remaining: ${updatedMessagesRemaining}`);
              }
            } catch (decrementErr) {
              console.error("[Design Stream] Error decrementing messages:", decrementErr);
            }
          } else {
            console.log("[Design Stream] Using BYOK - no quota consumed");
          }

          // Send updated quota info with completion signal
          const doneData = `data: ${JSON.stringify({
            done: true,
            messagesRemaining: Math.max(0, updatedMessagesRemaining),
          })}\n\n`;
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
