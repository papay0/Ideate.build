# Interactive Prototype System + Templates

## Overview

Add a **new prototype mode** alongside the existing design mode. This is an **admin-only feature** that runs on completely separate code paths to avoid breaking any current functionality.

**Key principle: The current Design mode remains 100% unchanged.**

### Two Modes

| Mode | Access | Description |
|------|--------|-------------|
| **Design** (current) | All users | Static mockup generation - screens are independent, no navigation |
| **Prototype** (new) | Admin only | Interactive prototypes - screens connected with navigation, shareable URLs |

### What Prototype Mode Adds
1. Screens connected with working navigation (pure HTML/CSS)
2. Prototypes shareable via URL (Cloudflare R2)
3. Flow visualization on canvas (arrows between screens)
4. Template system for reusable prototypes

---

## Architecture: Separate Code Paths

All under `/home` but different sub-routes:

```
app/home/
├── page.tsx                      # Home page (shows mode-appropriate content)
├── projects/                     # UNCHANGED - current Design mode
│   └── [id]/page.tsx             # Design project editor
│
├── prototypes/                   # NEW - Prototype mode (admin only)
│   ├── page.tsx                  # Prototype list (admin only)
│   └── [id]/page.tsx             # Prototype project editor
│
└── components/
    ├── (existing)                # UNCHANGED - current Design components
    │   ├── DesignCanvas.tsx
    │   ├── StreamingScreenPreview.tsx
    │   └── ...
    │
    └── prototype/                # NEW - Prototype-specific components
        ├── PrototypeCanvas.tsx
        ├── PrototypeStreamingPreview.tsx
        ├── FlowConnections.tsx
        ├── PrototypePlayer.tsx
        └── ...

app/api/
├── ai/generate-design/           # UNCHANGED - current Design API
└── ai/generate-prototype/        # NEW - Prototype API (new system prompt)

lib/prompts/
├── system-prompts.ts             # UNCHANGED - current Design prompts
└── prototype-prompts.ts          # NEW - Prototype prompts (grid, ROOT, data-flow)
```

### URL Structure

| URL | Mode | Access |
|-----|------|--------|
| `/home` | Home page | All users |
| `/home/projects/[id]` | Design editor | All users |
| `/home/prototypes` | Prototype list | Admin only |
| `/home/prototypes/[id]` | Prototype editor | Admin only |

### Admin Toggle in PromptInput

The mode toggle appears **inside the PromptInput component** on `/home` page, only for users with `dbUser.role === 'admin'`:

```
┌─────────────────────────────────────────────────────────────────┐
│  What would you like to design?                    ┌─────────┐  │
│  Describe your vision...                           │ Mobile  │  │
│                                                    └─────────┘  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  A fitness tracking app with workout logs...            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────┐ ┌─────────┐ ┌──────────────────┐    ┌───────────┐ │
│  │ 📷 Add  │ │ Flash ▾ │ │ Design│Prototype │    │ Design it │ │
│  └─────────┘ └─────────┘ └──────────────────┘    └───────────┘ │
│                           ↑ Admin only toggle                   │
└─────────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Toggle only visible when `dbUser.role === 'admin'`
- "Design" mode (default): Uses current flow (projects table, design prompts)
- "Prototype" mode: Uses new flow (prototype_projects table, prototype prompts)
- Mode stored in localStorage: `opendesign_mode_{userId}`
- Button text changes: "Design it" → "Prototype it"

### Shared Components (Reused)

These components are reused between Design and Prototype modes:
- `PhoneMockup.tsx` - Device frame rendering
- `BrowserMockup.tsx` - Desktop frame rendering
- `CodeViewer.tsx` - HTML code display
- `ExportMenu.tsx` - Export functionality (extended for prototype)
- UI primitives (buttons, dialogs, etc.)

### Separate Components (New for Prototype)

| Component | Purpose |
|-----------|---------|
| `PrototypeCanvas.tsx` | Grid-based layout with flow arrows |
| `PrototypeStreamingPreview.tsx` | Parses grid positions, ROOT, data-flow |
| `FlowConnections.tsx` | SVG arrows between elements and screens |
| `PrototypePlayer.tsx` | Full-screen interactive preview |
| `SaveAsTemplate.tsx` | Template save dialog |
| `TemplateGallery.tsx` | Template browser |

---

## Requirements Summary

| Feature | Approach |
|---------|----------|
| Navigation | Pure HTML/CSS with anchor links + `:target` selector |
| Flow visualization | AI-generated arrows between screens on canvas |
| **Canvas layout** | **AI outputs grid positions [col, row] for each screen** |
| Hosting | Cloudflare R2 (already configured) |
| Interactivity | Interactive inputs (type, select), AI-suggested stock images |
| Scrolling | Allowed - screens can have overflow:scroll for long content |
| Export | ZIP with HTML + screen images |
| Templates | Personal or public (text-only thumbnails for V1) |

---

## Design Decisions

Key decisions made during planning:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Backward compatibility** | New projects only | Prototype features only work for newly created projects. Simplest approach. |
| **SCREEN_EDIT positions** | Always require `[col,row]` | Consistent and allows repositioning during edit. |
| **Prototype URL versioning** | Overwrite existing | Same URL always shows latest. Clean URLs like `/prototypes/{project-id}/` |
| **Template thumbnails** | Text only (V1) | No image thumbnails needed initially. |
| **Flow arrow timing** | Progressive reveal | Arrows appear as each screen completes, not mid-screen. |
| **Default screen** | AI designates ROOT | AI explicitly marks one screen as entry point using `[ROOT]` marker. |
| **Mobile bottom nav** | Full page navigation | Each tab is a separate full screen with duplicated nav (standard in Figma, etc.) |
| **Prototype player** | Device frame | Show phone mockup or browser chrome around the prototype. |
| **Storage** | Cloudflare R2 | Already configured and ready to use. |
| **Images** | AI-suggested stock | Use Unsplash/Pexels URLs for realistic prototypes. |
| **Scrolling** | Allowed | Screens can have `overflow-y: auto` for long content. |
| **Form inputs** | Interactive | Inputs can be typed in, dropdowns open, checkboxes toggle. |

---

## How CSS `:target` Navigation Works

The `:target` pseudo-class in CSS selects the element whose ID matches the URL fragment (the part after `#`). This allows pure HTML/CSS navigation without JavaScript:

