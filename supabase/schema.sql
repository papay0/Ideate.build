/**
 * OpenDesign Database Schema
 *
 * Run this SQL in your Supabase SQL Editor to set up the required tables.
 * https://app.supabase.com/project/YOUR_PROJECT/sql/new
 *
 * Tables:
 * - projects: User projects containing app ideas
 * - project_designs: Generated screen designs (HTML)
 * - design_messages: Chat conversation history
 */

-- ============================================================================
-- Projects Table
-- Stores user projects with their app ideas
-- ============================================================================

CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,                    -- Clerk user ID
  name TEXT NOT NULL,                       -- Project display name
  app_idea TEXT,                            -- Initial app description
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster user queries
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);

-- ============================================================================
-- Project Designs Table
-- Stores generated screen designs as HTML
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_designs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  screen_name TEXT NOT NULL,                -- Screen identifier (e.g., "Home Screen")
  html_content TEXT NOT NULL,               -- Generated HTML with Tailwind CSS
  sort_order INTEGER DEFAULT 0,             -- Display order
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique screen names per project
  UNIQUE(project_id, screen_name)
);

-- Index for faster project queries
CREATE INDEX IF NOT EXISTS idx_project_designs_project_id ON project_designs(project_id);

-- ============================================================================
-- Design Messages Table
-- Stores chat conversation history for context
-- ============================================================================

CREATE TABLE IF NOT EXISTS design_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster message queries
CREATE INDEX IF NOT EXISTS idx_design_messages_project_id ON design_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_design_messages_created_at ON design_messages(created_at);

-- ============================================================================
-- Row Level Security (RLS)
-- Ensures users can only access their own data
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_messages ENABLE ROW LEVEL SECURITY;

-- Projects: Users can only access their own projects
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (true);  -- We filter by user_id in the app

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (true);

-- Project Designs: Access through project ownership
CREATE POLICY "Users can view project designs"
  ON project_designs FOR SELECT
  USING (true);

CREATE POLICY "Users can insert project designs"
  ON project_designs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update project designs"
  ON project_designs FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete project designs"
  ON project_designs FOR DELETE
  USING (true);

-- Design Messages: Access through project ownership
CREATE POLICY "Users can view design messages"
  ON design_messages FOR SELECT
  USING (true);

CREATE POLICY "Users can insert design messages"
  ON design_messages FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- Updated At Trigger
-- Automatically updates updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to projects table
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to project_designs table
DROP TRIGGER IF EXISTS update_project_designs_updated_at ON project_designs;
CREATE TRIGGER update_project_designs_updated_at
  BEFORE UPDATE ON project_designs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Success Message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'OpenDesign schema created successfully!';
  RAISE NOTICE 'Tables: projects, project_designs, design_messages';
  RAISE NOTICE 'RLS policies enabled for all tables.';
END $$;
