# AI Agent Request Lifecycle — Full Pipeline Map

## Stage 1: User Message Sent (Client)

**File:** `components/chat-widget.tsx:107` — `handleSend()`

- **In:** Form submit event with `input` string state
- **Out:** `POST /api/agent` with body `{ message: string }`
- **Processing:** Trims whitespace, guards against empty/duplicate sends, appends a user `Message` object to local state, sets `isTyping = true`. No transformation to the message content itself — raw trimmed string is sent.

---

## Stage 2: History Load (Client, on mount — parallel/prior path)

**File:** `components/chat-widget.tsx:83` — `loadHistory()`

- **In:** Authenticated user session
- **Out:** `GET /api/agent/history` → returns last 20 messages from `agent_chat_history`
- **Processing:** Maps DB rows (`role`, `content`, `sources`) into local `Message[]` objects. Sorts chronologically. Prepends static `starterMessage`. **Note: history is display-only — it is NOT sent to the LLM as conversation context (gap flagged in Stage 6).**

---

## Stage 3: Route Handler — Auth, IP Hashing, Quota Enforcement

**File:** `app/api/agent/route.ts:32` — `POST()`

- **In:** `{ message: string }` from request body
- **Out:** Either a 429 rejection (quota exceeded) or flow continues
- **Processing:**
  1. Validates message is a non-empty string (line 37)
  2. Gets user session via Supabase cookie auth (line 46)
  3. SHA-256 hashes the client IP for anonymous tracking (line 52, `hashIP()`)
  4. Calls `consume_agent_quota` RPC in Supabase — passes `user_id` (or null) and `ip_hash`. Admin (`gilvinsz@gmail.com`) bypasses quota entirely (line 56). Returns `{ allowed, remaining }`.

---

## Stage 4: Query Embedding

**File:** `app/api/agent/route.ts:93` + `app/api/agent/route.ts:10` — `embedText()`

- **In:** Raw trimmed user message string (no modification, no query rewriting)
- **Out:** `number[]` — a 768-dimension embedding vector
- **Processing:** Calls Gemini `gemini-embedding-001` API with `outputDimensionality: 768`. The query sent to the vector store is the **raw user message as-is** — no rephrasing, no keyword extraction, no history-aware reformulation.
- **GAP:** No query rewriting or expansion. A follow-up like "tell me more about that" will embed literally, with no reference resolution against prior turns.

---

## Stage 5: Vector Similarity Search (Retrieval)

**File:** `app/api/agent/route.ts:96-112`

- **In:** JSON-stringified embedding vector, threshold `0.5`, count = `AGENT_TOP_K` (default `8`)
- **Out:** Array of chunk objects: `{ chunk_text, doc_id, chunk_index, title, source_type, updated_at }`
- **Processing:** Calls Supabase RPC `match_knowledge_chunks` which runs a pgvector cosine distance query (`<=>` operator) against `knowledge_chunks`, JOINed to `knowledge_docs` for metadata. Service role client used (bypasses RLS). Threshold of 0.5 filters out low-relevance chunks.
- **Chunk format:** Plain text blobs in structured key-value format (e.g., `"Project: X\nCategory: Y\nDescription: Z\nUpdated: ..."`), as defined in `lib/rag/sync-knowledge-doc.ts:73-130`.

---

## Stage 6: Context Assembly — System Prompt Construction

**File:** `app/api/agent/route.ts:115-144`

- **In:** Retrieved chunks array
- **Out:** Complete system prompt string with embedded sources
- **Processing:**
  1. Maps each chunk into a numbered citation block: `[1] Title: ... | Type: ... | Updated: ...\nContent: ...`
  2. Joins with double newlines, falls back to `"(No sources found)"` if empty
  3. Injects into a hardcoded system prompt template containing personality instructions, grounding rules, and format guidance
- **GAP:** No deduplication of chunks. No re-ranking after retrieval. No token budget management — if 8 large chunks are returned, the system prompt could get very long with no truncation logic.

---

## Stage 7: LLM Call

**File:** `app/api/agent/route.ts:147-158`