```html
<!-- When URL is example.com#screen-settings, this section becomes visible -->
<style>
  .screen { display: none; }
  .screen:target { display: block; }
  .screen--default { display: block; }
  .screen:target ~ .screen--default { display: none; }
</style>

<section id="screen-home" class="screen screen--default">
  <a href="#screen-settings">Go to Settings</a>  <!-- Click changes URL to #screen-settings -->
</section>

<section id="screen-settings" class="screen">
  <a href="#screen-home">Back to Home</a>
</section>
```

**Benefits:**
- No JavaScript required
- Browser back/forward buttons work naturally
- Each screen has a unique URL fragment
- Works in sandboxed iframes
- Instant navigation (CSS is faster than JS routing)

---

## Phase 1: New Prototype Prompts

**Goal**: Create NEW system prompts for prototype mode. The existing `system-prompts.ts` remains unchanged.

### Files to create:
- `lib/prompts/prototype-prompts.ts` - NEW file with prototype-specific prompts

### Files unchanged:
- `lib/prompts/system-prompts.ts` - Current Design prompts (DO NOT MODIFY)

### New prompt rules for `prototype-prompts.ts`:

1. **Update `SCREEN_START` delimiter** to include grid position and optional ROOT marker:
```
<!-- SCREEN_START: Screen Name [column, row] -->
<!-- SCREEN_START: Screen Name [column, row] [ROOT] -->  ← Marks entry point

Examples:
<!-- SCREEN_START: Home [0,0] [ROOT] -->  ← This is the default/entry screen
<!-- SCREEN_START: Settings [1,0] -->
<!-- SCREEN_START: Profile [1,1] -->
```

**ROOT marker**: Exactly ONE screen should have `[ROOT]` marker. This screen is shown by default when the prototype loads (no hash in URL).

2. **SCREEN_EDIT must also include position**:
```
<!-- SCREEN_EDIT: Screen Name [column, row] -->

Example:
<!-- SCREEN_EDIT: Settings [1,0] -->
```
The position is always required for SCREEN_EDIT to maintain consistency and allow repositioning during edits.

3. **Add `GRID_LAYOUT_RULES`** for positioning screens:
```
When generating multiple screens, assign each a grid position [column, row]:
- First/main screen should be at [0,0]
- Screens linked from the main screen go in column 1
- Linear flows go horizontally (same row, incrementing column)
- Alternative paths/branches go vertically (same column, different rows)
- Think of it as: columns = depth in flow, rows = alternatives at same depth

Examples:
- Wizard flow: Step1 [0,0] → Step2 [1,0] → Step3 [2,0] → Done [3,0]
- Hub pattern: Home [0,0] → Settings [1,0], Profile [1,1], Cart [1,2]
- Mixed: Home [0,0] → ProductList [1,0] → ProductDetail [2,0]
                    → Cart [1,1] → Checkout [2,1] → Confirmation [3,1]
```

4. **Add `NAVIGATION_RULES`** for anchor links with data attributes:
```
- For navigation between screens, use anchor links: <a href="#screen-name-kebab-case">
- Add data-flow attribute to mark the element for flow visualization: data-flow="target-screen-id"
- Example: <a href="#screen-settings" data-flow="screen-settings">Settings</a>
- Screen IDs follow the pattern: screen-{name-in-kebab-case}
- "Home Screen" → href="#screen-home-screen"
- "User Profile" → href="#screen-user-profile"
```

5. **Add `FLOW_MARKER_RULES`** for data-flow attributes:
```
For any element that navigates to another screen, add the data-flow attribute:
- Buttons: <button data-flow="screen-checkout">Checkout</button>
- Links: <a href="#screen-settings" data-flow="screen-settings">⚙️</a>
- Clickable divs: <div data-flow="screen-product-detail" class="cursor-pointer">...</div>

The data-flow value must match the target screen's ID exactly.
This allows the canvas to draw arrows from the exact element position.
```

6. **Add `IMAGE_RULES`** for stock images:
```
For realistic prototypes, use stock image URLs from Unsplash or Pexels:
- Avatars: https://images.unsplash.com/photo-[id]?w=100&h=100&fit=crop
- Product images: https://images.unsplash.com/photo-[id]?w=400&h=400&fit=crop
- Hero images: https://images.unsplash.com/photo-[id]?w=800&h=400&fit=crop

Choose contextually appropriate images. Example:
- Food app → food photography
- E-commerce → product shots
- Social app → diverse people photos
```

7. **Add `SCROLLING_RULES`** for long content:
```
Screens can have scrollable content when appropriate:
- Use overflow-y: auto on containers with long content
- Design feeds, lists, and articles with scrolling
- Keep navigation bars and footers fixed when scrolling is needed
```

8. **Add `FORM_RULES`** for interactive inputs:
```
Form elements should be fully functional:
- Inputs: type="text", type="email", etc. - users can type
- Selects: <select> with <option> - users can choose
- Checkboxes/radios: can be toggled
- Buttons: can trigger navigation via data-flow

Do NOT add JavaScript - forms look and feel interactive via native HTML behavior.
```

9. **Update examples** in MOBILE_EXAMPLE and DESKTOP_EXAMPLE to show grid positions and navigation

### Screen ID convention:
```typescript
function toScreenId(name: string): string {
  return 'screen-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
// "Home Screen" → "screen-home-screen"
// "User Profile" → "screen-user-profile"
```

### Example AI-generated output with grid positions:
```html
<!-- SCREEN_START: Home [0,0] [ROOT] -->
<div class="min-h-screen bg-white">
  <header class="flex justify-between p-4">
    <h1>Home</h1>
    <a href="#screen-settings" data-flow="screen-settings" class="p-2">
      ⚙️
    </a>
  </header>

  <div class="p-4 space-y-4">
    <a href="#screen-profile" data-flow="screen-profile" class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
      <img src="avatar.jpg" class="w-12 h-12 rounded-full" />
      <span>View Profile</span>
    </a>

    <a href="#screen-product-list" data-flow="screen-product-list" class="block p-4 bg-blue-50 rounded-xl">
      <span>Browse Products →</span>
    </a>
  </div>
</div>
<!-- SCREEN_END -->

<!-- SCREEN_START: Settings [1,0] -->
<div class="min-h-screen bg-gray-50">
  ...
</div>
<!-- SCREEN_END -->

<!-- SCREEN_START: Profile [1,1] -->
<div class="min-h-screen bg-white">
  ...
</div>
<!-- SCREEN_END -->

<!-- SCREEN_START: Product List [1,2] -->
<div class="min-h-screen bg-white">
  ...
</div>
<!-- SCREEN_END -->
```

