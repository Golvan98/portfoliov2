import { createClient, createServiceRoleClient } from "@/lib/supabase/server"

/**
 * Server-side check: is the current session user in app_admins?
 * Returns { isAdmin: boolean, userId: string | null }
 *
 * Uses session-scoped client for getUser() (reads auth cookies),
 * then service role client for the app_admins lookup (bypasses RLS
 * to avoid circular policy issues).
 */
export async function getAdminStatus(): Promise<{
  isAdmin: boolean
  userId: string | null
}> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { isAdmin: false, userId: null }
  }

  // Use service role to bypass RLS on app_admins
  const serviceClient = createServiceRoleClient()
  const { data: admin } = await serviceClient
    .from("app_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .single()

  return { isAdmin: !!admin, userId: user.id }
}
