import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Check if user is an admin
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: admin } = await supabase
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
  }

  // Auth error → redirect to home
  return NextResponse.redirect(`${origin}/`)
}