### Visual representation of above layout:
```
        Col 0          Col 1
       ┌──────┐      ┌──────────┐
Row 0  │ Home │─────>│ Settings │
       └──────┘      └──────────┘
           │
           │         ┌──────────┐
Row 1      └────────>│ Profile  │
           │         └──────────┘
           │
           │         ┌──────────────┐
Row 2      └────────>│ Product List │
                     └──────────────┘
```

---

## Handling Tabbed Navigation (Important Pattern)

When an app has tabbed navigation (like Dashboard / Accounts / Health / Settings), each tab is a **separate full screen** with the navigation duplicated.

### Why separate screens instead of one screen with tab switching?

| Approach | Pros | Cons |
|----------|------|------|
| **Separate screens (✓ Our approach)** | Simple for AI, easy to edit individually, clear on canvas | Nav duplicated in HTML |
| **Single screen with embedded tabs** | Nav exists once | Complex for AI, hard to edit, confusing on canvas |

For prototyping, separate screens is standard (Figma, Sketch, etc. all work this way).

### Example: Finance App with 4 tabs

AI generates 4 complete screens, each with the full nav but different content:

```html
<!-- SCREEN_START: Dashboard [0,0] -->
<div class="min-h-screen bg-gray-50">
  <header class="bg-white border-b">
    <h1>Personal Tracker</h1>
    <nav class="flex gap-4">
      <a href="#screen-dashboard" class="text-blue-600 border-b-2 border-blue-600">Dashboard</a>
      <a href="#screen-accounts" data-flow="screen-accounts" class="text-gray-500">Accounts</a>
      <a href="#screen-health" data-flow="screen-health" class="text-gray-500">Health</a>
      <a href="#screen-settings" data-flow="screen-settings" class="text-gray-500">Settings</a>
    </nav>
  </header>
  <main>
    <!-- Dashboard content: metrics cards -->
  </main>
</div>
<!-- SCREEN_END -->

<!-- SCREEN_START: Accounts [1,0] -->
<div class="min-h-screen bg-gray-50">
  <header class="bg-white border-b">
    <h1>Personal Tracker</h1>
    <nav class="flex gap-4">
      <a href="#screen-dashboard" data-flow="screen-dashboard" class="text-gray-500">Dashboard</a>
      <a href="#screen-accounts" class="text-blue-600 border-b-2 border-blue-600">Accounts</a>
      <a href="#screen-health" data-flow="screen-health" class="text-gray-500">Health</a>
      <a href="#screen-settings" data-flow="screen-settings" class="text-gray-500">Settings</a>
    </nav>
  </header>
  <main>
    <!-- Accounts content: account cards -->
  </main>
</div>
<!-- SCREEN_END -->

<!-- Similarly for Health [2,0] and Settings [3,0] -->
```

### Canvas layout for tabbed apps:

Tabs are typically laid out **horizontally** since they're alternatives at the same level:

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Dashboard  │  │  Accounts   │  │   Health    │  │  Settings   │
│   [0,0]     │──│   [1,0]     │──│   [2,0]     │──│   [3,0]     │
│             │  │             │  │             │  │             │
│  [active]   │  │  [active]   │  │  [active]   │  │  [active]   │
│  tab style  │  │  tab style  │  │  tab style  │  │  tab style  │
│             │  │             │  │             │  │             │
│  dashboard  │  │  accounts   │  │   health    │  │  settings   │
│  content    │  │  content    │  │  content    │  │  content    │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
```

### Key points for AI prompt:

```
TABBED NAVIGATION PATTERN:
- Each tab state is a separate screen
- Duplicate the full navigation bar in each screen
- Mark the current tab as active (different styling)
- Other tabs should have data-flow attributes to enable navigation
- Layout tabs horizontally: Tab1 [0,0], Tab2 [1,0], Tab3 [2,0], etc.
```

### In the prototype player:

When user clicks "Accounts" tab on the Dashboard screen:
1. URL changes to `#screen-accounts`
2. Dashboard screen hides, Accounts screen shows
3. Feels exactly like real tab switching

The duplicated nav HTML is invisible to the user - they just see smooth tab navigation.

---

## Phase 2: Data Model Updates

**Key principle: Design mode tables remain UNCHANGED. Prototype mode uses separate tables.**

### Tables UNCHANGED (Design Mode)

| Table | Status |
|-------|--------|
| `projects` | ✅ Unchanged - Design projects |
| `project_designs` | ✅ Unchanged - Design screens |
| `design_messages` | ✅ Unchanged - Design chat history |

### New Table: `prototype_projects`

Separate table for prototype projects (admin only):

```sql
CREATE TABLE prototype_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,              -- Clerk user ID
  name TEXT NOT NULL,
  app_idea TEXT,
  icon TEXT DEFAULT '🎨',
  platform TEXT NOT NULL CHECK (platform IN ('mobile', 'desktop')),
  initial_image_url TEXT,
  model TEXT DEFAULT 'gemini-2.5-flash-preview-05-20',
  prototype_url TEXT,                 -- Published prototype URL on R2
  template_id UUID REFERENCES templates(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prototype_projects_user ON prototype_projects(user_id);
```

### New Table: `prototype_screens`

Screens for prototype projects (with grid positions):

```sql
CREATE TABLE prototype_screens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES prototype_projects(id) ON DELETE CASCADE,
  screen_name TEXT NOT NULL,
  html_content TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  grid_col INTEGER DEFAULT 0,         -- Grid column position
  grid_row INTEGER DEFAULT 0,         -- Grid row position
  is_root BOOLEAN DEFAULT false,      -- Entry point screen
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prototype_screens_project ON prototype_screens(project_id);
```

