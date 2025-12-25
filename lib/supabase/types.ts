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
          platform: 'mobile' | 'desktop'  // Target platform for designs
          initial_image_url: string | null  // Reference image attached during creation
          model: string            // AI model to use (e.g., 'gemini-3-flash-preview')
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          app_idea?: string | null
          icon?: string
          platform: 'mobile' | 'desktop'  // Required: mobile or desktop
          initial_image_url?: string | null  // Reference image attached during creation
          model?: string           // AI model to use (defaults to 'gemini-3-flash-preview')
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
          initial_image_url?: string | null  // Reference image attached during creation
          model?: string           // AI model to use
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
          image_url: string | null        // Optional reference image URL
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          role: 'user' | 'assistant'
          content: string
          image_url?: string | null       // Optional reference image URL
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          role?: 'user' | 'assistant'
          content?: string
          image_url?: string | null       // Optional reference image URL
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

      /**
       * Usage logs table - tracks AI generation costs
       * Stores token usage and calculated costs per generation
       */
      usage_logs: {
        Row: {
          id: string
          project_id: string              // Foreign key to projects
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
            referencedRelation: "projects"
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
