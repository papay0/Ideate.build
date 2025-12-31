-- Migration: Organizations System
-- Description: Add organizations and organization_members tables for team workspaces

-- ============================================================================
-- ORGANIZATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏢',
  invite_code TEXT UNIQUE NOT NULL,
  require_approval BOOLEAN NOT NULL DEFAULT false,
  owner_id TEXT NOT NULL,  -- clerk_id of creator
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_invite_code ON organizations(invite_code);

-- RLS (permissive - app handles access control)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on organizations"
  ON organizations FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- ORGANIZATION MEMBERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,  -- clerk_id
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_status ON organization_members(status);

-- RLS (permissive - app handles access control)
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on organization_members"
  ON organization_members FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- MODIFY PROTOTYPE_PROJECTS TABLE
-- ============================================================================

-- Add organization_id column to prototype_projects
ALTER TABLE prototype_projects
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Index for org-scoped project queries
CREATE INDEX IF NOT EXISTS idx_prototype_projects_org ON prototype_projects(organization_id);

-- ============================================================================
-- UPDATED_AT TRIGGER FOR ORGANIZATIONS
-- ============================================================================

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to organizations table
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
