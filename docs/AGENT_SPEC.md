# Recruiter Agent (Groq chat + Gemini embeddings + RAG-lite)

## Current chat runtime

Both Stage 3.5 query rewriting / intent classification and Stage 7 answer generation use the same selected model through the Groq API and `groq-sdk`. `GROQ_MODEL` optionally overrides the normal default `openai/gpt-oss-120b`. With `GROQ_FAST_MODE=true`, `GROQ_FAST_MODEL` optionally overrides the fast default `openai/gpt-oss-20b`. GPT-OSS is hosted by Groq, not run locally. See [ENV.md](ENV.md) for configuration and the preserved three-key fallback.

Current behavior below is verified against the route at `ea2bb82`. The original prompt is retained in an explicitly historical section.

## Endpoint

```
POST /api/agent
Body: { message: string }
```

---

## Current request flow

1. Validate `{ message: string }`, resolve session and hash the forwarded IP.
2. For non-admin visitors, consume one question via `consume_agent_quota` before any Groq rewrite/completion or Gemini query-embedding call. Admin email bypasses quota. `/api/embed` has separate secret authentication and does not consume visitor quota.
3. Select the Groq model; read up to four history messages. When history exists, attempt query rewriting and professional/casual classification; otherwise use the raw question and professional intent. Rewrite failure falls back without failing the request.
4. Embed the search query using Gemini `gemini-embedding-001` with 768 dimensions.
5. Call service-role `match_knowledge_chunks` with threshold 0.5 and `AGENT_TOP_K` (default 16). Professional queries attempt supplemental project/work-experience docs filtered by the visitor's `owner_id`; this does not guarantee Gilvin's docs for every visitor. Merge supplements with vector results, removing overlap by doc ID; fast mode caps merged context at eight entries.
6. Generate a grounded answer with Groq using system prompt, history and original question. Clean citation/formatting artifacts, save history, return answer, sources and remaining quota.

The detailed current behavior and limitations are in [agent_pipeline.md](agent_pipeline.md). The GPT-OSS migration intentionally left this RAG flow unchanged.

## Current answer behavior and correctness limits

The prompt asks for third-person, concise, recruiter-friendly answers grounded in supplied evidence about Gilvin, and admits missing details. Casual/off-topic conversation is allowed. Professional intent asks the model to avoid unsolicited personal/hobby content. These are instructions, not guarantees of correctness.

FORMAT instructions suppress introductions and inline citations, despite earlier conflicting instructions in the same prompt; post-processing removes common introduction and citation patterns. Separate source metadata is built from vector results, not the exact merged/capped context. POST sources are gated by `TESTING_MODE`; stored history sources are not gated by the history endpoint.

For “current/latest” questions, the prompt asks the model to prioritize recent/in-progress sources. **There is no dedicated temporal routing, live task/project/activity lookup, or explicit recency ordering in the route.** The user-reported production test returned a March 6 task while `/now` showed recent ClipNET activity. This remains an active correctness issue; see [ROADMAP.md](ROADMAP.md) lanes 2–3. Answer-quality problems such as an elaborate response to “hey” and unsolicited personal details remain open as well.

---

## Response Shape

```ts
{
  answer: string,
  sources: [
    {
      source_type: string,    // project, task, note, portfolio_project, work_experience, personal_info
      title: string,
      snippet: string,        // first ~150 chars of chunk_text
      updated_at: string,
      doc_id: string,
      chunk_index: number
    }
  ],
  remaining: number | null // null for admin bypass (Infinity serialized as JSON)
}
```

On visitor quota exceeded (HTTP 429):
```ts
{
  error: 'quota_exceeded',
  remaining: 0,
  message: 'You have reached your daily limit. Sign in with Google for a higher quota.'
}
```

On AI provider or runtime failure (HTTP 503 for missing Groq configuration or `Groq.APIError` failures; HTTP 500 for other runtime failures):
```ts
{
  error: 'ai_unavailable',
  message: 'The AI assistant is temporarily unavailable. Please try again shortly.'
}
```

Missing configuration, provider rate limits, and provider errors are distinguished internally without returning provider response bodies, credentials, or stack traces. Among error responses, only HTTP 429 with `error: 'quota_exceeded'` marks visitor quota exhausted in the chat UI. A successful reply with `remaining: 0` also disables further sends. Other HTTP failures display the safe backend message, or the generic AI-unavailable message when the response has no message. Network failures retain a separate network-error message.

---

## HISTORICAL — Original system prompt template (superseded)

Preserved as the original MVP specification, not the current runtime prompt or instructions to restore it. The route now permits casual/off-topic replies and suppresses inline citations; see Current answer behavior above.

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

## HISTORICAL — Original citation style (superseded)

Inline citations in the answer body:
- `From Task: Implement RLS policies (updated 2026-02-19): …`
- `From Project: MyHeadSpace v2 (updated 2026-02-19): …`
- `From Portfolio: ClipNET (updated 2026-02-19): …`

---

## Current guardrails summary

- Prompt instructions prohibit invented facts about Gilvin; enforcement and regression coverage remain refinement work.
- Portfolio answers should be grounded in supplied evidence; greetings/general conversation need not use sources.
- Missing details should be acknowledged briefly; casual/off-topic questions can receive helpful replies.
- Max output tokens enforced via `AGENT_MAX_OUTPUT_TOKENS` env var (default: 400).
- Chat model: Groq-hosted `openai/gpt-oss-120b` by default, `openai/gpt-oss-20b` with `GROQ_FAST_MODE=true`, via `groq-sdk`. Optional overrides: `GROQ_MODEL`, `GROQ_FAST_MODEL`.
- Embedding model: `gemini-embedding-001` (768 dimensions).
