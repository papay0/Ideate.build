/**
 * Prototype Tables Migration
 *
 * Creates separate tables for the prototype feature (admin only).
 * These tables are completely separate from the existing design tables.
 *
 * Run this SQL in your Supabase SQL Editor:
 * https://app.supabase.com/project/YOUR_PROJECT/sql/new
 */

-- ============================================================================
-- Prototype Projects Table
-- Stores prototype projects (separate from design projects)
-- ============================================================================

CREATE TABLE IF NOT EXISTS prototype_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,                    -- Clerk user ID
  name TEXT NOT NULL,                       -- Project display name
  app_idea TEXT,                            -- Initial app description
  icon TEXT DEFAULT '🎨',                   -- Emoji icon
  platform TEXT NOT NULL CHECK (platform IN ('mobile', 'desktop')),
  initial_image_url TEXT,                   -- Reference image URL
  model TEXT DEFAULT 'gemini-2.5-flash-preview-05-20',
  prototype_url TEXT,                       -- Published prototype URL on R2
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for prototype_projects
CREATE INDEX IF NOT EXISTS idx_prototype_projects_user ON prototype_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_prototype_projects_updated_at ON prototype_projects(updated_at DESC);

-- ============================================================================
-- Prototype Screens Table
-- Stores screens with grid positions for canvas layout
-- ============================================================================

CREATE TABLE IF NOT EXISTS prototype_screens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES prototype_projects(id) ON DELETE CASCADE,
  screen_name TEXT NOT NULL,                -- Screen identifier (e.g., "Home Screen")
  html_content TEXT NOT NULL,               -- Generated HTML with Tailwind CSS
  sort_order INTEGER DEFAULT 0,             -- Display order
  grid_col INTEGER DEFAULT 0,               -- Grid column position for canvas
  grid_row INTEGER DEFAULT 0,               -- Grid row position for canvas
  is_root BOOLEAN DEFAULT false,            -- True if this is the entry point screen
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique screen names per project
  UNIQUE(project_id, screen_name)
);

-- Indexes for prototype_screens
CREATE INDEX IF NOT EXISTS idx_prototype_screens_project ON prototype_screens(project_id);

-- ============================================================================
-- Prototype Messages Table
-- Stores chat conversation history for prototype projects
-- ============================================================================

CREATE TABLE IF NOT EXISTS prototype_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES prototype_projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  image_url TEXT,                           -- Optional reference image URL
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for prototype_messages
CREATE INDEX IF NOT EXISTS idx_prototype_messages_project ON prototype_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_prototype_messages_created_at ON prototype_messages(created_at);

-- ============================================================================
-- Row Level Security (RLS)
-- Same permissive policies as design tables (filtering done in app code)
-- ============================================================================

-- Enable RLS on all prototype tables
ALTER TABLE prototype_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE prototype_screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE prototype_messages ENABLE ROW LEVEL SECURITY;

-- Prototype Projects policies
CREATE POLICY "Allow all on prototype_projects"
  ON prototype_projects FOR ALL
  USING (true)
  WITH CHECK (true);

-- Prototype Screens policies
CREATE POLICY "Allow all on prototype_screens"
  ON prototype_screens FOR ALL
  USING (true)
  WITH CHECK (true);

-- Prototype Messages policies
CREATE POLICY "Allow all on prototype_messages"
  ON prototype_messages FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Updated At Triggers
-- Automatically updates updated_at timestamp
-- (Reuses existing update_updated_at_column function from schema.sql)
-- ============================================================================

-- Apply trigger to prototype_projects table
DROP TRIGGER IF EXISTS update_prototype_projects_updated_at ON prototype_projects;
CREATE TRIGGER update_prototype_projects_updated_at
  BEFORE UPDATE ON prototype_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to prototype_screens table
DROP TRIGGER IF EXISTS update_prototype_screens_updated_at ON prototype_screens;
CREATE TRIGGER update_prototype_screens_updated_at
  BEFORE UPDATE ON prototype_screens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Success Message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Prototype tables created successfully!';
  RAISE NOTICE 'Tables: prototype_projects, prototype_screens, prototype_messages';
  RAISE NOTICE 'RLS policies enabled for all tables.';
END $$;
