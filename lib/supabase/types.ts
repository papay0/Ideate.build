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
       * Usage logs table - tracks AI generation costs
       * Stores token usage and calculated costs per generation
       */
      usage_logs: {
        Row: {
          id: string
          project_id: string              // Foreign key to prototype_projects
          user_id: string                 // Foreign key to users
          input_tokens: number            // Number of input tokens
          output_tokens: number           // Number of output tokens
          cached_tokens: number           // Number of cached input tokens
          input_cost: number              // Cost for input tokens in USD
          output_cost: number             // Cost for output tokens in USD
          total_cost: number              // Total cost in USD
          model: string                   // Model used (e.g., 'gemini-3-pro-preview')
          provider: string                // Provider (e.g., 'openrouter', 'gemini')
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          input_tokens: number
          output_tokens: number
          cached_tokens?: number
          input_cost: number
          output_cost: number
          total_cost: number
          model: string
          provider: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          input_tokens?: number
          output_tokens?: number
          cached_tokens?: number
          input_cost?: number
          output_cost?: number
          total_cost?: number
          model?: string
          provider?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "prototype_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }

      /**
       * Users table - stores user profile data synced from Clerk
       * Created on first sign-in, updated on subsequent sign-ins
       */
      users: {
        Row: {
          id: string                    // UUID primary key
          clerk_id: string              // Clerk user ID (unique)
          email: string                 // User's email
          name: string                  // Combined firstName + lastName
          avatar_url: string | null     // Profile image URL from Clerk
          role: 'regular' | 'admin'     // User role
          plan: 'free' | 'pro'          // Subscription plan
          stripe_customer_id: string | null  // Stripe customer ID
          messages_remaining: number    // Monthly messages left this period
          bonus_messages_remaining: number // Purchased messages (never expire)
          messages_reset_at: string     // When monthly messages reset
          created_at: string            // First sign-in timestamp
          updated_at: string            // Last profile update
          last_sign_in_at: string       // Last sign-in timestamp
          sign_in_count: number         // Total sign-in count
        }
        Insert: {
          id?: string
          clerk_id: string
          email: string
          name: string
          avatar_url?: string | null
          role?: 'regular' | 'admin'
          plan?: 'free' | 'pro'
          stripe_customer_id?: string | null
          messages_remaining?: number
          bonus_messages_remaining?: number
          messages_reset_at?: string
          created_at?: string
          updated_at?: string
          last_sign_in_at?: string
          sign_in_count?: number
        }
        Update: {
          id?: string
          clerk_id?: string
          email?: string
          name?: string
          avatar_url?: string | null
          role?: 'regular' | 'admin'
          plan?: 'free' | 'pro'
          stripe_customer_id?: string | null
          messages_remaining?: number
          bonus_messages_remaining?: number
          messages_reset_at?: string
          created_at?: string
          updated_at?: string
          last_sign_in_at?: string
          sign_in_count?: number
        }
        Relationships: []
      }

      /**
       * Subscriptions table - tracks active subscription details
       */
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_subscription_id: string | null
          stripe_price_id: string | null
          status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete'
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          status?: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete'
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          status?: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete'
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }

      /**
       * Message purchases table - tracks one-time message pack purchases
       */
      message_purchases: {
        Row: {
          id: string
          user_id: string
          stripe_payment_intent_id: string | null
          messages_purchased: number
          amount_cents: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_payment_intent_id?: string | null
          messages_purchased: number
          amount_cents: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_payment_intent_id?: string | null
          messages_purchased?: number
          amount_cents?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }

      /**
       * Audit logs table - tracks important user events for debugging
       */
      audit_logs: {
        Row: {
          id: string
          user_id: string | null           // Foreign key to users (nullable for deleted users)
          event_type: string               // Event type from AUDIT_EVENT_TYPES
          metadata: Record<string, unknown> // Event-specific metadata
          ip_address: string | null        // Client IP address
          user_agent: string | null        // Client user agent
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          event_type: string
          metadata?: Record<string, unknown>
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          event_type?: string
          metadata?: Record<string, unknown>
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }

      // ========================================================================
      // PROTOTYPE TABLES
      // ========================================================================

      /**
       * Prototype projects table - stores prototype projects
       * Main table for user prototypes with interactive screens
       */
      prototype_projects: {
        Row: {
          id: string
          user_id: string                  // Clerk user ID
          name: string                     // Project display name
          app_idea: string | null          // User's initial app description
          icon: string                     // Emoji icon for the project
          platform: 'mobile' | 'desktop'   // Target platform
          initial_image_url: string | null // Reference image URL
          model: string                    // AI model to use
          prototype_url: string | null     // Published prototype URL on R2
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          app_idea?: string | null
          icon?: string
          platform: 'mobile' | 'desktop'
          initial_image_url?: string | null
          model?: string
          prototype_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          app_idea?: string | null
          icon?: string
          platform?: 'mobile' | 'desktop'
          initial_image_url?: string | null
          model?: string
          prototype_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      /**
       * Prototype screens table - stores screens with grid positions
       * Each screen has a position on the canvas grid
       */
      prototype_screens: {
        Row: {
          id: string
          project_id: string               // Foreign key to prototype_projects
          screen_name: string              // Display name (e.g., "Home Screen")
          html_content: string             // Raw HTML with Tailwind CSS
          sort_order: number               // Order in the screen list
          grid_col: number                 // Grid column position for canvas
          grid_row: number                 // Grid row position for canvas
          is_root: boolean                 // True if this is the entry point screen
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          screen_name: string
          html_content: string
          sort_order?: number
          grid_col?: number
          grid_row?: number
          is_root?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          screen_name?: string
          html_content?: string
          sort_order?: number
          grid_col?: number
          grid_row?: number
          is_root?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prototype_screens_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "prototype_projects"
            referencedColumns: ["id"]
          }
        ]
      }

      /**
       * Prototype messages table - stores chat history for prototype projects
       */
      prototype_messages: {
        Row: {
          id: string
          project_id: string               // Foreign key to prototype_projects
          role: 'user' | 'assistant'       // Message sender
          content: string                  // Message text
          image_url: string | null         // Optional reference image URL
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          role: 'user' | 'assistant'
          content: string
          image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          role?: 'user' | 'assistant'
          content?: string
          image_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prototype_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "prototype_projects"
            referencedColumns: ["id"]
          }
        ]
      }

      /**
       * Prototype debug logs table - stores raw LLM output for debugging
       * Used to diagnose issues with screen parsing
       */
      prototype_debug_logs: {
        Row: {
          id: string
          project_id: string               // Foreign key to prototype_projects
          raw_output: string               // Complete raw LLM output
          parsed_screens_count: number | null  // Number of screens actually parsed
          expected_screens: string[] | null    // Screen names mentioned by AI
          actual_screens: string[] | null      // Screen names actually parsed
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          raw_output: string
          parsed_screens_count?: number | null
          expected_screens?: string[] | null
          actual_screens?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          raw_output?: string
          parsed_screens_count?: number | null
          expected_screens?: string[] | null
          actual_screens?: string[] | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prototype_debug_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "prototype_projects"
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

/** User row type */
export type User = Database['public']['Tables']['users']['Row']
/** User insert type */
export type UserInsert = Database['public']['Tables']['users']['Insert']
/** User update type */
export type UserUpdate = Database['public']['Tables']['users']['Update']

/** Usage log row type */
export type UsageLog = Database['public']['Tables']['usage_logs']['Row']
/** Usage log insert type */
export type UsageLogInsert = Database['public']['Tables']['usage_logs']['Insert']
/** Usage log update type */
export type UsageLogUpdate = Database['public']['Tables']['usage_logs']['Update']

/** Subscription row type */
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
/** Subscription insert type */
export type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert']
/** Subscription update type */
export type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update']

/** Message purchase row type */
export type MessagePurchase = Database['public']['Tables']['message_purchases']['Row']
/** Message purchase insert type */
export type MessagePurchaseInsert = Database['public']['Tables']['message_purchases']['Insert']
/** Message purchase update type */
export type MessagePurchaseUpdate = Database['public']['Tables']['message_purchases']['Update']

/** Audit log row type */
export type AuditLogRow = Database['public']['Tables']['audit_logs']['Row']
/** Audit log insert type */
export type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert']
/** Audit log update type */
export type AuditLogUpdate = Database['public']['Tables']['audit_logs']['Update']

// ============================================================================
// Prototype Helper Types
// ============================================================================

/** Prototype project row type */
export type PrototypeProject = Database['public']['Tables']['prototype_projects']['Row']
/** Prototype project insert type */
export type PrototypeProjectInsert = Database['public']['Tables']['prototype_projects']['Insert']
/** Prototype project update type */
export type PrototypeProjectUpdate = Database['public']['Tables']['prototype_projects']['Update']

/** Prototype screen row type */
export type PrototypeScreen = Database['public']['Tables']['prototype_screens']['Row']
/** Prototype screen insert type */
export type PrototypeScreenInsert = Database['public']['Tables']['prototype_screens']['Insert']
/** Prototype screen update type */
export type PrototypeScreenUpdate = Database['public']['Tables']['prototype_screens']['Update']

/** Prototype message row type */
export type PrototypeMessage = Database['public']['Tables']['prototype_messages']['Row']
/** Prototype message insert type */
export type PrototypeMessageInsert = Database['public']['Tables']['prototype_messages']['Insert']
/** Prototype message update type */
export type PrototypeMessageUpdate = Database['public']['Tables']['prototype_messages']['Update']

/** Prototype debug log row type */
export type PrototypeDebugLog = Database['public']['Tables']['prototype_debug_logs']['Row']
/** Prototype debug log insert type */
export type PrototypeDebugLogInsert = Database['public']['Tables']['prototype_debug_logs']['Insert']
