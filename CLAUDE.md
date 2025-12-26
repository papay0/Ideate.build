# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (Next.js 16)
npm run build    # Production build
npm run lint     # Run ESLint
```

## Architecture Overview

OpenDesign is an AI-powered prototyping tool that creates interactive mobile and desktop app prototypes in real-time using streaming LLM responses.

### Core Flow

1. **User submits prompt** → `app/home/page.tsx` handles input
2. **API streams response** → `app/api/ai/generate-prototype/route.ts` uses Vercel AI SDK with SSE
3. **Parser extracts screens** → `StreamingScreenPreview.tsx` parses HTML comment delimiters
4. **Canvas renders mockups** → `PrototypeCanvas.tsx` displays screens in a 2D grid with flow arrows
5. **User can play prototype** → `PrototypePlayer.tsx` enables interactive navigation testing

### Streaming Protocol

The AI outputs HTML with special comment delimiters including grid positions:
```html
<!-- PROJECT_NAME: App Name -->
<!-- PROJECT_ICON: emoji -->
<!-- MESSAGE: Chat text -->
<!-- SCREEN_START: Screen Name [col,row] [ROOT] -->
<div>...HTML+Tailwind with data-flow navigation...</div>
<!-- SCREEN_END -->
```

- `[col,row]` - Grid position for canvas layout
- `[ROOT]` - Marks the entry point screen
- `data-flow="screen-target"` - Navigation links between screens

### Key Directories

- `app/api/ai/generate-prototype/` - Streaming SSE endpoint, handles BYOK + platform key logic
- `app/home/components/prototype/` - PrototypeCanvas, PrototypePlayer, FlowConnections
- `app/home/components/` - Shared UI: StreamingScreenPreview, CodeViewer, ExportMenu
- `lib/prompts/prototype-prompts.ts` - Platform-specific (mobile/desktop) AI prompts with grid layout rules
- `lib/constants/` - Platform configs (viewports), plan tiers, pricing
- `lib/supabase/` - Client/server Supabase clients with typed Database
- `lib/hooks/` - useSubscription, useBYOK, useUserSync, useAnalytics

### Authentication & Data

- **Auth**: Clerk (`@clerk/nextjs`) - user ID stored as `clerk_id` in Supabase
- **Database**: Supabase with prototype tables:
  - `prototype_projects` - User prototype projects (links to clerk_id)
  - `prototype_screens` - Generated screen HTML with grid positions
  - `prototype_messages` - Chat history for context
  - `users` - User records with plan, messages_remaining

### Subscription System

- Plans defined in `lib/constants/plans.ts` (free: 2 msgs, pro: 50 msgs)
- Model access controlled by plan (free = Flash only, pro = Flash + Pro)
- BYOK users bypass quota entirely and can use any model
- Stripe integration in `app/api/stripe/` for checkout/webhooks

### Platform Support

Mobile (390x844) and Desktop (1440x900) viewports defined in `lib/constants/platforms.ts`. The AI system prompt changes based on platform selection.

## Environment Variables

Required:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` - Clerk auth
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` - Supabase
- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` - Analytics

Optional:
- `OPENROUTER_API_KEY` - Platform API key for users without BYOK

## PostHog Analytics

### Setup

- **Initialization**: `instrumentation-client.ts` - configures PostHog with pageview/pageleave tracking and session replay
- **Provider**: `app/providers/PostHogProvider.tsx` - wraps app, auto-identifies users via Clerk
- **Events**: `lib/hooks/useAnalytics.ts` - typed event tracking

### Adding New Events

1. Define the event type in `AnalyticsEvents` in `lib/hooks/useAnalytics.ts`:
```typescript
type AnalyticsEvents = {
  // ... existing events
  my_new_event: {
    property1: string
    property2: number
  }
}
```

2. Track it anywhere with full type safety:
```typescript
import { trackEvent } from "@/lib/hooks/useAnalytics"

trackEvent("my_new_event", {
  property1: "value",
  property2: 123
})
```

### Current Events

| Event | When Fired |
|-------|------------|
| `project_created` | New prototype created (landing or dashboard) |
| `prototype_generated` | AI generation completes |
| `prototype_exported` | PNG or ZIP export |
| `subscription_upgraded` | User upgrades to Pro |
| `byok_configured` | User adds their API key |
| `byok_removed` | User removes their API key |

### Session Replay & Privacy

- Session replay is enabled by default
- Passwords are automatically masked
- Add `data-ph-mask` attribute to any element containing sensitive data (e.g., API keys)

```tsx
<input data-ph-mask type="text" value={apiKey} />
```

## Database Schema

Prototype tables are managed via Supabase migrations. RLS is enabled but policies allow all operations (filtering done in app code by clerk_id).
