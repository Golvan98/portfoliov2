import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  if (code) {
    const cookieStore = await cookies()

    // Create Supabase client inline — no try-catch on setAll
    // so cookie-setting errors surface instead of being swallowed.
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Check if user is an admin (service role bypasses RLS)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const serviceClient = createServiceRoleClient()
        const { data: admin } = await serviceClient
          .from("app_admins")
          .select("user_id")
          .eq("user_id", user.id)
          .single()

        if (admin) {
          return NextResponse.redirect(`${origin}/myheadspace`)
        }
      }

      // Non-admin → redirect to home
      return NextResponse.redirect(`${origin}/`)
    }

    console.error("Auth callback: exchangeCodeForSession failed", error)
  }

  // Auth error or no code → redirect to home
  return NextResponse.redirect(`${origin}/`)
}
