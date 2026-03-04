import { NextResponse } from "next/server"
import { createClient, createServiceRoleClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ messages: [] })
  }

  const serviceClient = createServiceRoleClient()
  const { data, error } = await serviceClient
    .from("agent_chat_history")
    .select("role, content, sources")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20)

  if (error) {
    console.error("Failed to fetch agent chat history:", error)
    return NextResponse.json({ messages: [] })
  }

  // Fetched newest-first for correct LIMIT, reverse to chronological for display
  const messages = (data ?? []).reverse()
  console.log(`[agent/history] user=${user.id} rows=${messages.length}`)
  return NextResponse.json({ messages })
}
