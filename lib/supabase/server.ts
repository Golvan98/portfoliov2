import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

/**
 * Server-side Supabase client that respects the user's auth session.
 * Use this in Server Components, Server Actions, and Route Handlers
 * where you need RLS-scoped queries.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
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
            // setAll can fail in Server Components (read-only).
            // Safe to ignore — middleware handles refresh.
          }
        },
      },
    }
  )
}

/**
 * Service-role client — bypasses RLS.
 * Use ONLY in server-side API routes for:
 *   - /api/agent (knowledge_chunks queries, quota RPC)
 *   - /api/embed (knowledge_docs/knowledge_chunks writes)
 * Never import this in client components.
 */
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