### New Table: `prototype_messages`

Chat history for prototype projects:

```sql
CREATE TABLE prototype_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES prototype_projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prototype_messages_project ON prototype_messages(project_id);
```

### New Table: `prototype_flows`

Navigation connections between screens (extracted from `data-flow` attributes):

```sql
CREATE TABLE prototype_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES prototype_projects(id) ON DELETE CASCADE,
  from_screen TEXT NOT NULL,
  to_screen TEXT NOT NULL,
  element_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, from_screen, to_screen, element_description)
);

CREATE INDEX idx_prototype_flows_project ON prototype_flows(project_id);
```

### New table: `templates`

Stores reusable design templates with embedded screens and flows. V1 uses text-only representation (no image thumbnails).

```sql
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by TEXT NOT NULL,  -- clerk_id
  is_public BOOLEAN DEFAULT false,  -- true = visible to all, false = only creator
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,  -- emoji
  platform TEXT NOT NULL CHECK (platform IN ('mobile', 'desktop')),
  -- thumbnail_url removed for V1 - text-only thumbnails
  screens JSONB NOT NULL,  -- Array of {name, html, sort_order, grid_col, grid_row, is_root}
  flows JSONB,  -- Array of {from_screen, to_screen, element_description}
  tags TEXT[],
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_public ON templates(is_public) WHERE is_public = true;
CREATE INDEX idx_templates_creator ON templates(created_by);
CREATE INDEX idx_templates_platform ON templates(platform);
```

### Files to modify:
- `lib/supabase/types.ts` - Add TypeScript types for new prototype tables
- Create new migration file in `supabase/migrations/`

### Summary of New Tables

| Table | Purpose |
|-------|---------|
| `prototype_projects` | Prototype projects (admin only) |
| `prototype_screens` | Screens with grid positions and ROOT marker |
| `prototype_messages` | Chat history for prototypes |
| `prototype_flows` | Navigation connections between screens |
| `templates` | Reusable prototype templates |

---

## Phase 3: Flow Extraction

**Goal**: Extract flow connections from `data-flow` attributes in the generated HTML.

### Approach

Instead of parsing separate `<!-- FLOW: -->` delimiters, we extract flows directly from the HTML by finding all `data-flow` attributes. This is simpler and keeps the flow data in sync with the actual interactive elements.

### When to extract flows:

After a screen is complete (on `SCREEN_END`), we can parse the HTML to find all `data-flow` attributes:

```typescript
function extractFlowsFromHtml(screenName: string, html: string): FlowConnection[] {
  const flows: FlowConnection[] = [];

  // Match all data-flow="screen-xxx" attributes
  const regex = /data-flow="([^"]+)"/g;
  let match;

  while ((match = regex.exec(html)) !== null) {
    flows.push({
      from_screen: screenName,
      to_screen: match[1],  // e.g., "screen-settings"
      // Element description could be extracted from nearby text content if needed
    });
  }

  return flows;
}
```

### Files to modify:
- `app/home/components/StreamingScreenPreview.tsx` - Add flow extraction after screen complete
- Or extract on the server side in the prototype builder

### Data flow:

1. AI generates HTML with `data-flow` attributes
2. On screen complete, parse HTML to extract flows
3. Store flows in `project_flows` table (for persistence)
4. FlowConnections component queries iframes in real-time to get element positions

### Note on real-time vs stored flows:

- **Stored flows** (`project_flows` table): For persistence across sessions
- **Real-time positions**: Queried from iframes when rendering arrows (positions may change with screen edits)

---

## Phase 4: Prototype Builder

**Goal**: Combine multiple screens into a single navigable HTML file.

### New files:
- `lib/prototype/builder.ts`

### Core function:

```typescript
interface PrototypeOptions {
  screens: { name: string; html: string }[];
  platform: 'mobile' | 'desktop';
  projectName: string;
  defaultScreen?: string;
}

export function buildPrototype(options: PrototypeOptions): string {
  // Returns complete HTML document with all screens
}
```

### Output HTML structure:

The screen marked with `[ROOT]` gets the `screen--default` class and is shown when no hash is in the URL.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=390, initial-scale=1.0">
  <title>App Name - Prototype</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: 390px; min-height: 844px; overflow-y: auto; }

    /* Navigation via :target */
    .screen { display: none; min-height: 844px; }
    .screen:target { display: block; }
    .screen--default { display: block; }
    .screen:target ~ .screen--default { display: none; }

    /* Ensure links and inputs work */
    a { cursor: pointer; }
    input, textarea, select, button { pointer-events: auto; }
  </style>
</head>
<body>
  <!-- Home has [ROOT] marker, so it gets screen--default -->
  <section id="screen-home" class="screen screen--default">
    <!-- Home screen HTML here -->
  </section>
  <section id="screen-settings" class="screen">
    <!-- Settings screen HTML here -->
  </section>
  <!-- More screens... -->
</body>
</html>
```

### Link processing:

The builder must process all `href="#..."` links in the HTML to ensure they point to valid screen IDs:

```typescript
function processNavigationLinks(html: string, screens: ScreenData[]): string {
  return html.replace(/href="#([^"]+)"/g, (match, target) => {
    // Normalize target to match screen IDs
    // Check if screen exists
    // Return corrected href or original
  });
}
```

### API endpoint:
- `app/api/prototype/build/route.ts` - POST with projectId, returns `{ html: string }`

---

## Phase 5: Cloudflare R2 Integration

**Goal**: Host prototypes at shareable URLs like `prototypes.opendesign.app/{id}`

### New files:
- `lib/cloudflare/r2.ts` - R2 upload service using AWS SDK
- `app/api/prototype/publish/route.ts` - Publish endpoint

### Environment variables:
```
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key
CLOUDFLARE_R2_BUCKET_NAME=opendesign-prototypes
CLOUDFLARE_R2_PUBLIC_URL=https://prototypes.opendesign.app
```

### R2 Upload Service:

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadPrototype(projectId: string, html: string): Promise<string> {
  const key = `prototypes/${projectId}/index.html`;

  await r2Client.send(new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: key,
    Body: html,
    ContentType: "text/html",
    CacheControl: "public, max-age=3600",
  }));

  return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
}
```

