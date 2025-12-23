/**
 * Supabase Server Client
 *
 * Use this client for server-side operations (Server Components, API routes, etc.)
 * This client handles cookie-based authentication for SSR.
 *
 * @example
 * ```tsx
 * // In a Server Component or API route
 * import { createClient } from "@/lib/supabase/server"
 *
 * export default async function Page() {
 *   const supabase = await createClient()
 *   const { data } = await supabase.from('projects').select()
 *   // ...
 * }
 * ```
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from './types'

/**
 * Creates a Supabase client for server-side operations
 * Must be called with await as it accesses cookies asynchronously
 *
 * @returns Typed Supabase client instance configured for server use
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
