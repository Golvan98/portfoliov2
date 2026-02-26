import { NextResponse } from "next/server"
import { createClient, createServiceRoleClient } from "@/lib/supabase/server"

/**
 * Temporary debug route — call GET /api/debug-auth from the browser
 * while signed in to see what the server-side session looks like.
 * DELETE THIS ROUTE once auth is confirmed working.
 */
export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({
      status: "no_session",
      userError: userError?.message ?? null,
      message:
        "Server cannot see your session. The auth cookie may not be set. Try signing out and back in.",
    })
  }

  // Check app_admins via service role (bypasses RLS)
  const serviceClient = createServiceRoleClient()
  const { data: admin, error: adminError } = await serviceClient
    .from("app_admins")
    .select("*")
    .eq("user_id", user.id)
    .single()

  // Also check via session-scoped client to see if RLS blocks it
  const { data: adminRls, error: rlsError } = await supabase
    .from("app_admins")
    .select("*")
    .eq("user_id", user.id)
    .single()

  return NextResponse.json({
    status: "session_found",
    user: {
      id: user.id,
      email: user.email,
    },
    adminCheck: {
      serviceRole: { found: !!admin, data: admin, error: adminError?.message ?? null },
      sessionScoped: { found: !!adminRls, data: adminRls, error: rlsError?.message ?? null },
    },
    conclusion: admin
      ? "You ARE an admin. getAdminStatus() should return isAdmin=true."
      : "You are NOT in app_admins. Run the INSERT SQL in Supabase.",
  })
}
