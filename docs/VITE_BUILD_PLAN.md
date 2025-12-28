# Vite Build Plan: Interactive Prototypes

## Goal

Give users two options when they click "Play":
1. **Quick Prototype** - Instant preview with current HTML (what we have now)
2. **Fully Working App** - Real Vite React app built by Claude Agent SDK

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         DESIGN MODE                              │
│  (Current - Keep as-is)                                          │
│                                                                   │
│  User prompt → Gemini streams → HTML screens → Canvas preview    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ User clicks "Play"
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PLAY MODE DIALOG                             │
│                                                                   │
│   "How would you like to preview?"                               │
│                                                                   │
│   ┌─────────────────┐    ┌─────────────────────────────────┐    │
│   │ Quick Prototype │    │ Fully Working App               │    │
│   │                 │    │                                 │    │
│   │ Instant preview │    │ Real React app with full        │    │
│   │ Basic interac-  │    │ interactivity, proper imports,  │    │
│   │ tivity          │    │ working libraries               │    │
│   │                 │    │                                 │    │
│   │ [Open Now]      │    │ ~2-5 min build time             │    │
│   │                 │    │ [Build App]                     │    │
│   └─────────────────┘    └─────────────────────────────────┘    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          ▼                                       ▼
┌─────────────────────┐             ┌─────────────────────────────┐
│   QUICK PROTOTYPE   │             │     FULLY WORKING APP       │
│                     │             │                             │
│ Open current HTML   │             │ 1. Send to E2B sandbox      │
│ in player iframe    │             │ 2. Claude Agent SDK runs    │
│                     │             │    with Sonnet 4.5          │
│ (Instant)           │             │ 3. Agent builds Vite app    │
│                     │             │ 4. Export & save to Supabase│
│                     │             │ 5. User gets working app    │
│                     │             │                             │
│                     │             │ (~2-5 minutes)              │
└─────────────────────┘             └─────────────────────────────┘
```

---

## Why E2B + Claude Agent SDK?

### The Problem with Simple Approaches

A retry loop with Gemini won't handle:
- Complex import errors
- Missing peer dependencies
- TypeScript configuration issues
- Build tool conflicts
- Runtime errors that only appear after build

### Claude Agent SDK Advantage

Claude Agent SDK (Sonnet 4.5) can:
- **Autonomously debug** - Read error messages, understand context, fix issues
- **Install packages** - Detect missing dependencies and install them
- **Iterate until success** - Keep trying different approaches
- **Use the original prompt** - Understands "build an app to do A B and C" context

### Pricing (E2B)

| Scenario | Cost |
|----------|------|
| Per build (~5 min, 2 vCPU, 2GB) | ~$0.02-0.03 |
| 100 builds/day | ~$2-3/day |
| Monthly (100/day) | ~$60-90/month |

Plus Claude API costs for Sonnet 4.5.

---

## What Gets Sent to Claude Agent SDK

```typescript
interface BuildRequest {
  // The original user prompt for context
  originalPrompt: string;  // "build an app to do A B and C"

  // All HTML screen files from Supabase
  screens: {
    name: string;
    htmlContent: string;
    isRoot: boolean;
  }[];

  // Project metadata
  projectName: string;
  platform: 'mobile' | 'desktop';
}

```

---

## Claude Agent SDK Prompt

The agent receives this context and builds autonomously:

```markdown
You are building a fully functional Vite React application.

## Context
The user wanted to: "{originalPrompt}"

## Input Files
You have HTML prototype screens that show the UI design. These are NOT production code - they're prototypes using CDN React with inline scripts.

## Your Task
1. Create a new Vite React project
2. Convert each HTML screen into a proper React component with:
   - Proper imports (lucide-react for icons, etc.)
   - TypeScript types
   - React Router for navigation
3. Install all necessary dependencies
4. Build the project with `npm run build`
5. Ensure the build succeeds with no errors
6. The output should be in the `dist/` folder

## Screen Files
{screens as files}

