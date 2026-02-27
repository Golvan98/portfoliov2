import { createHash } from "crypto"
import { NextResponse } from "next/server"
import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import Groq from "groq-sdk"

function hashIP(ip: string): string {
  return createHash("sha256").update(ip).digest("hex")
}

async function embedText(text: string): Promise<number[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        outputDimensionality: 768,
      }),
    }
  )

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Embedding failed (${res.status}): ${body}`)
  }

  const data = await res.json()
  return data.embedding.values
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

    // 3. Enforce quota via RPC (bypass for admin)
    const isAdmin = user?.email === "gilvinsz@gmail.com"
    const serviceClient = createServiceRoleClient()
    let remaining = Infinity

    if (!isAdmin) {
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

      remaining = quotaData[0].remaining
    }

    // 4. Embed the user question
    const qEmbedding = await embedText(message.trim())

    // 5. Similarity search — top K chunks via RPC
    const topK = parseInt(process.env.AGENT_TOP_K ?? "8")
    const { data: chunks, error: searchErr } = await serviceClient.rpc(
      "match_knowledge_chunks",
      {
        query_embedding: JSON.stringify(qEmbedding),
        match_threshold: 0.5,
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

    const systemPrompt = `You are Gilvin's portfolio assistant — a friendly, knowledgeable agent that speaks about Gilvin in the third person.

PERSONALITY:
- Introduce yourself as "Gilvin's portfolio assistant" on the first interaction.
- Always refer to Gilvin in third person: "Gilvin is…", "He works on…", "His experience includes…"
- Be warm, natural, and conversational. If someone asks a casual or off-topic question, just answer helpfully — no hard refusals.
- When asked what Gilvin is working on, currently doing, or similar — prioritize recent project and task context from the SOURCES below. Highlight in-progress tasks and active projects.

GROUNDING:
- For questions about Gilvin's work, projects, experience, or skills — use the provided SOURCES. Include inline citations: From <Source Title>: …
- Do NOT invent employers, roles, dates, or responsibilities not in the sources.
- If the sources don't cover a specific detail, say so briefly and move on — don't dwell on it.
- For casual conversation, greetings, or general questions — just respond naturally without needing sources.

FORMAT:
- Lead with a direct answer, then add 2–5 bullet points if helpful.
- Keep responses concise and recruiter-friendly.

SOURCES:
${sourcesText}`

    // 7. Call Groq chat completion
    const maxTokens = parseInt(process.env.AGENT_MAX_OUTPUT_TOKENS ?? "400")

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? "" })

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message.trim() },
      ],
      max_tokens: maxTokens,
    })

    const answer =
      completion.choices[0]?.message?.content ??
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

    // 9. Save chat history
    if (user) {
      try {
        await serviceClient.from("agent_chat_history").insert([
          { user_id: user.id, role: "user", content: message.trim(), sources: [] },
          { user_id: user.id, role: "assistant", content: answer, sources },
        ])
      } catch { /* non-blocking */ }
    } else {
      try {
        await serviceClient.from("anon_chat_history").insert([
          { hashed_ip: ipHash, role: "user", content: message.trim(), sources: [] },
          { hashed_ip: ipHash, role: "assistant", content: answer, sources },
        ])
      } catch { /* non-blocking */ }
    }

    const testingMode = process.env.TESTING_MODE === "on"
    return NextResponse.json({ answer, sources: testingMode ? sources : [], remaining })
  } catch (err) {
    console.error("Agent route error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
