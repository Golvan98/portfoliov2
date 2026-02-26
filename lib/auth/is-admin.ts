import { createClient } from "@/lib/supabase/server"

/**
 * Server-side check: is the current session user in app_admins?
 * Returns { isAdmin: boolean, userId: string | null }
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

  const { data: admin } = await supabase
    .from("app_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .single()

  return { isAdmin: !!admin, userId: user.id }
}