### Publish flow:
1. User clicks "Publish" button
2. Build prototype HTML from current screens
3. Upload to R2
4. Save URL to `projects.prototype_url`
5. Show shareable link with copy button

### URL structure:
```
https://prototypes.opendesign.app/prototypes/{project-id}/index.html
```

---

## Phase 5.5: Grid-Based Canvas Rendering

**Goal**: Position screens on the canvas based on their grid coordinates from the AI.

### Files to modify:
- `app/home/components/DesignCanvas.tsx`
- `app/home/components/StreamingScreenPreview.tsx` (to parse grid positions)

### Parsing grid positions from SCREEN_START:

```typescript
// Updated regex to capture grid position and optional ROOT marker
const screenStartRegex = /<!-- SCREEN_START: (.+?) \[(\d+),(\d+)\](?: \[ROOT\])? -->/;

// Example: "<!-- SCREEN_START: Home [0,0] [ROOT] -->"
// Captures: ["Home", "0", "0"]

// For SCREEN_EDIT (always requires position)
const screenEditRegex = /<!-- SCREEN_EDIT: (.+?) \[(\d+),(\d+)\] -->/;

interface ParsedScreen {
  name: string;
  html: string;
  gridCol: number;  // NEW
  gridRow: number;  // NEW
  isRoot?: boolean; // NEW - true if [ROOT] marker present
  isEdit?: boolean;
}
```

### Grid to pixel translation:

```typescript
const GRID_CONFIG = {
  mobile: {
    screenWidth: 390,
    screenHeight: 844,
    gapX: 80,      // Horizontal gap between columns
    gapY: 60,      // Vertical gap between rows
    frameWidth: 20 // Phone frame padding
  },
  desktop: {
    screenWidth: 1440,
    screenHeight: 900,
    gapX: 100,
    gapY: 80,
    frameWidth: 0
  }
};

function gridToPixels(gridCol: number, gridRow: number, platform: 'mobile' | 'desktop') {
  const config = GRID_CONFIG[platform];
  const cellWidth = config.screenWidth + config.frameWidth * 2 + config.gapX;
  const cellHeight = config.screenHeight + config.frameWidth * 2 + config.gapY;

  return {
    x: gridCol * cellWidth,
    y: gridRow * cellHeight
  };
}

// Examples for mobile:
// [0,0] → (0, 0)
// [1,0] → (510, 0)      // 390 + 40 + 80 = 510
// [1,1] → (510, 964)    // second row
// [2,0] → (1020, 0)     // third column
```

### Visual grid layout:

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CANVAS                                    │
│                                                                     │
│   [0,0]              [1,0]              [2,0]                       │
│   ┌─────────┐        ┌─────────┐        ┌─────────┐                │
│   │  Home   │   80px │Settings │   80px │ Detail  │                │
│   │         │<──────>│         │<──────>│         │                │
│   └─────────┘        └─────────┘        └─────────┘                │
│        │                                                            │
│       60px                                                          │
│        │                                                            │
│   [0,1]              [1,1]                                          │
│   ┌─────────┐        ┌─────────┐                                   │
│   │  ....   │        │ Profile │                                   │
│   │         │        │         │                                   │
│   └─────────┘        └─────────┘                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Handling edge cases:

| Scenario | Solution |
|----------|----------|
| Two screens at same position | Show warning, offset second screen slightly |
| Missing grid position | Default to next available slot in row 0 |
| Negative coordinates | Allow - grid extends in all directions |
| User drags screen | Store custom override position (optional future feature) |

### Canvas auto-fit:

On load, calculate the bounding box of all screens and set initial zoom/pan to fit them all in view:

```typescript
function calculateCanvasBounds(screens: ParsedScreen[], platform: Platform) {
  let minX = 0, minY = 0, maxX = 0, maxY = 0;

  for (const screen of screens) {
    const { x, y } = gridToPixels(screen.gridCol, screen.gridRow, platform);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + screenWidth);
    maxY = Math.max(maxY, y + screenHeight);
  }

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}
```

---

## Phase 6: Canvas Flow Visualization

**Goal**: Show arrows from exact interactive elements to their target screens on the canvas.

**Timing**: Progressive reveal - arrows appear as each screen completes (not mid-screen streaming). When a SCREEN_END is detected and the screen is rendered, query that screen's iframe for `[data-flow]` elements and draw arrows to their targets.

### New files:
- `app/home/components/FlowConnections.tsx`

### Files to modify:
- `app/home/components/DesignCanvas.tsx` - Add flow visualization layer

### How Element-Level Positioning Works

1. **Query iframes for flow elements**: Since we use `srcDoc` (same-origin), we can access `iframe.contentDocument`
2. **Find all `[data-flow]` elements**: These are the interactive elements the AI marked
3. **Get element positions**: Use `getBoundingClientRect()` on each element
4. **Translate coordinates**: Convert iframe-relative coords to canvas coords (accounting for zoom/pan)
5. **Draw arrows**: From element position → target screen's left edge

### Coordinate Translation

```
Element position on canvas =
  (iframe position on canvas) + (element position in iframe) × zoom level
```

Steps:
1. Get iframe's bounding rect on canvas
2. Get element's bounding rect inside iframe
3. Apply canvas transform (zoom, pan offset)
4. Result: absolute position on the canvas where arrow should start

### FlowConnections component:

```typescript
interface FlowConnectionsProps {
  screenRefs: Map<string, React.RefObject<HTMLIFrameElement>>;  // iframe refs by screen name
  transform: { x: number; y: number; scale: number };
  showFlows: boolean;
}

export function FlowConnections({ screenRefs, transform, showFlows }: FlowConnectionsProps) {
  // 1. For each iframe, query [data-flow] elements
  // 2. Get their positions relative to canvas
  // 3. Find target screen position
  // 4. Draw bezier curves from element → target
}
```

### Visual Treatments (to keep arrows looking clean)

**Arrow styling:**
- Start with small offset (8-10px) outside the element so arrow doesn't cover it
- Use curved bezier paths that arc away before heading to target
- Semi-transparent by default (60% opacity), full opacity on hover
- Subtle drop shadow so arrows stand out from UI content

