# Recruiter Agent (Gemini + RAG-lite)

## Endpoint

```
POST /api/agent
Body: { message: string }
```

---

## Steps (LOCKED — execute in this order)

1. **Enforce quota (hybrid)**
   - If user is logged in → check `agent_usage_user_daily` via `consume_agent_quota` RPC
   - If anonymous → check `agent_usage_ip_daily` via `consume_agent_quota` RPC (hashed IP)
   - If quota exceeded → return 429 with remaining = 0, do NOT call Gemini

2. **Embed the user question**
   - Call Gemini embeddings API (`text-embedding-004`) with the user's message → `q_embedding`

3. **Similarity search**
   - Query `knowledge_chunks` via pgvector cosine distance
   - Return top K chunks (default `AGENT_TOP_K` = 8)
   - Include: `chunk_text`, `doc_id`, `chunk_index`, `title`, `source_type`, `updated_at`
   - Use service role client (never anon client)

4. **Build answer**
   - Pass retrieved chunks as SOURCES into the system prompt (see template below)
   - Answer ONLY from retrieved chunks

5. **Return response**
   - Shape: see Response Shape section below

---

## Response Shape

```ts
{
  answer: string,
  sources: [
    {
      source_type: string,    // 'project' | 'task' | 'note' | 'portfolio_project'
      title: string,
      snippet: string,        // first ~150 chars of chunk_text
      updated_at: string,
      doc_id: string,
      chunk_index: number
    }
  ]
}
```

On quota exceeded:
```ts
{
  error: 'quota_exceeded',
  remaining: 0,
  message: 'You have reached your daily limit. Sign in with Google for a higher quota.'
}
```

---

## System Prompt Template (LOCKED)

Use this exact system message. Do not modify guardrails or citation format.

```
You are "Gilvin's Portfolio Assistant" — a helpful, grounded agent that answers recruiter questions about Gilvin's work, projects, and experience.

RULES (must follow):
1. Use ONLY the provided SOURCES to answer. Do not use external knowledge.
2. Do NOT invent dates, employers, roles, responsibilities, or any detail not explicitly in the sources.
3. If the sources do not contain the answer, say exactly: "I don't have that detail in my portfolio data."
4. If the question is unrelated to Gilvin's work or professional experience, say: "I'm here to answer questions about Gilvin's work and experience. Feel free to ask me anything about his projects or background."
5. Always include inline citations when using a fact: From <Source Title> (updated <date>): …
6. Prefer concise, recruiter-friendly formatting: lead with the direct answer, then 2–5 bullet points for responsibilities, tools, or outcomes if available.

SOURCES:
{sources}
```

Where `{sources}` is formatted as:
```
[1] Title: {title} | Type: {source_type} | Updated: {updated_at}
Content: {chunk_text}

[2] Title: {title} | Type: {source_type} | Updated: {updated_at}
Content: {chunk_text}
...
```

---

## Citation Style (LOCKED)

Inline citations in the answer body:
- `From Task: Implement RLS policies (updated 2026-02-19): …`
- `From Project: MyHeadSpace v2 (updated 2026-02-19): …`
- `From Portfolio: ClipNET (updated 2026-02-19): …`

---

## Guardrails Summary

- No invented details — ever.
- No answer without source support.
- Out-of-scope questions get a polite redirect, not a hallucinated answer.
- Max output tokens enforced via `AGENT_MAX_OUTPUT_TOKENS` env var (default: 400).
- Chat model: `gemini-2.0-flash` via `@google/generative-ai` SDK.
- Embedding model: `text-embedding-004` (768 dimensions).
