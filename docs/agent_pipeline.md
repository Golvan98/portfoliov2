# AI Agent Request Lifecycle — Current Pipeline

Verified against `app/api/agent/route.ts`, `app/api/agent/history/route.ts`, `components/chat-widget.tsx`, and ingestion helpers at `ea2bb82`. GPT-OSS changed model selection and failure handling, not RAG behavior. See [AGENT_SPEC.md](AGENT_SPEC.md) for the contract and [ROADMAP.md](ROADMAP.md) for future work.

## Stage 1: Client request and display history

`ChatWidget.handleSend()` trims input, prevents empty/duplicate sends and sends `POST /api/agent` with `{ message }`. No client history is included in that body.

On authentication, `loadHistory()` calls `GET /api/agent/history`. The endpoint returns the newest 20 authenticated-user messages sorted chronologically, including stored sources. Anonymous GET requests return an empty list. This display history is separate from the server's four-message model context below.

## Stage 2: Validation, auth and quota

The POST route validates a non-empty string, reads the Supabase session, hashes the first forwarded IP using SHA-256 (or hashes `unknown` when absent), and calls `consume_agent_quota` with `p_cost: 1` via service role. The email `gilvinsz@gmail.com` bypasses this call; workspace admin checks separately use `app_admins`.

Quota rejection returns HTTP 429 / `quota_exceeded`. Quota RPC failure returns HTTP 500 / `ai_unavailable`. Consumption precedes all provider calls and there is no refund on subsequent failure. See [USAGE_LIMITS.md](USAGE_LIMITS.md).

## Stage 3: Groq configuration

Both rewrite and answer calls use `groq-sdk` and the same selected model: `GROQ_MODEL` or `openai/gpt-oss-120b` normally; `GROQ_FAST_MODEL` or `openai/gpt-oss-20b` when `GROQ_FAST_MODE=true`.

`callGroqWithFallback()` tries configured keys in order `GROQ_API_KEY` → `GROQ_API_KEY_2` → `GROQ_API_KEY_3` on HTTP 429 only. Other errors stop the helper. Three keys do not guarantee triple quota. Missing all keys returns HTTP 503 / `ai_unavailable`. See [ENV.md](ENV.md).

## Stage 3.5: Server history, rewrite and intent

Read up to **four messages**, not four conversation pairs, newest first then reversed, from `agent_chat_history` by user ID or `anon_chat_history` by hashed IP. If history exists, Groq rewrites the question to resolve references and classifies `professional` versus `casual` intent (`max_tokens: 200`). Without history, the raw trimmed question and default professional intent remain.

The rewrite step is best-effort: exceptions (including provider or JSON parsing failure) are caught and execution continues with the initial raw query/professional defaults. It does not implement temporal intent classification.

## Stage 4: Query embedding

Embed the selected search query via Gemini REST `gemini-embedding-001`, `outputDimensionality: 768`. Gemini is used for embeddings, not chat generation.

## Stage 5: Retrieval and supplemental documents

Call service-role RPC `match_knowledge_chunks` with JSON-stringified `query_embedding`, `match_threshold: 0.5`, and `match_count: AGENT_TOP_K` (code default **16**). RPC SQL is not checked in; the documented pgvector cosine-search design is not proof of its deployed definition.

For professional intent, attempt full-document reads from `knowledge_docs` for `work_experience` and `project`. Both filter `owner_id` to `user?.id ?? ""`, so they are **not guaranteed portfolio-wide reads** for anonymous or other visitors. Returned query errors are not checked. No live `tasks`, `projects`, or `public_activity` query supplies current-state evidence.

## Stage 6: Context assembly

Prepend supplemental work-experience and project docs, then vector chunks whose `doc_id` is absent from those supplements. This removes overlap with supplemental docs, not all duplicate vector chunks. Fast mode takes the first eight entries after merging; normal mode uses all merged entries. There is no additional reranker, explicit time ordering, recency tie-breaker, or context token budget in the route.

Each entry includes title, source type, `updated_at`, and content. The prompt asks for grounded third-person answers and recent/in-progress context, but these instructions cannot ensure fresh evidence. Introduction and inline-citation instructions conflict within the existing prompt; output cleanup suppresses both. See AGENT_SPEC for the current behavior and historical prompt.

## Stage 7: Answer generation

Call the selected Groq model with `[system, ...history, current user message]`, capped by `AGENT_MAX_OUTPUT_TOKENS` (default 400). History assistant introductions are cleaned before use. The original user question is used for answering; the rewritten query was used for retrieval.

## Stage 8: Answer cleanup and source metadata

Strip numeric citation markers, bold wrappers, angle brackets, selected self-introductions and `From X:` phrases; replace asterisks with `•`.

Client source metadata is built from **vector RPC results**, not `cappedChunks`. Supplemental docs may be absent from citations and fast-mode-excluded vector chunks may still be listed. This is not an exact trace of evidence used by the model.

## Stage 9: Persistence and response

Insert user and cleaned assistant messages into authenticated or anonymous history, with full vector-result sources stored regardless of `TESTING_MODE`. History failures are logged without blocking the answer.

Return `{ answer, sources, remaining }`. The POST response includes sources only if `TESTING_MODE=on`; otherwise `sources: []`. The history GET endpoint does not apply this gate. Admin `remaining` begins as `Infinity` and serializes to JSON `null`.

## Stage 10: Client delivery and failures

Only HTTP 429 with `quota_exceeded` is treated as an error that exhausts visitor quota. A successful reply with `remaining: 0` also disables further sends. Other HTTP failures display the safe message; network failures retain a separate network-error message. Source display excludes `Task:` titles, deduplicates by `doc_id`, and shows at most four with relative dates.

Main-call `Groq.APIError` failures return HTTP 503 / `ai_unavailable`; other runtime failures, including embedding and retrieval failure, return HTTP 500 / `ai_unavailable`. Rewrite failures are handled by Stage 3.5 fallback. Provider failure does not mean visitor daily quota exhaustion.

## Separate ingestion path

1. Workspace mutations call browser-side `syncKnowledgeDoc()` / `deleteKnowledgeDoc()` under the admin session. SHA-256 content comparison marks changed docs `needs_embedding=true`; this is a read-then-write helper, not an atomic database upsert. Sync errors do not block the source mutation, and returned database errors are not checked.
2. `POST /api/embed` checks `x-embed-secret` against `EMBED_SECRET` and processes flagged `knowledge_docs` through service role. No scheduler or automatic caller is checked in.
3. `chunkContent()` keeps content of at most 2000 characters whole by default; longer content uses 1200-character windows with 150-character overlap.
4. The batch route deletes prior chunks, embeds each replacement using Gemini, inserts vectors, then clears the flag and updates the doc timestamp. It has no transaction/concurrent-edit guard and does not inspect returned write errors. It does not read curated source tables or activity rows.

See [RAG_LITE.md](RAG_LITE.md) for formats and sync coverage.

## Active limitations

The reported latest-task failure is unresolved; [ROADMAP.md](ROADMAP.md) records the production example and prioritizes freshness, then temporal awareness. Rename propagation, batch execution, source timestamps, ownership filters and partial writes require investigation. History and rewriting are implemented; the earlier “no history/no rewriting” gaps are historical and remain represented in dated [PROGRESS.md](PROGRESS.md) entries and the legacy snapshot.

For the complete pre-reconciliation pipeline snapshot, use `git show ea2bb82:docs/agent_pipeline.md`; its obsolete gap claims are not current requirements.
