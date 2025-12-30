/**
 * AI Prototype Generation API Route - Streaming SSE
 *
 * This endpoint generates interactive prototypes using AI with real-time streaming.
 * It's similar to the design generation but uses prototype-specific prompts that:
 * - Include navigation rules (data-flow attributes)
 * - Use GRID section for position metadata: ScreenName: [col,row,isRoot]
 * - Mark one screen with isRoot=1 as entry point
 * - Allow scrollable content
 * - Support screen deletion by omitting from GRID
 *
 * Streaming Format (SSE):
 * - Each chunk: data: {"chunk": "html content"}\n\n
 * - Completion: data: {"done": true}\n\n
 * - Error: data: {"error": "message"}\n\n
 */

import { streamText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getPrototypeSystemPrompt, type PrototypePlatform } from "@/lib/prompts/prototype-prompts";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { isModelAllowedForPlan, isAdminOnlyModel, PLANS, type PlanType } from "@/lib/constants/plans";
import { logAuditEvent } from "@/lib/audit/log-event";

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
  console.log("[Prototype Stream] POST request received");

  try {
    // ========================================================================
    // Authentication & Admin Check
    // ========================================================================
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return new Response(
        JSON.stringify({ error: "Authentication required. Please sign in." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get user from database
    const { data: dbUser, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, plan, messages_remaining, bonus_messages_remaining, messages_reset_at, name, role")
      .eq("clerk_id", clerkUserId)
      .single();

    if (userError || !dbUser) {
      console.error("[Prototype Stream] User lookup failed:", userError);
      return new Response(
        JSON.stringify({ error: "User not found. Please try signing out and back in." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // Auto-reset monthly messages if 30+ days have passed
    // ========================================================================
    if (dbUser.plan === "pro" && dbUser.messages_reset_at) {
      const resetDate = new Date(dbUser.messages_reset_at);
      const now = new Date();
      const daysSinceReset = Math.floor((now.getTime() - resetDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceReset >= 30) {
        console.log(`[Prototype Stream] Auto-resetting messages for user ${dbUser.id}`);
        const messagesPerMonth = PLANS.pro.messagesPerMonth;

        const { error: resetError } = await supabaseAdmin
          .from("users")
          .update({
            messages_remaining: messagesPerMonth,
            messages_reset_at: now.toISOString(),
          })
          .eq("id", dbUser.id);

        if (!resetError) {
          dbUser.messages_remaining = messagesPerMonth;
          dbUser.messages_reset_at = now.toISOString();
        }
      }
    }

    // Get user's API key from headers (BYOK)
    const userApiKey = request.headers.get("x-api-key");
    const userProvider = request.headers.get("x-provider") as "openrouter" | "gemini" | null;

    // Check quota (only if not BYOK)
    const bonusRemaining = dbUser.bonus_messages_remaining || 0;
    if (!userApiKey && dbUser.messages_remaining <= 0 && bonusRemaining <= 0) {
      await logAuditEvent({
        userId: dbUser.id,
        eventType: 'QUOTA_EXCEEDED',
        metadata: {
          plan: dbUser.plan as 'free' | 'pro',
          messagesRemaining: dbUser.messages_remaining,
          bonusRemaining: bonusRemaining,
        },
        request,
      });

      return new Response(
        JSON.stringify({
          error: "You've used all your messages. Configure your own API key or purchase more.",
          code: "QUOTA_EXCEEDED",
          plan: dbUser.plan,
          messagesRemaining: 0,
          bonusMessagesRemaining: 0,
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    // Determine API key to use
    const platformApiKey = process.env.OPENROUTER_API_KEY;
    const hasQuota = dbUser.messages_remaining > 0 || bonusRemaining > 0;

    let apiKey: string;
    let provider: "openrouter" | "gemini";
    let usingPlatformKey = false;

    if (userApiKey) {
      apiKey = userApiKey;
      provider = userProvider || "openrouter";
      console.log("[Prototype Stream] Using user's own API key (BYOK mode)");
    } else if (hasQuota && platformApiKey) {
      apiKey = platformApiKey;
      provider = "openrouter";
      usingPlatformKey = true;
    } else {
      return new Response(
        JSON.stringify({
          error: hasQuota
            ? "Platform API key not configured."
            : "You've used all your messages.",
          code: hasQuota ? "PLATFORM_KEY_MISSING" : "QUOTA_EXCEEDED",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { prompt, existingScreens, conversationHistory, platform, imageUrls, model: requestedModel, projectId } = await request.json();

    // Debug: Log received prompt with mentions
    console.log("=== BACKEND MENTION DEBUG ===");
    console.log("Received prompt:", prompt);
    console.log("Existing screens:", existingScreens?.map((s: any) => ({ name: s.name, id: s.id })));
    console.log("=============================");

    // Model access check
    const userPlan = (dbUser.plan || "free") as PlanType;
    const isUserAdmin = dbUser.role === "admin";
    const modelToUse = requestedModel || "gemini-3-pro-preview";

    // Check if model is admin-only
    if (isAdminOnlyModel(modelToUse) && !isUserAdmin) {
      return new Response(
        JSON.stringify({
          error: "This model is only available for admin users.",
          code: "ADMIN_MODEL_RESTRICTED",
          requestedModel: modelToUse,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check plan-based model access (skip for BYOK and admin users)
    if (!userApiKey && !isUserAdmin && !isModelAllowedForPlan(modelToUse, userPlan) && !isModelAllowedForPlan(`google/${modelToUse}`, userPlan)) {
      return new Response(
        JSON.stringify({
          error: "This model is only available for Pro users.",
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

    // Get the PROTOTYPE system prompt (different from design)
    const userFirstName = dbUser?.name?.split(" ")[0] || null;
    const systemPrompt = getPrototypeSystemPrompt(platform as PrototypePlatform, userFirstName);

    console.log(`[Prototype Stream] Starting stream for: ${prompt.substring(0, 100)}...`);

    // Build the user prompt with context
    let userPrompt = prompt;
    if (existingScreens && existingScreens.length > 0) {
      // Build GRID representation of current screens
      const currentGrid = existingScreens
        .map((s: { name: string; gridCol?: number; gridRow?: number; isRoot?: boolean }) =>
          `${s.name}: [${s.gridCol || 0},${s.gridRow || 0},${s.isRoot ? 1 : 0}]`
        )
        .join("\n");

      const screensCode = existingScreens
        .map((s: { name: string; html: string; gridCol?: number; gridRow?: number; isRoot?: boolean }) =>
          `\n=== ${s.name} ===\n${s.html}`
        )
        .join("\n");

      const platformLabel = platform === "mobile" ? "mobile app" : "website";
      userPrompt = `You are updating an existing ${platformLabel} prototype.

Current GRID (ScreenName: [col,row,isRoot]):
${currentGrid}

Here is the complete current HTML code for each screen:
${screensCode}

User's request: "${prompt}"

IMPORTANT - OUTPUT FORMAT:
1. Start with a <!-- GRID: ... --> section listing ALL screens that should exist after your changes
   - Include existing screens you're keeping (with their original positions)
   - Include new screens you're adding (with appropriate adjacent positions)
   - OMIT any screens the user wants deleted (they will be removed automatically)

2. Use <!-- SCREEN_EDIT: Exact Screen Name --> when modifying an existing screen
3. Use <!-- SCREEN_START: New Screen Name --> when creating a NEW screen
4. Positions come from GRID, not from SCREEN_START/SCREEN_EDIT

5. Do NOT include PROJECT_NAME or PROJECT_ICON for follow-up requests
6. Ensure all navigation uses data-flow attributes`;
    }

    // Model selection
    const SUPPORTED_MODELS = [
      "gemini-3-pro-preview",
      "gemini-3-flash-preview",
      "anthropic/claude-opus-4.5",
      "anthropic/claude-sonnet-4.5",
      "openai/gpt-5.2",
    ];
    const selectedModel = requestedModel && SUPPORTED_MODELS.includes(requestedModel)
      ? requestedModel
      : "gemini-3-pro-preview";

    console.log(`[Prototype Stream] Using model: ${selectedModel}`);

    // Create model instance
    let model;
    const isGeminiModel = selectedModel.startsWith("gemini");

    if (provider === "gemini" && isGeminiModel) {
      // Direct Gemini API (only for Gemini models)
      const google = createGoogleGenerativeAI({ apiKey });
      model = google(selectedModel);
    } else {
      // OpenRouter for all other cases
      const openrouter = createOpenRouter({ apiKey });
      // Gemini models need google/ prefix, others already have provider prefix
      const openrouterModelId = isGeminiModel ? `google/${selectedModel}` : selectedModel;
      model = openrouter.chat(openrouterModelId);
    }

    // Build messages array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [];

    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-6);
      for (const msg of recentHistory) {
        // Handle messages with images (supports both old imageUrl and new imageUrls)
        const msgImageUrls = msg.imageUrls?.length ? msg.imageUrls : (msg.imageUrl ? [msg.imageUrl] : []);

        if (msg.role === "user" && msgImageUrls.length > 0) {
          messages.push({
            role: "user" as const,
            content: [
              { type: "text" as const, text: msg.content },
              ...msgImageUrls.map((url: string) => ({ type: "image" as const, image: url })),
            ],
          });
        } else if (msg.role === "user") {
          messages.push({ role: "user" as const, content: msg.content });
        } else {
          messages.push({ role: "assistant" as const, content: msg.content });
        }
      }
    }

    if (imageUrls && imageUrls.length > 0) {
      console.log(`[Prototype Stream] Including ${imageUrls.length} reference image(s)`);
      messages.push({
        role: "user" as const,
        content: [
          { type: "text" as const, text: userPrompt },
          ...imageUrls.map((url: string) => ({ type: "image" as const, image: url })),
        ],
      });
    } else {
      messages.push({ role: "user" as const, content: userPrompt });
    }

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let chunkCount = 0;

        try {
          const result = streamText({
            model,
            system: systemPrompt,
            messages,
            temperature: 0.7,
            // No maxTokens - let model use its full capacity
          });

          for await (const textPart of result.textStream) {
            chunkCount++;
            const sseData = `data: ${JSON.stringify({ chunk: textPart })}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          }

          // Get token usage
          try {
            const usage = await result.usage;
            // For logging: Gemini models get google/ prefix when using OpenRouter, others keep their provider prefix
            const modelName = provider === "gemini" && isGeminiModel
              ? selectedModel
              : (isGeminiModel ? `google/${selectedModel}` : selectedModel);

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
          } catch (usageError) {
            console.error("[Prototype Stream] Failed to get usage:", usageError);
          }

          // Decrement quota if using platform key
          let updatedMessagesRemaining = dbUser.messages_remaining;
          let updatedBonusRemaining = bonusRemaining;

          if (usingPlatformKey) {
            try {
              if (dbUser.messages_remaining > 0) {
                const { error: decrementError } = await supabaseAdmin
                  .from("users")
                  .update({ messages_remaining: dbUser.messages_remaining - 1 })
                  .eq("id", dbUser.id);

                if (!decrementError) {
                  updatedMessagesRemaining = dbUser.messages_remaining - 1;
                }
              } else if (bonusRemaining > 0) {
                const { error: decrementError } = await supabaseAdmin
                  .from("users")
                  .update({ bonus_messages_remaining: bonusRemaining - 1 })
                  .eq("id", dbUser.id);

                if (!decrementError) {
                  updatedBonusRemaining = bonusRemaining - 1;
                }
              }
            } catch (decrementErr) {
              console.error("[Prototype Stream] Error decrementing messages:", decrementErr);
            }
          }

          const doneData = `data: ${JSON.stringify({
            done: true,
            messagesRemaining: Math.max(0, updatedMessagesRemaining),
            bonusMessagesRemaining: Math.max(0, updatedBonusRemaining),
          })}\n\n`;
          controller.enqueue(encoder.encode(doneData));

          console.log(`[Prototype Stream] Completed with ${chunkCount} chunks`);

          // Log audit event
          logAuditEvent({
            userId: dbUser.id,
            eventType: 'DESIGN_GENERATED',
            metadata: {
              projectId: projectId || 'unknown',
              model: selectedModel,
              provider: provider || 'openrouter',
              usingBYOK: !usingPlatformKey,
            },
          }).catch(() => {});
        } catch (error) {
          console.error("[Prototype Stream] Error:", error);
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          const errorData = `data: ${JSON.stringify({ error: errorMessage })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("[Prototype Stream] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