**Smart positioning:**
- If element is on right side of screen → arrow exits right
- If element is on left side → arrow exits left (if target is to the left)
- If element is near bottom → arrow curves down then across
- Multiple arrows from same screen fan out slightly to avoid overlap

**Interaction:**
- Toggle button: "Show Flows" on/off in canvas toolbar
- Hover on arrow: highlights both source element and target screen
- Click on arrow: scrolls canvas to center the connection

**Visual hierarchy:**
```
┌─────────────────┐                         ┌─────────────────┐
│  Home Screen    │                         │  Settings       │
│                 │                         │                 │
│  ┌───────────┐  │                         │                 │
│  │ ⚙️ Button │──────────────────────────> │                 │
│  └───────────┘  │                         │                 │
│                 │                         │                 │
│  ┌───────────┐  │                         └─────────────────┘
│  │ Profile   │──────────────────────────> ┌─────────────────┐
│  │ Card      │  │                         │  Profile        │
│  └───────────┘  │                         │                 │
│                 │                         │                 │
└─────────────────┘                         └─────────────────┘
```

### Arrow path calculation:

For an element at position (ex, ey) going to screen at (sx, sy):

1. **Start point**: (ex + elementWidth + offset, ey + elementHeight/2)
2. **Control point 1**: Curve outward from element
3. **Control point 2**: Curve into target screen
4. **End point**: (sx - offset, sy + screenHeight/2) or nearest edge

### Visual style:
- Line color: `#B8956F` (OpenDesign brand) with 60% opacity
- Line style: Solid, 2px stroke
- Arrow: Triangle marker at end
- Hover state: 100% opacity, slight glow effect
- Optional: Small dot/circle at the source element

---

## Phase 7: In-App Preview Mode

**Goal**: Full-screen prototype player within OpenDesign for testing interactions.

### New files:
- `app/home/components/PrototypePlayer.tsx`

### Files to modify:
- `app/home/projects/[id]/page.tsx` - Add Play button and player state

### PrototypePlayer component:

```typescript
interface PrototypePlayerProps {
  isOpen: boolean;
  onClose: () => void;
  prototypeHtml: string;
  platform: 'mobile' | 'desktop';
  projectName: string;
  prototypeUrl?: string;  // If published, show share link
}
```

### Features:
- **Full-screen modal** with dark backdrop
- **Device frame** - Phone frame for mobile, browser chrome for desktop
- **Working navigation** - Clicks work in iframe (no pointerEvents: none)
- **Header bar** with:
  - Project name
  - Platform icon (phone/monitor)
  - Copy link button (if published)
  - Close button (X or ESC key)
- **Instructions** at bottom: "Click elements to navigate between screens"

### State management:
```typescript
const [isPlaying, setIsPlaying] = useState(false);
const [prototypeHtml, setPrototypeHtml] = useState<string | null>(null);

const handlePlay = async () => {
  const response = await fetch("/api/prototype/build", {
    method: "POST",
    body: JSON.stringify({ projectId }),
  });
  const { html } = await response.json();
  setPrototypeHtml(html);
  setIsPlaying(true);
};
```

---

## Phase 8: Export Enhancement

**Goal**: Allow users to download the interactive prototype as a ZIP file.

### Files to modify:
- `app/home/components/ExportMenu.tsx`

### New export option:

Add "Export Prototype" option that creates a ZIP containing:
- `index.html` - The navigable prototype
- `screens/` - Folder with PNG screenshots of each screen

### Implementation:

```typescript
const handleExportPrototype = async () => {
  // 1. Fetch prototype HTML
  const response = await fetch("/api/prototype/build", {
    method: "POST",
    body: JSON.stringify({ projectId }),
  });
  const { html } = await response.json();

  // 2. Capture screen PNGs (reuse existing capture logic)
  const screenImages = await captureAllScreens();

  // 3. Create ZIP using JSZip (already in project)
  const zip = new JSZip();
  zip.file("index.html", html);

  const screensFolder = zip.folder("screens");
  for (const { filename, blob } of screenImages) {
    screensFolder.file(filename, blob);
  }

  // 4. Download
  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, `${projectName}-prototype.zip`);
};
```

---

## Phase 9: Template System

**Goal**: Allow users to save prototypes as templates and reuse them.

### New files:
- `app/api/templates/route.ts` - List and create templates
- `app/api/templates/[id]/route.ts` - Get, update, delete template
- `app/home/components/TemplateGallery.tsx` - Browse and select templates
- `app/home/components/SaveAsTemplate.tsx` - Dialog for saving as template

### Save as Template flow:

1. User clicks "Save as Template" in project menu
2. Dialog opens with fields:
   - Name (required)
   - Description (optional)
   - Tags (optional, comma-separated)
   - Visibility toggle: Personal / Public
3. On save:
   - Capture current screens as JSONB (including grid positions and ROOT marker)
   - Capture flows as JSONB
   - Insert into `templates` table
   - (V1: No image thumbnails - template cards show name, icon, platform badge only)

### SaveAsTemplate component:

```typescript
interface SaveAsTemplateProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  screens: ParsedScreen[];
  flows: FlowConnection[];
  platform: 'mobile' | 'desktop';
}
```

### Template Gallery:

Shown when creating a new project, with two tabs:
- **My Templates** - User's personal templates
- **Public Templates** - Templates marked as public

Each template card shows (V1 - text only):
- Icon (emoji)
- Name
- Description (truncated)
- Platform badge (mobile/desktop)
- Use count
- "Use This" button

(Image thumbnails can be added in V2)

### Using a template:

When user clicks "Use This":
1. Create new project with template's platform
2. Copy template's screens to `project_designs`
3. Copy template's flows to `project_flows`
4. Set `projects.template_id` to reference the template
5. Increment template's `use_count`
6. Redirect to project editor

---

## Implementation Plan: Step by Step

### MVP Goal
> Admin creates prototype → AI generates linked screens → Click "Play" → Navigate between screens

We'll build this in small, testable increments.

---

## Step 1: Foundation (Current Step)

**Goal**: Set up database tables, TypeScript types, and AI prompts.

### 1a. Database Migration

