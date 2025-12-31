# Organization System

> Implementation specification for the Organization feature in Ideate.

## Overview

Organizations enable teams to share templates and projects internally. This is the foundation for the Template system where companies can create and share templates (e.g., Meta employees accessing "Instagram template" screens).

## Model: Context Switching (Slack-like)

Users switch between workspaces via a header dropdown. Each context is isolated:

| Context | Projects Shown | Templates Visible | New Project Belongs To |
|---------|---------------|-------------------|------------------------|
| Personal | User's personal projects | Private + Public | User (personal) |
| Meta (org) | Meta org's projects | Meta + Public | Meta org |

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Workspace model | Context switching | Clear ownership, scales to team features |
| Templates in Org | Org + Public only | No private templates in org context |
| Templates in Personal | Private + Public | No org templates in personal context |
| Project ownership | Belongs to current context | No ambiguity, no transfers |
| Join mechanism | Invite code | Simple, no SSO needed |
| Join approval | Configurable per org | Owner chooses auto-join or approval |
| Member visibility | Count for members, list for owner | Privacy with control |
| Template creation | Any member | Low barrier, collaborative |
| Project transfers | No | Created in Meta = stays in Meta |

## Organization Roles

| Role | View Members | Remove Members | Edit Org | Delete Org | Regenerate Code |
|------|--------------|----------------|----------|------------|-----------------|
| Owner | Full list | Yes | Yes | Yes | Yes |
| Member | Count only | No | No | No | No |

---

## Database Schema

### Table: `organizations`

```sql
CREATE TABLE organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏢',
  invite_code TEXT UNIQUE NOT NULL,
  require_approval BOOLEAN NOT NULL DEFAULT false,
  owner_id TEXT NOT NULL,  -- clerk_id of creator
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Display name (e.g., "Meta Design Team") |
| `icon` | TEXT | Single emoji (e.g., "🏢") |
| `invite_code` | TEXT | Unique join code (e.g., "meta-a7x9k2") |
| `require_approval` | BOOLEAN | If true, join requests need owner approval |
| `owner_id` | TEXT | Clerk ID of creator |

### Table: `organization_members`

```sql
CREATE TABLE organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,  -- clerk_id
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);
```

| Column | Type | Description |
|--------|------|-------------|
| `organization_id` | UUID | FK to organizations |
| `user_id` | TEXT | Clerk ID of member |
| `role` | TEXT | 'owner' or 'member' |
| `status` | TEXT | 'pending' or 'active' |

### Modified: `prototype_projects`

```sql
ALTER TABLE prototype_projects
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
```

- `organization_id` is NULL for personal projects
- Non-null means project belongs to that organization

### Invite Code Format

```
{name-slug}-{random-6-chars}
```

Examples: `meta-a7x9k2`, `design-team-b3m8n1`

---

## API Endpoints

### Organizations CRUD

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/organizations` | Create organization | Required |
| GET | `/api/organizations` | List user's organizations | Required |
| GET | `/api/organizations/[id]` | Get organization details | Member |
| PATCH | `/api/organizations/[id]` | Update organization | Owner |
| DELETE | `/api/organizations/[id]` | Delete organization | Owner |

### Membership

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/organizations/join` | Join with invite code | Required |
| GET | `/api/organizations/[id]/members` | List members | Member (owner sees full list) |
| DELETE | `/api/organizations/[id]/members/[memberId]` | Remove member or leave | Owner or Self |
| POST | `/api/organizations/[id]/members/[memberId]/approve` | Approve pending member | Owner |
| POST | `/api/organizations/[id]/regenerate-code` | Regenerate invite code | Owner |

### Request/Response Examples

**Create Organization**
```typescript
// POST /api/organizations
// Request
{ name: "Meta Design Team", icon: "🏢", require_approval: false }

// Response (201)
{ id: "uuid", name: "Meta Design Team", icon: "🏢", invite_code: "meta-design-team-a7x9k2", ... }
```

**Join Organization**
```typescript
// POST /api/organizations/join
// Request
{ invite_code: "meta-design-team-a7x9k2" }