## Requirements
- Use Vite with React + TypeScript template
- Use Tailwind CSS for styling
- Use lucide-react for icons
- Use react-router-dom for navigation
- The root screen should be the default route "/"
- Make all interactions work (forms, buttons, state)
- Fix any errors you encounter during build
```

---

## Implementation Flow

### 1. User Clicks "Play"

Show dialog with two options:
- Quick Prototype → Open current HTML player (instant)
- Fully Working App → Start build process

### 2. Build Process (Fully Working App)

```typescript
// Vercel API endpoint
async function buildFullApp(projectId: string) {
  // 1. Fetch project data
  const project = await getProject(projectId);
  const screens = await getScreens(projectId);
  const messages = await getMessages(projectId); // For original prompt

  // 2. Start E2B sandbox with Claude Agent SDK
  const result = await runClaudeAgent({
    prompt: buildPrompt(project, screens, messages),
    tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
    model: 'claude-sonnet-4-5',
  });

  // 3. Extract built files from sandbox
  const distFiles = await extractDist(result.sandbox);

  // 4. Save to Supabase
  await saveBuild(projectId, distFiles);

  return { success: true, buildId: result.id };
}
```

### 3. Save to Supabase

```sql
CREATE TABLE prototype_builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES prototype_projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, building, success, failed
  built_html TEXT, -- The index.html content
  built_assets JSONB, -- { 'assets/index-abc123.js': '...', ... }
  error_message TEXT,
  build_duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### 4. Polling for Build Status

Frontend polls every 5 seconds:
```typescript
const { data: build } = await supabase
  .from('prototype_builds')
  .select('status, built_html')
  .eq('project_id', projectId)
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

if (build.status === 'success') {
  // Show the built app
  setBuiltHtml(build.built_html);
}
```

---

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `app/api/prototype/build-full/route.ts` | Start build job, return build ID |
| `app/api/prototype/build-status/route.ts` | Check build status |
| `lib/e2b/agent-builder.ts` | Claude Agent SDK integration with E2B |
| `lib/prompts/agent-build-prompt.ts` | Prompt for Claude Agent |
| `components/PlayModeDialog.tsx` | Dialog to choose quick vs full |

### Modified Files

| File | Changes |
|------|---------|
| `PrototypePlayer.tsx` | Show dialog, handle both modes |
| `lib/supabase/types.ts` | Add `prototype_builds` table |

### Database Migration

```sql
-- Add prototype_builds table
-- Add original_prompt column to prototype_messages or prototype_projects
```

---

## Cost Estimate

### Per "Fully Working App" Build

| Item | Cost |
|------|------|
| E2B sandbox (~5 min) | ~$0.02 |
| Claude Sonnet 4.5 API (~50k tokens) | ~$0.15-0.30 |
| **Total per build** | **~$0.20-0.35** |

### Monthly (if 50 full builds/day)

| Item | Cost |
|------|------|
| E2B | ~$30 |
| Claude API | ~$300-500 |
| **Total** | **~$350-550/month** |

Note: Most users will use "Quick Prototype" for iteration. "Fully Working App" is for when they're ready to test/share.

---

## Open Questions

1. **How to handle large apps?**
   - Built apps with many assets might exceed Supabase text column limits
   - Option: Store in R2/S3 and save URL reference

2. **Build timeout?**
   - E2B sandbox can run up to 1 hour
   - Set reasonable timeout (10-15 min max)

3. **Concurrent builds?**
   - Queue system if multiple users build simultaneously
   - Or just allow concurrent (E2B handles it)

4. **Caching?**
   - Cache builds by content hash?
   - Or always rebuild (since it's an intentional action)?

---

## Next Steps

1. [ ] Set up E2B account (free $100 credits to start)
2. [ ] Install Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`)
3. [ ] Create `prototype_builds` table in Supabase
4. [ ] Build the PlayModeDialog component
5. [ ] Create API endpoint to start builds
6. [ ] Integrate Claude Agent SDK with E2B
7. [ ] Test end-to-end flow
8. [ ] Add build status polling
9. [ ] Handle edge cases (timeout, errors, large apps)
