import { createHash } from "crypto"
import { NextResponse } from "next/server"
import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

function hashIP(ip: string): string {
  return createHash("sha256").update(ip).digest("hex")
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "")
const embeddingModel = genAI.getGenerativeModel({ model: "models/text-embedding-004" })

async function embedText(text: string): Promise<number[]> {
  const result = await embeddingModel.embedContent(text)
  return result.embedding.values
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const message = body?.message

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    // 1. Get user session
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // 2. Hash IP (never store raw)
    const forwarded = request.headers.get("x-forwarded-for")
    const ip = forwarded?.split(",")[0]?.trim() ?? "unknown"
    const ipHash = hashIP(ip)

    // 3. Enforce quota via RPC (SECURITY DEFINER — bypasses RLS)
    const serviceClient = createServiceRoleClient()
    const { data: quotaData, error: quotaErr } = await serviceClient.rpc(
      "consume_agent_quota",
      {
        p_user_id: user?.id ?? null,
        p_ip_hash: ipHash,
        p_cost: 1,
      }
    )

    if (quotaErr || !quotaData?.[0]) {
      return NextResponse.json(
        { error: "Quota check failed" },
        { status: 500 }
      )
    }

    if (!quotaData[0].allowed) {
      return NextResponse.json(
        {
          error: "quota_exceeded",
          remaining: 0,
          message:
            "You have reached your daily limit. Sign in with Google for a higher quota.",
        },
        { status: 429 }
      )
    }

    const remaining: number = quotaData[0].remaining

    // 4. Embed the user question
    const qEmbedding = await embedText(message.trim())

    // 5. Similarity search — top K chunks via RPC
    const topK = parseInt(process.env.AGENT_TOP_K ?? "8")
    const { data: chunks, error: searchErr } = await serviceClient.rpc(
      "match_knowledge_chunks",
      {
        query_embedding: JSON.stringify(qEmbedding),
        match_count: topK,
      }
    )

    if (searchErr) {
      console.error("Similarity search error:", searchErr)
      return NextResponse.json(
        { error: "Search failed" },
        { status: 500 }
      )
    }

    // 6. Build system prompt with retrieved sources
    const sourcesText =
      (chunks ?? [])
        .map(
          (c: any, i: number) =>
            `[${i + 1}] Title: ${c.title} | Type: ${c.source_type} | Updated: ${c.updated_at}\nContent: ${c.chunk_text}`
        )
        .join("\n\n") || "(No sources found)"

    const systemPrompt = `You are "Gilvin's Portfolio Assistant" — a helpful, grounded agent that answers recruiter questions about Gilvin's work, projects, and experience.

RULES (must follow):
1. Use ONLY the provided SOURCES to answer. Do not use external knowledge.
2. Do NOT invent dates, employers, roles, responsibilities, or any detail not explicitly in the sources.
3. If the sources do not contain the answer, say exactly: "I don't have that detail in my portfolio data."
4. If the question is unrelated to Gilvin's work or professional experience, say: "I'm here to answer questions about Gilvin's work and experience. Feel free to ask me anything about his projects or background."
5. Always include inline citations when using a fact: From <Source Title> (updated <date>): …
6. Prefer concise, recruiter-friendly formatting: lead with the direct answer, then 2–5 bullet points for responsibilities, tools, or outcomes if available.

SOURCES:
${sourcesText}`

    // 7. Call Gemini chat completion
    const maxTokens = parseInt(process.env.AGENT_MAX_OUTPUT_TOKENS ?? "400")

    const chatModel = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemPrompt,
    })

    const completionResult = await chatModel.generateContent({
      contents: [{ role: "user", parts: [{ text: message.trim() }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    })

    const answer =
      completionResult.response.text() ??
      "I couldn't generate a response."

    // 8. Build sources array for the client
    const sources = (chunks ?? []).map((c: any) => ({
      source_type: c.source_type,
      title: c.title,
      snippet: c.chunk_text.slice(0, 150),
      updated_at: c.updated_at,
      doc_id: c.doc_id,
      chunk_index: c.chunk_index,
    }))

    return NextResponse.json({ answer, sources, remaining })
  } catch (err) {
    console.error("Agent route error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