// Response (200)
{ organization: { id, name, icon }, status: "active" | "pending", message: "..." }
```

---

## React Hooks

### `useOrganizations`

```typescript
// lib/hooks/useOrganizations.ts
interface UseOrganizationsReturn {
  organizations: Organization[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createOrganization: (data: CreateOrgInput) => Promise<Organization>;
  joinOrganization: (inviteCode: string) => Promise<JoinResult>;
}
```

### `useOrganizationContext`

```typescript
// lib/hooks/useOrganizationContext.ts
type Context =
  | { type: 'personal' }
  | { type: 'organization'; organizationId: string };

interface UseOrganizationContextReturn {
  context: Context;
  currentOrg: Organization | null;
  setContext: (ctx: Context) => void;
  isPersonal: boolean;
  isOrganization: boolean;
}
```

Storage: `localStorage` key `ideate_org_context_{clerk_id_suffix}`

### `useOrganization`

```typescript
// lib/hooks/useOrganization.ts
interface UseOrganizationReturn {
  organization: OrganizationDetails | null;
  members: Member[];
  memberCount: number;
  isOwner: boolean;
  isLoading: boolean;
  updateOrganization: (data: UpdateOrgInput) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  approveMember: (memberId: string) => Promise<void>;
  regenerateCode: () => Promise<string>;
  leaveOrganization: () => Promise<void>;
  deleteOrganization: () => Promise<void>;
}
```

---

## UI Components

### OrganizationSwitcher

**Location**: Header, left side next to logo

```
┌────────────────────────────────┐
│ 🏠 Personal              ▾    │
└────────────────────────────────┘
        │
        ▼
┌──────────────────────────────┐
│ ✓ 🏠 Personal                │
│ ─────────────────────────    │
│   🏢 Meta                    │
│   🎨 Design Team             │
│ ─────────────────────────    │
│ + Create organization        │
│ ↳ Join with code             │
└──────────────────────────────┘
```

### CreateOrganizationModal

- Name input (required)
- Icon picker (emoji grid)
- Auto-generated invite code (read-only, copy + regenerate)
- "Require approval to join" toggle
- Create button

### JoinOrganizationModal

States:
1. Input: Code input + Join button
2. Preview: Org name + member count + Confirm
3. Pending: "Request sent, waiting for approval"
4. Success: "You've joined {org name}!"

### Organization Settings Page

Route: `/home/organization/[id]/settings`

Sections:
- Header: Org name + icon (editable for owner)
- Invite Code: Display with copy + regenerate (owner only)
- Settings: Require approval toggle (owner only)
- Members: List (owner) or count (member)
- Actions: Leave/Delete buttons

---

## Integration Points

### Project List Filtering

```typescript
// app/home/page.tsx
const { context } = useOrganizationContext();

let query = supabase
  .from("prototype_projects")
  .select("*")
  .order("updated_at", { ascending: false });

if (context.type === 'personal') {
  query = query.eq("user_id", userId).is("organization_id", null);
} else {
  query = query.eq("organization_id", context.organizationId);
}
```

### Project Creation

```typescript
// app/api/ai/generate-prototype/route.ts
const { data: project } = await supabaseAdmin
  .from("prototype_projects")
  .insert({
    user_id: clerkUserId,
    organization_id: organization_id || null,  // from request body
    name: projectName,
    // ...
  });
```

---

## Implementation Phases

| Phase | Description | Checkpoint |
|-------|-------------|------------|
| 1 | Database migration | DB ready |
| 2 | TypeScript types | Types defined |
| 3 | Organizations CRUD API | - |
| 4 | Membership API | Full API working |
| 5 | React hooks | Hooks ready |
| 6-9 | UI Components | UI built |
| 10-12 | Integration | Feature complete |
| 13 | Testing & polish | Production ready |

---

## Future: Templates

Once organizations are working, the Template system will add:

```sql
CREATE TABLE templates (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📱',
  visibility TEXT CHECK (visibility IN ('private', 'public', 'organization')),
  organization_id UUID REFERENCES organizations(id),
  creator_id TEXT NOT NULL,
  screens JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Template visibility:
- `private`: Only creator can see (in Personal context)
- `public`: Everyone can see (in all contexts)
- `organization`: Only org members can see (in that org's context)