Create new SQL file: `supabase/migrations/001_prototype_tables.sql`

**Tables to create:**

```sql
-- Prototype Projects (separate from Design projects)
CREATE TABLE IF NOT EXISTS prototype_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  app_idea TEXT,
  icon TEXT DEFAULT '🎨',
  platform TEXT NOT NULL CHECK (platform IN ('mobile', 'desktop')),
  initial_image_url TEXT,
  model TEXT DEFAULT 'gemini-2.5-flash-preview-05-20',
  prototype_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prototype Screens (with grid positions)
CREATE TABLE IF NOT EXISTS prototype_screens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES prototype_projects(id) ON DELETE CASCADE,
  screen_name TEXT NOT NULL,
  html_content TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  grid_col INTEGER DEFAULT 0,
  grid_row INTEGER DEFAULT 0,
  is_root BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, screen_name)
);

-- Prototype Messages (chat history)
CREATE TABLE IF NOT EXISTS prototype_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES prototype_projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prototype_projects_user ON prototype_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_prototype_screens_project ON prototype_screens(project_id);
CREATE INDEX IF NOT EXISTS idx_prototype_messages_project ON prototype_messages(project_id);

-- RLS (same permissive policies as design tables)
ALTER TABLE prototype_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE prototype_screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE prototype_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on prototype_projects" ON prototype_projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on prototype_screens" ON prototype_screens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on prototype_messages" ON prototype_messages FOR ALL USING (true) WITH CHECK (true);

-- Updated at triggers
CREATE TRIGGER update_prototype_projects_updated_at
  BEFORE UPDATE ON prototype_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prototype_screens_updated_at
  BEFORE UPDATE ON prototype_screens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**How to apply**: Run this SQL in Supabase SQL Editor.

### 1b. TypeScript Types

Update `lib/supabase/types.ts` to add:

```typescript
// Add to Database interface under Tables:
prototype_projects: {
  Row: {
    id: string
    user_id: string
    name: string
    app_idea: string | null
    icon: string
    platform: 'mobile' | 'desktop'
    initial_image_url: string | null
    model: string
    prototype_url: string | null
    created_at: string
    updated_at: string
  }
  Insert: { ... }
  Update: { ... }
}

prototype_screens: {
  Row: {
    id: string
    project_id: string
    screen_name: string
    html_content: string
    sort_order: number
    grid_col: number
    grid_row: number
    is_root: boolean
    created_at: string
    updated_at: string
  }
  Insert: { ... }
  Update: { ... }
}

prototype_messages: {
  Row: {
    id: string
    project_id: string
    role: 'user' | 'assistant'
    content: string
    image_url: string | null
    created_at: string
  }
  Insert: { ... }
  Update: { ... }
}

// Add helper types at bottom:
export type PrototypeProject = Database['public']['Tables']['prototype_projects']['Row']
export type PrototypeProjectInsert = Database['public']['Tables']['prototype_projects']['Insert']
export type PrototypeScreen = Database['public']['Tables']['prototype_screens']['Row']
export type PrototypeScreenInsert = Database['public']['Tables']['prototype_screens']['Insert']
export type PrototypeMessage = Database['public']['Tables']['prototype_messages']['Row']
export type PrototypeMessageInsert = Database['public']['Tables']['prototype_messages']['Insert']
```

### 1c. Prototype Prompts

Create new file: `lib/prompts/prototype-prompts.ts`

This file will contain the new AI system prompt with:
- `<!-- SCREEN_START: Name [col,row] [ROOT] -->` delimiter format
- `data-flow="screen-target"` attributes on clickable elements
- Grid layout rules (how to position screens)
- Navigation rules (anchor links)
- Stock image rules (Unsplash URLs)
- Scrolling rules (overflow-y: auto allowed)
- Form rules (interactive inputs)

**Key differences from design prompts:**
| Aspect | Design Prompt | Prototype Prompt |
|--------|--------------|------------------|
| SCREEN_START | `<!-- SCREEN_START: Name -->` | `<!-- SCREEN_START: Name [0,0] [ROOT] -->` |
| SCREEN_EDIT | `<!-- SCREEN_EDIT: Name -->` | `<!-- SCREEN_EDIT: Name [0,0] -->` |
| Navigation | None | `<a href="#screen-settings" data-flow="screen-settings">` |
| Images | Placeholders | Unsplash/Pexels URLs |
| Scrolling | Fit viewport | `overflow-y: auto` allowed |
| Forms | Visual only | Interactive (type, select) |

### Step 1 Deliverables Checklist

- [ ] `supabase/migrations/001_prototype_tables.sql` created
- [ ] SQL executed in Supabase SQL Editor
- [ ] `lib/supabase/types.ts` updated with prototype types
- [ ] `lib/prompts/prototype-prompts.ts` created with new rules
- [ ] Can verify tables exist in Supabase dashboard

---

## Step 2: Admin Toggle in PromptInput

**Goal**: Admin can switch between Design and Prototype mode on the home page.

### 2a. Mode Toggle Component

Create `app/home/components/ModeToggle.tsx`:
- Simple segmented control: "Design" | "Prototype"
- Only rendered when `dbUser.role === 'admin'`
- Stores selection in localStorage: `opendesign_mode_{userId}`

### 2b. Update PromptInput

Modify `app/home/page.tsx` PromptInput component:
- Add `mode` state: `'design' | 'prototype'`
- Show ModeToggle for admins (next to model selector)
- Pass mode to `onSubmit` handler
- Change button text: "Design it" / "Prototype it"

### 2c. Update Home Page

Modify `app/home/page.tsx` main component:
- When mode is 'prototype', fetch from `prototype_projects` table
- When mode is 'prototype', create in `prototype_projects` table
- Show different project cards based on mode
- Navigate to `/home/prototypes/[id]` for prototype projects

### Step 2 Deliverables Checklist

- [ ] ModeToggle component created
- [ ] Toggle visible only for admins
- [ ] Mode persists in localStorage
- [ ] Button text changes based on mode
- [ ] Project list shows prototype projects when in prototype mode

---

## Step 3: Prototype Creation & Generation

**Goal**: Admin can create prototype and AI generates linked screens.

### 3a. Create Prototype API

Create `app/api/prototype/create/route.ts`:
- Creates row in `prototype_projects`
- Returns project ID

### 3b. Generate Prototype API

Create `app/api/ai/generate-prototype/route.ts`:
- Uses new prototype prompts
- Streams response with new delimiter format
- Same structure as generate-design but different prompt

### 3c. Prototype Editor Page

Create `app/home/prototypes/[id]/page.tsx`:
- Similar to design editor but uses prototype components
- Parses grid positions from `SCREEN_START`
- Stores screens in `prototype_screens` table

### Step 3 Deliverables Checklist

- [ ] Can create new prototype project
- [ ] AI generates screens with grid positions and ROOT
- [ ] Screens saved to `prototype_screens` table
- [ ] Can see screens on canvas (basic layout)

---

## Step 4: Play Button & Prototype Player

**Goal**: Click "Play" to test the interactive prototype.

### 4a. Prototype Builder

Create `lib/prototype/builder.ts`:
- Combines screens into single HTML file
- Uses CSS `:target` for navigation
- ROOT screen gets `screen--default` class

### 4b. Prototype Player Modal

Create `app/home/components/prototype/PrototypePlayer.tsx`:
- Full-screen modal with device frame
- Loads combined HTML in iframe
- Navigation works (clicks enabled)
- Close with ESC or X button

### 4c. Play Button

Add "Play" button to prototype editor:
- Builds prototype HTML
- Opens player modal

### Step 4 Deliverables Checklist

- [ ] Play button visible in prototype editor
- [ ] Clicking Play opens full-screen player
- [ ] Can navigate between screens by clicking
- [ ] ESC closes player

---

## Future Steps (After MVP)

| Step | Feature |
|------|---------|
| 5 | Flow arrows on canvas |
| 6 | Publish to R2 (shareable URLs) |
| 7 | Export as ZIP |
| 8 | Template system |

---

## Implementation Order (Original)

```
Step 1 (Foundation) ──────────────────────────────────┐
    │                                                 │
    v                                                 │
