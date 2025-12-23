/**
 * Supabase Database Types
 *
 * This file defines TypeScript types for all database tables used in OpenDesign.
 * These types are used throughout the application for type-safe database operations.
 *
 * To regenerate these types from your Supabase schema, you can use:
 * npx supabase gen types typescript --project-id <your-project-id> > lib/supabase/types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/**
 * Database schema definition
 * Matches the Supabase PostgreSQL schema
 */
export interface Database {
  public: {
    Tables: {
      /**
       * Projects table - stores user projects
       * Each project contains an app idea and generated designs
       */
      projects: {
        Row: {
          id: string
          user_id: string          // Clerk user ID
          name: string             // Project display name
          app_idea: string | null  // User's initial app description
          icon: string             // Emoji icon for the project
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          app_idea?: string | null
          icon?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          app_idea?: string | null
          icon?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      /**
       * Project designs table - stores generated screen designs
       * Each design is an HTML string representing a UI screen (mobile or desktop)
       */
      project_designs: {
        Row: {
          id: string
          project_id: string       // Foreign key to projects
          screen_name: string      // Display name (e.g., "Home Screen", "Profile")
          html_content: string     // Raw HTML with Tailwind CSS
          sort_order: number       // Order in the screen list
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          screen_name: string
          html_content: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          screen_name?: string
          html_content?: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_designs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }

      /**
       * Design messages table - stores chat conversation history
       * Used to maintain context for follow-up design iterations
       */
      design_messages: {
        Row: {
          id: string
          project_id: string              // Foreign key to projects
          role: 'user' | 'assistant'      // Message sender
          content: string                 // Message text
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          role: 'user' | 'assistant'
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          role?: 'user' | 'assistant'
          content?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ============================================================================
// Helper Types - Use these throughout the application
// ============================================================================

/** Project row type */
export type Project = Database['public']['Tables']['projects']['Row']
/** Project insert type (for creating new projects) */
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
/** Project update type (for updating existing projects) */
export type ProjectUpdate = Database['public']['Tables']['projects']['Update']

/** Design row type */
export type ProjectDesign = Database['public']['Tables']['project_designs']['Row']
/** Design insert type */
export type ProjectDesignInsert = Database['public']['Tables']['project_designs']['Insert']
/** Design update type */
export type ProjectDesignUpdate = Database['public']['Tables']['project_designs']['Update']

/** Message row type */
export type DesignMessage = Database['public']['Tables']['design_messages']['Row']
/** Message insert type */
export type DesignMessageInsert = Database['public']['Tables']['design_messages']['Insert']
/** Message update type */
export type DesignMessageUpdate = Database['public']['Tables']['design_messages']['Update']
