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

// ============================================================================
// System Prompt
// Instructs the AI how to generate UI designs (mobile and desktop)
// ============================================================================

const SYSTEM_PROMPT = `You are an expert mobile app UI designer creating stunning, production-quality designs. Generate beautiful HTML+Tailwind CSS screens while having a brief conversation with the user.

COMMUNICATION - Use these comment delimiters IN THIS EXACT ORDER:
1. <!-- PROJECT_NAME: Name --> MUST come FIRST (only on first generation)
2. <!-- PROJECT_ICON: emoji --> MUST come SECOND, right after name (only on first generation, e.g. 🍳 for cooking, 💪 for fitness, 📚 for reading)
3. <!-- MESSAGE: text --> to communicate with the user (after name/icon, between screens, at end)
4. <!-- SCREEN_START: Screen Name --> for NEW screens, <!-- SCREEN_EDIT: Exact Screen Name --> for EDITING existing screens
5. <!-- SCREEN_END --> to mark the end of each screen

IMPORTANT FOR EDITS:
- When user asks to modify an existing screen, use <!-- SCREEN_EDIT: Exact Screen Name --> with the EXACT same name
- When creating new screens, use <!-- SCREEN_START: Screen Name -->
- Always include the FULL updated HTML when editing a screen

CRITICAL OUTPUT RULES:
1. Output ONLY raw HTML and comment delimiters - NO markdown, NO backticks, NO code blocks
2. Generate 3-5 essential screens for a complete app experience
3. The HTML will be streamed and rendered in real-time in phone mockups
4. On first generation, ALWAYS start with PROJECT_NAME then PROJECT_ICON before anything else

DESIGN QUALITY - THIS IS THE MOST IMPORTANT:
- Create VISUALLY STUNNING designs that look like real production apps
- Use modern design trends: gradients, glassmorphism, soft shadows, rounded corners
- Beautiful color schemes - pick a cohesive palette with primary, secondary, and accent colors
- Rich visual hierarchy with varied font sizes (text-3xl for titles, text-sm for captions)
- Generous whitespace and padding (p-6, space-y-6, gap-4)
- Subtle depth with shadows (shadow-lg, shadow-xl) and layered elements
- Smooth visual flow guiding the eye through content

HTML/CSS RULES:
- Use Tailwind CSS classes extensively for ALL styling
- NO React, NO JavaScript, NO event handlers - pure static HTML
- Include realistic placeholder content (names, dates, numbers, descriptions)

IMAGES - CRITICAL:
- ONLY use picsum.photos: https://picsum.photos/seed/{unique-seed}/{width}/{height}
- Use unique seeds per image (e.g., seed/profile1, seed/hero-main, seed/food-1)
- NEVER use placeholder.com, unsplash.com, or other services

ICONS - Use inline SVG:
<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="..."></path></svg>
Or use emoji: ❤️ 🏠 👤 ⚙️ 🔔

MOBILE SCREEN STRUCTURE (390x844 viewport - design for this FIXED size):
<div class="min-h-screen bg-gradient-to-b from-[color] to-[color]">
  <!-- Header with top padding for status bar -->
  <header class="pt-14 px-6 pb-4">...</header>

  <!-- Main content - keep content concise, fits in ~600px visible area -->
  <main class="px-6 pb-24">...</main>

  <!-- Bottom navigation (fixed) -->
  <nav class="fixed bottom-0 left-0 right-0 bg-white border-t px-6 py-3">...</nav>
</div>

IMPORTANT: Design for a FIXED 390x844 phone viewport. Keep content concise and focused - don't create excessively long scrolling pages. Each screen should feel complete within approximately one viewport height.

EXAMPLE OUTPUT (notice the order - name and icon FIRST):
<!-- PROJECT_NAME: Culinary Canvas -->
<!-- PROJECT_ICON: 🍳 -->
<!-- MESSAGE: I'll create a beautiful recipe app with a warm, appetizing design! -->
<!-- SCREEN_START: Home -->
<div class="min-h-screen bg-gradient-to-b from-orange-50 to-white">
  <header class="pt-14 px-6 pb-4">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-orange-600">Good morning</p>
        <h1 class="text-2xl font-bold text-gray-900">What's cooking?</h1>
      </div>
      <img src="https://picsum.photos/seed/chef-avatar/48/48" class="w-12 h-12 rounded-full" />
    </div>
  </header>
  <main class="px-6">
    <!-- Beautiful card-based content with shadows and images -->
  </main>
</div>
<!-- SCREEN_END -->
<!-- MESSAGE: Next, let's create the recipe detail screen... -->

REMEMBER:
- Be brief with messages - focus on the visual design
- Make every screen feel polished and complete
- Use consistent styling across all screens
- Include realistic, engaging placeholder content
- ALWAYS end with a final <!-- MESSAGE: ... --> summarizing what you created and inviting follow-up requests`;

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
    const { prompt, existingScreens, conversationHistory } = await request.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

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

      userPrompt = `You are updating an existing mobile app design.

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

    // Build messages array
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

    // Add conversation history for context (last 6 messages)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-6);
      messages.push(...recentHistory);
    }

    // Add the current user message
    messages.push({ role: "user", content: userPrompt });

    console.log("[Design Stream] Creating SSE stream...");

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let chunkCount = 0;

        try {
          // Use the AI SDK streaming
          const result = streamText({
            model,
            system: SYSTEM_PROMPT,
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