Step 2 (Admin Toggle + Page) ─────────────────────────┤
    │                                                 │
    v                                                 │
Step 3 (Create + Generate) ───────────────────────────┤
    │                                                 │
    v                                                 │
Step 4 (Play Button + Player) ← MVP COMPLETE ─────────┘
    │
    v
Steps 5-8 (Polish & Features)
```

---

## Files Summary

### Files UNCHANGED (Design Mode - Do Not Modify)

| File | Status |
|------|--------|
| `lib/prompts/system-prompts.ts` | ✅ Unchanged - current Design prompts |
| `app/home/page.tsx` | ✅ Unchanged - Design home |
| `app/home/projects/[id]/page.tsx` | ✅ Unchanged - Design project editor |
| `app/home/components/DesignCanvas.tsx` | ✅ Unchanged - Design canvas |
| `app/home/components/StreamingScreenPreview.tsx` | ✅ Unchanged - Design streaming |
| `app/api/ai/generate-design/route.ts` | ✅ Unchanged - Design API |

### Files to Modify (Minimal Changes)

| File | Changes |
|------|---------|
| `lib/supabase/types.ts` | Add types for prototype tables |
| `app/home/page.tsx` | Add mode toggle for admins, handle prototype mode |

### New Files to Create

**Prototype Pages:**
| File | Purpose |
|------|---------|
| `app/home/prototypes/[id]/page.tsx` | Prototype project editor |

**Prototype Components:**
| File | Purpose |
|------|---------|
| `app/home/components/ModeToggle.tsx` | Design/Prototype toggle (admin only) |
| `app/home/components/prototype/PrototypeCanvas.tsx` | Grid-based layout with flow arrows |
| `app/home/components/prototype/PrototypeStreamingPreview.tsx` | Parses grid, ROOT, data-flow |
| `app/home/components/prototype/FlowConnections.tsx` | SVG arrows between screens |
| `app/home/components/prototype/PrototypePlayer.tsx` | Full-screen interactive preview |
| `app/home/components/prototype/SaveAsTemplate.tsx` | Template save dialog |
| `app/home/components/prototype/TemplateGallery.tsx` | Template browser |

**Prototype API:**
| File | Purpose |
|------|---------|
| `app/api/ai/generate-prototype/route.ts` | Prototype generation API (new prompts) |
| `app/api/prototype/build/route.ts` | Build combined HTML |
| `app/api/prototype/publish/route.ts` | Publish to R2 |
| `app/api/templates/route.ts` | Templates CRUD |
| `app/api/templates/[id]/route.ts` | Single template |

**Prototype Libraries:**
| File | Purpose |
|------|---------|
| `lib/prompts/prototype-prompts.ts` | NEW prototype-specific prompts |
| `lib/prototype/builder.ts` | Build combined HTML from screens |
| `lib/prototype/grid.ts` | Grid-to-pixel translation utilities |
| `lib/cloudflare/r2.ts` | R2 upload service |

### New Migration File

| File | Purpose |
|------|---------|
| `supabase/migrations/XXXXXX_add_prototypes.sql` | Create project_flows, templates tables; add columns |

---

## Technical Notes

### Why Pure CSS Navigation?

1. **No JavaScript in prototypes** - Simpler, faster, works in sandboxed iframes
2. **Browser back/forward works** - URL fragments are part of browser history
3. **Shareable URLs** - `prototype.com#screen-settings` goes directly to that screen
4. **No security concerns** - CSS can't do anything malicious

### Why Cloudflare R2?

1. **S3-compatible** - Easy to integrate with AWS SDK
2. **Edge-cached** - Fast worldwide delivery
3. **Cheap** - No egress fees, pay only for storage
4. **Custom domain** - Can use `prototypes.opendesign.app`

### Why JSONB for Template Screens?

1. **Self-contained** - Template has everything it needs
2. **Versioned** - Screens are snapshotted at template creation time
3. **No foreign keys** - Simpler data model, no orphaned screens
4. **Fast queries** - PostgreSQL JSONB is indexed and fast

### Template Visibility Model

| is_public | Visibility |
|-----------|------------|
| `false` | Only creator can see and use |
| `true` | Everyone can see and use |

Future enhancement: Add organization-based scoping when teams feature is built.