- **In:** `messages` array with exactly 2 items: `[system prompt, user message]`
- **Out:** `completion.choices[0].message.content` — the raw LLM answer string
- **Processing:** Calls **Groq API** using model `llama-3.1-8b-instant`. Max tokens capped by `AGENT_MAX_OUTPUT_TOKENS` (default `400`).
- **GAP: No conversation history sent to LLM.** Each request is stateless — only `[system, current_user_message]`. The agent cannot reference prior turns. This is the biggest architectural gap.
- **GAP: Spec drift** — `AGENT_SPEC.md` says the chat model is `gemini-2.0-flash`, but the actual implementation uses Groq's `llama-3.1-8b-instant`.

---

## Stage 8: Response Formatting & Source Metadata

**File:** `app/api/agent/route.ts:160-172`

- **In:** Raw LLM answer string + chunks array
- **Out:** Formatted `{ answer, sources, remaining }` JSON
- **Processing:**
  1. Extracts answer text with fallback `"I couldn't generate a response."`
  2. Maps chunks into source citation objects: `{ source_type, title, snippet (first 150 chars), updated_at, doc_id, chunk_index }`
  3. **Conditional:** If `TESTING_MODE !== "on"`, sources array is returned as `[]` to the client (line 202). In production, clients get no source metadata.

---

## Stage 9: Chat History Persistence

**File:** `app/api/agent/route.ts:175-199`

- **In:** User message + LLM answer + sources + user identity
- **Out:** Two rows inserted into Supabase (one `user`, one `assistant`)
- **Processing:**
  - Authenticated users → `agent_chat_history` table (keyed by `user_id`)
  - Anonymous users → `anon_chat_history` table (keyed by `hashed_ip`)
  - Failures are caught and logged but do not block the response

---

## Stage 10: Response Delivery (Client)

**File:** `components/chat-widget.tsx:117-169` — inside `handleSend()`

- **In:** JSON response `{ answer, sources, remaining }`
- **Out:** New `Message` object appended to local state
- **Processing:**
  1. Handles 429 (quota exceeded) → sets `quotaExceeded` state, shows limit message
  2. Handles non-OK → generic error message
  3. On success → appends agent message with `data.answer` and `data.sources`
  4. Updates `remaining` counter for UI nudge bar
  5. Source citations rendered below agent bubbles: filtered (excludes `Task:` titles), deduplicated by `doc_id`, capped at 4, with relative timestamps via `timeAgo()`

---

## Offline/Background Pipeline: Document Ingestion

This is a separate pipeline that populates the vector store:

1. **`lib/rag/sync-knowledge-doc.ts:15` — `syncKnowledgeDoc()`**: Called on CRUD of projects/tasks/notes. Upserts into `knowledge_docs`, sets `needs_embedding = true` if content hash changed.
2. **`app/api/embed/route.ts:32` — `POST()`**: Batch endpoint (auth'd via `EMBED_SECRET`). Finds all docs with `needs_embedding = true`, chunks them via `lib/rag/chunk.ts:7` — `chunkContent()`, embeds each chunk via Gemini, stores in `knowledge_chunks`, marks doc as embedded.
3. **`lib/rag/chunk.ts:7` — `chunkContent()`**: If content <= 2000 chars, single chunk. Otherwise, sliding window of 1200 chars with 150-char overlap.

---

## Summary of Gaps

| Gap | Location | Impact |
|---|---|---|
| **No conversation history sent to LLM** | `route.ts:151-158` | Agent is stateless per-turn; can't handle follow-ups |
| **No query rewriting** | `route.ts:93` | Raw message is embedded; "tell me more" or pronoun references won't retrieve relevant chunks |
| **No chunk deduplication or re-ranking** | `route.ts:115-121` | Duplicate or near-duplicate chunks can waste context window |
| **No token budget for context** | `route.ts:115-144` | Large chunks could exceed model context with no truncation |
| **Spec drift on LLM model** | `route.ts:149-151` vs `AGENT_SPEC.md:112` | Spec says `gemini-2.0-flash`, code uses Groq `llama-3.1-8b-instant` |
| **Sources hidden in production** | `route.ts:202` | `TESTING_MODE` gate means clients get empty sources array unless testing is on |
