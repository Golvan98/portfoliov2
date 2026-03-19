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

async function callGroqWithFallback(
  keys: string[],
  params: Parameters<Groq['chat']['completions']['create']>[0]
) {
  for (const key of keys) {
    try {
      const groq = new Groq({ apiKey: key })
      return await groq.chat.completions.create(params)
    } catch (err: any) {
      if (err?.status === 429) continue
      throw err
    }
  }
  throw new Error("All Groq API keys exhausted")
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

    const groqKeys = [
      process.env.GROQ_API_KEY,
      process.env.GROQ_API_KEY_2,
      process.env.GROQ_API_KEY_3,
    ].filter(Boolean) as string[]

    const fastMode = process.env.GROQ_FAST_MODE === "true"
    const groqModel = fastMode ? "llama-3.1-8b-instant" : "llama-3.3-70b-versatile"

    // 3.5. Query rewriting — resolve pronouns and classify intent using recent chat history
    let searchQuery = message.trim()
    let intent: "professional" | "casual" = "professional"
    let history: { role: string; content: string }[] = []

    try {
      if (user) {
        const { data } = await serviceClient
          .from("agent_chat_history")
          .select("role, content")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(4)
        history = (data ?? []).reverse()
      } else {
        const { data } = await serviceClient
          .from("anon_chat_history")
          .select("role, content")
          .eq("hashed_ip", ipHash)
          .order("created_at", { ascending: false })
          .limit(4)
        history = (data ?? []).reverse()
      }

      if (history.length > 0) {
        const historyText = history
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n")

        const rewriteCompletion = await callGroqWithFallback(groqKeys, {
          model: groqModel,
          messages: [
            {
              role: "system",
              content: `You are a search query optimizer. Given a conversation history and a new user message, do two things:
1. Rewrite the user message into a self-contained search query that resolves any pronouns or references using the conversation history. If the message is already self-contained, return it as-is.
2. Classify the intent as either "professional" (skills, projects, experience, contact) or "casual" (hobbies, personal life, free time).

Respond only in JSON: { "query": "rewritten query here", "intent": "professional" | "casual" }`,
            },
            {
              role: "user",
              content: `Conversation history:\n${historyText}\n\nNew message: ${message.trim()}`,
            },
          ],
          max_tokens: 200,
        })

        const rewriteRaw = rewriteCompletion.choices[0]?.message?.content ?? ""
        const rewritten = JSON.parse(rewriteRaw)
        if (rewritten.query && typeof rewritten.query === "string") {
          searchQuery = rewritten.query
        }
        if (rewritten.intent === "casual") {
          intent = "casual"
        }
      }
    } catch {
      // Fall back to raw message and default professional intent
    }

    // 4. Embed the user question (using rewritten query)
    const qEmbedding = await embedText(searchQuery)

    // 5. Similarity search — top K chunks via RPC
    const topK = parseInt(process.env.AGENT_TOP_K ?? "16")
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

    let workExperienceChunks: typeof chunks = []
    if (intent === "professional") {
      const { data: weDocs } = await serviceClient
        .from("knowledge_docs")
        .select("id, title, source_type, updated_at, content")
        .eq("owner_id", user?.id ?? "")
        .eq("source_type", "work_experience")

      if (weDocs) {
        workExperienceChunks = weDocs.map(doc => ({
          chunk_text: doc.content,
          doc_id: doc.id,
          chunk_index: 0,
          title: doc.title,
          source_type: doc.source_type,
          updated_at: doc.updated_at
        }))
      }
    }

    let softwareProjectChunks: typeof chunks = []
    if (intent === "professional") {
      const { data: projDocs } = await serviceClient
        .from("knowledge_docs")
        .select("id, title, source_type, updated_at, content")
        .eq("owner_id", user?.id ?? "")
        .eq("source_type", "project")

      if (projDocs) {
        softwareProjectChunks = projDocs.map(doc => ({
          chunk_text: doc.content,
          doc_id: doc.id,
          chunk_index: 0,
          title: doc.title,
          source_type: doc.source_type,
          updated_at: doc.updated_at
        }))
      }
    }

    const allChunks = [
      ...workExperienceChunks,
      ...softwareProjectChunks,
      ...(chunks ?? []).filter(c =>
        !workExperienceChunks.some(w => w.doc_id === c.doc_id) &&
        !softwareProjectChunks.some(p => p.doc_id === c.doc_id)
      )
    ]

    const cappedChunks = fastMode ? allChunks.slice(0, 8) : allChunks

    // 6. Build system prompt with retrieved sources
    const sourcesText =
      cappedChunks
        .map(
          (c: any, i: number) =>
            `[${i + 1}] Title: ${c.title} | Type: ${c.source_type} | Updated: ${c.updated_at}\nContent: ${c.chunk_text}`
        )
        .join("\n\n") || "(No sources found)"

    const systemPrompt = `You are Gilvin's portfolio assistant — a friendly, knowledgeable agent that speaks about Gilvin in the third person.

CRITICAL: Never fabricate, invent, or speculate about details that are not explicitly present in the SOURCES below. If information is not in the sources, say clearly that you don't have that detail. Do not add unverified GitHub contributions, invented achievements, speculative career history, or any detail you cannot directly trace to a source. When answering off-topic questions like coding challenges, answer helpfully but do not attach invented facts about Gilvin to the response.

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
- When referencing source titles, never wrap them in angle brackets. Write them as plain text only (e.g., "About Gilvin Zalsos", not "<About Gilvin Zalsos>").
- When listing items, always use the "•" bullet character. Never use asterisks ("*") for bullets.
- Never introduce yourself or state that you are Gilvin's portfolio assistant at the start of a response. Get straight to answering the question.
- Never cite sources inline within sentences using phrases like "From Project: X" or "From About Gilvin Zalsos". Use the source content to inform your answer but do not reference where it came from mid-sentence. Sources are displayed separately to the user.

INTENT:
${intent === "casual"
  ? "This is a casual query. You may reference personal interests, hobbies, and life outside of work."
  : "This is a professional query. Only reference projects, skills, and work experience. Do not mention personal errands, hobbies, or non-work projects unless directly asked."}

SOURCES:
${sourcesText}`

    // 7. Call Groq chat completion
    const maxTokens = parseInt(process.env.AGENT_MAX_OUTPUT_TOKENS ?? "400")

    const cleanedHistory = history.map(m => ({
      ...m,
      content: m.role === "assistant"
        ? m.content.replace(/^Gilvin's portfolio assistant here[.,]?\s*/i, '').trim()
        : m.content
    }))

    const completion = await callGroqWithFallback(groqKeys, {
      model: groqModel,
      messages: [
        { role: "system", content: systemPrompt },
        ...cleanedHistory.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user", content: message.trim() },
      ],
      max_tokens: maxTokens,
    })

    const answer =
      completion.choices[0]?.message?.content ??
      "I couldn't generate a response."
    const cleanedAnswer = answer
      .replace(/\[\d+\]/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/<([^>]+)>/g, '$1')
      .replace(/^(I am|I'm) Gilvin's portfolio assistant[.,]?\s*/i, '')
      .replace(/^Gilvin's portfolio assistant here[.,]?\s*/i, '')
      .replace(/^Hello,?\s*(I am|I'm) Gilvin's portfolio assistant[.,]?\s*/i, '')
      .replace(/From [^:]+:\s*/g, '')
      .replace(/\*/g, '•')
      .trim()

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
        const { error: histErr } = await serviceClient
          .from("agent_chat_history")
          .insert([
            { user_id: user.id, role: "user", content: message.trim(), sources: [] },
            { user_id: user.id, role: "assistant", content: cleanedAnswer, sources },
          ])
        if (histErr) console.error("Failed to save agent chat history:", histErr)
      } catch (e) {
        console.error("Failed to save agent chat history:", e)
      }
    } else {
      try {
        const { error: histErr } = await serviceClient
          .from("anon_chat_history")
          .insert([
            { hashed_ip: ipHash, role: "user", content: message.trim(), sources: [] },
            { hashed_ip: ipHash, role: "assistant", content: cleanedAnswer, sources },
          ])
        if (histErr) console.error("Failed to save anon chat history:", histErr)
      } catch (e) {
        console.error("Failed to save anon chat history:", e)
      }
    }

    const testingMode = process.env.TESTING_MODE === "on"
    return NextResponse.json({ answer: cleanedAnswer, sources: testingMode ? sources : [], remaining })
  } catch (err) {
    console.error("Agent route error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
