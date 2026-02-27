import { createClient } from "@/lib/supabase/client"

// --- SHA-256 via Web Crypto (browser-safe) ---

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// --- Upsert knowledge_docs on (source_type, source_id) ---

export async function syncKnowledgeDoc(params: {
  sourceType: string
  sourceId: string
  title: string
  content: string
  ownerId: string
}): Promise<void> {
  const hash = await sha256(params.content)
  const supabase = createClient()

  const { data: existing } = await supabase
    .from("knowledge_docs")
    .select("id, content_hash")
    .eq("source_type", params.sourceType)
    .eq("source_id", params.sourceId)
    .maybeSingle()

  if (existing) {
    if (existing.content_hash !== hash) {
      await supabase
        .from("knowledge_docs")
        .update({
          title: params.title,
          content: params.content,
          content_hash: hash,
          needs_embedding: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
    }
  } else {
    await supabase.from("knowledge_docs").insert({
      owner_id: params.ownerId,
      source_type: params.sourceType,
      source_id: params.sourceId,
      title: params.title,
      content: params.content,
      content_hash: hash,
      needs_embedding: true,
    })
  }
}

// --- Delete knowledge_docs row (chunks cascade) ---

export async function deleteKnowledgeDoc(
  sourceType: string,
  sourceId: string
): Promise<void> {
  await createClient()
    .from("knowledge_docs")
    .delete()
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
}

// --- Content blob builders (formats from RAG_LITE.md) ---

export function buildProjectContent(p: {
  title: string
  categoryName: string
  description: string | null
  updatedAt: string
  taskSummary?: { todo: number; in_progress: number; done: number }
}): { title: string; content: string } {
  const lines = [
    `Project: ${p.title}`,
    `Category: ${p.categoryName}`,
    `Description: ${p.description ?? ""}`,
  ]
  if (p.taskSummary) {
    const { todo, in_progress, done } = p.taskSummary
    lines.push(
      `Tasks: ${todo + in_progress + done} total (${todo} to-do, ${in_progress} in progress, ${done} done)`
    )
  }
  lines.push(`Updated: ${p.updatedAt}`)
  return {
    title: `Project: ${p.title}`,
    content: lines.join("\n"),
  }
}

export function buildTaskContent(p: {
  title: string
  projectTitle: string
  status: string
  updatedAt: string
}): { title: string; content: string } {
  return {
    title: `Task: ${p.title}`,
    content: [
      `Task: ${p.title}`,
      `Project: ${p.projectTitle}`,
      `Status: ${p.status}`,
      `Updated: ${p.updatedAt}`,
    ].join("\n"),
  }
}

export function buildNoteContent(p: {
  taskTitle: string
  projectTitle: string
  body: string
  updatedAt: string
}): { title: string; content: string } {
  return {
    title: `Note (Task: ${p.taskTitle})`,
    content: [
      `Note for Task: ${p.taskTitle}`,
      `Project: ${p.projectTitle}`,
      `Body: ${p.body}`,
      `Updated: ${p.updatedAt}`,
    ].join("\n"),
  }
}
