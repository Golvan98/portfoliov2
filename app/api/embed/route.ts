import { createHash } from "crypto"
import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { chunkContent } from "@/lib/rag/chunk"
import { GoogleGenerativeAI } from "@google/generative-ai"

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex")
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "")
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" })

async function embedText(text: string): Promise<number[]> {
  const result = await embeddingModel.embedContent(text)
  return result.embedding.values
}

export async function POST(request: Request) {
  // Authenticate via shared secret
  const secret = request.headers.get("x-embed-secret")
  if (!process.env.EMBED_SECRET || secret !== process.env.EMBED_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  // Find docs needing embedding
  const { data: docs, error: fetchErr } = await supabase
    .from("knowledge_docs")
    .select("*")
    .eq("needs_embedding", true)

  if (fetchErr) {
    return NextResponse.json(
      { error: "Failed to fetch docs", detail: fetchErr.message },
      { status: 500 }
    )
  }

  if (!docs || docs.length === 0) {
    return NextResponse.json({ message: "No docs to embed", processed: 0 })
  }

  let processed = 0
  const errors: string[] = []

  for (const doc of docs) {
    try {
      // Chunk content
      const chunks = chunkContent(doc.content)

      // Delete existing chunks for this doc
      await supabase
        .from("knowledge_chunks")
        .delete()
        .eq("doc_id", doc.id)

      // Embed and insert each chunk
      for (let i = 0; i < chunks.length; i++) {
        const embedding = await embedText(chunks[i])
        const chunkHash = sha256(chunks[i])

        await supabase.from("knowledge_chunks").insert({
          owner_id: doc.owner_id,
          doc_id: doc.id,
          chunk_index: i,
          chunk_text: chunks[i],
          chunk_hash: chunkHash,
          embedding,
        })
      }

      // Mark doc as embedded
      await supabase
        .from("knowledge_docs")
        .update({
          needs_embedding: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", doc.id)

      processed++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`Doc ${doc.id} (${doc.title}): ${msg}`)
    }
  }

  return NextResponse.json({
    message: "Embedding complete",
    processed,
    total: docs.length,
    errors: errors.length > 0 ? errors : undefined,
  })
}
