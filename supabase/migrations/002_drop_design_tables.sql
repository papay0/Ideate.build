-- ============================================================================
-- Migration: Drop Design Tables
--
-- This migration removes the legacy design mode tables that are no longer used.
-- The application now uses prototype tables exclusively.
-- ============================================================================

-- Drop design messages table (depends on projects)
DROP TABLE IF EXISTS design_messages CASCADE;

-- Drop project designs table (depends on projects)
DROP TABLE IF EXISTS project_designs CASCADE;

-- Drop projects table
DROP TABLE IF EXISTS projects CASCADE;

-- Drop related triggers (if they exist)
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
DROP TRIGGER IF EXISTS update_project_designs_updated_at ON project_designs;

-- Note: RLS policies are automatically dropped with the tables

-- ============================================================================
-- Success Message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Design tables dropped successfully!';
  RAISE NOTICE 'Removed: projects, project_designs, design_messages';
  RAISE NOTICE 'Application now uses prototype tables exclusively.';
END $$;
