import { createClient } from "@/lib/supabase/client"

export async function logActivity(params: {
  action: "create" | "update" | "delete"
  entity_type: "project" | "task"
  entity_id: string
  entity_title: string
  owner_id: string
}) {
  const supabase = createClient()
  await supabase.from("public_activity").insert({
    owner_id: params.owner_id,
    action: params.action,
    entity_type: params.entity_type,
    entity_id: params.entity_id,
    entity_title: params.entity_title,
  })
}
