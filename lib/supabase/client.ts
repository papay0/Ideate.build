/**
 * Supabase Browser Client
 *
 * Use this client for client-side (browser) operations.
 * This is typically used in React components with "use client" directive.
 *
 * @example
 * ```tsx
 * "use client"
 * import { createClient } from "@/lib/supabase/client"
 *
 * export function MyComponent() {
 *   const supabase = createClient()
 *   // Use supabase for client-side queries
 * }
 * ```
 */

import { createBrowserClient } from '@supabase/ssr'
import { Database } from './types'

/**
 * Creates a Supabase client for browser-side operations
 * @returns Typed Supabase client instance
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
