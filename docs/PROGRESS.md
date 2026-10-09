# Progress — Implemented State and History

Record completed implementation and factual session history here. Future order lives in [ROADMAP.md](ROADMAP.md); concrete open tasks live in [BACKLOG.md](BACKLOG.md). Start future sessions with [README_FOR_CLAUDE.md](README_FOR_CLAUDE.md), which applies to any coding/reasoning agent.

---

## Current Status

**Last updated:** October 7, 2026
**Deployed at:** https://portfoliov2-three-liard.vercel.app
**GitHub:** https://github.com/Golvan98/portfoliov2
**Supabase project ID:** liqlzqrylfhuuxqbyjho

---

## Current post-launch checkpoint

- **DONE — runtime revival substantially complete:** commit `ea2bb82` migrated Groq chat/rewrite defaults to `openai/gpt-oss-120b` / `openai/gpt-oss-20b`, preserving optional overrides, fast mode and HTTP 429 key fallback. Gemini embeddings (`gemini-embedding-001`, 768 dimensions), Supabase/pgvector retrieval, prompts, quota policy and history were unchanged. Provider/runtime failures now use `ai_unavailable`, distinct from visitor `quota_exceeded`.
- **User-reported live verification:** the agent is operational after revival. This updates the earlier repair-session note that live credentials were unavailable during that session; no new live test was performed during this documentation pass.
- **Unresolved live correctness:** `/now` showed ClipNET activity from approximately two hours earlier, but “What is his most recent task rn?” returned “update project descriptions”, project “myHeadSpace & Portfolio v2”, last updated 2026-03-06. No fix is implemented. A prompt asking for recent context is not a verified latest-state capability.
- **Next direction:** Knowledge Freshness & Sync, closely followed by Temporal / Current-State Awareness; see [ROADMAP.md](ROADMAP.md). This is future work, not completed implementation.

## Phase Completion

| Phase | Status | Notes |
|---|---|---|
| Phase 1 — UI Shell & Design System | ✅ Done | All mockups finalized, docs updated |
| Phase 2 — Project Setup | ✅ Done | Vercel deployed, Supabase connected, env vars set |
| Phase 3 — Static Shell Build | ✅ Done | All pages built, dark mode working |
| Phase 4 — Database & Auth | ✅ Done | Google OAuth working, auth callback, admin check via service role, middleware refreshing tokens |
| Phase 5 — Admin Gate | ✅ Done | `is-admin.ts` helper, service role admin check, glass wall toast on unauthorized mutations |
| Phase 6 — MyHeadSpace Admin CRUD | ✅ Done | Full 3-column workspace: sidebar (categories/projects), kanban board (todo/in_progress/done), task details + notes panel. All CRUD operations functional for admin. |
| Phase 7 — Activity Logging | ✅ Done | Category/project/task activity call sites implemented; project description edits lack a call and insert success is not checked. See ACTIVITY_SPEC. |
| Phase 8 — Activity Widget + /now | ✅ Done | ActivityFeed on homepage with realtime subscription, `/now` page with load-more pagination, `timeAgo()` relative timestamps |
| Phase 9 — RAG-lite Pipeline | ✅ Done | `/api/embed` endpoint with EMBED_SECRET auth, conditional chunking (1200 chars / 150 overlap), `syncKnowledgeDoc()` / `deleteKnowledgeDoc()` wired to project/task/note mutations (best-effort; dependent rename coverage is incomplete). Project docs now include task status summaries (todo/in-progress/done counts). Parent project doc re-synced on every task create/delete/status change. |
| Phase 10 — Agent API Route | ✅ Done | `/api/agent` with full flow: quota enforcement via `consume_agent_quota` RPC (admin bypass for gilvinsz@gmail.com), Stage 3.5 fetches up to 4 chat messages and attempts query rewriting/intent classification via Groq only when history exists, Gemini embedding (`gemini-embedding-001`, 768 dims) on rewritten query, pgvector similarity search via `match_knowledge_chunks` RPC (top K default 16), supplemental `work_experience` and `project` doc reads on professional queries filtered by visitor owner ID (not guaranteed portfolio-wide; vector overlap removed by doc ID), Groq-hosted `openai/gpt-oss-120b` answer generation (optional `GROQ_MODEL` override) with conversation history (up to 4 messages) passed to main LLM call. `GROQ_FAST_MODE=true` switches to `openai/gpt-oss-20b` (optional `GROQ_FAST_MODEL` override) with chunk cap of 8. **Groq API key rotation:** `callGroqWithFallback()` helper cycles through `GROQ_API_KEY` → `GROQ_API_KEY_2` → `GROQ_API_KEY_3` on 429 rate limit errors. Multiple keys may share organization-level quotas; extra quota is not guaranteed. Both Stage 3.5 (query rewriting) and Stage 7 (main LLM call) use `callGroqWithFallback`. System prompt requests third-person voice, no hard refusals, and recent project/task context; current-state correctness is unresolved. Intent-based instruction: professional queries exclude personal/hobby content, casual queries allow it. FORMAT rules: no angle brackets around source titles, use `•` bullets only (no asterisks), no markdown bold, no self-introduction, no inline source citations. Post-processing strips `[n]` citation markers, `**bold**` wrappers, `<angle brackets>`, self-introduction phrases, inline `From X:` citations, and converts `*` to `•`. Saves user+assistant messages to `agent_chat_history` (authenticated) or `anon_chat_history` (anonymous, keyed by hashed IP). `TESTING_MODE` gates new POST source metadata; stored history sources are returned without that gate. |
| Phase 11 — Wire Agent Chat UI | ✅ Done | Floating ChatWidget (bottom-right sparkles icon), persistent chat history for logged-in users (loads last 20 messages on mount), typing indicator, source citations with `timeAgo()` relative dates (max 4), quota display, sign-in nudge for anon users |
| Phase 12 — Polish | 🟡 Partial | Custom 404 and five current project cards implemented. Glass-wall RLS mismatch was previously reported and still needs deployment verification; see Known Limitations below. |

---

## What's Built (Codebase Audit Summary)

### Pages
- **`/`** — Hero, proof cards, activity widget (realtime), projects section, about, contact, footer, ChatWidget
- **`/now`** — Activity history with load-more, fetches `public_activity` (20 per page)
- **`/myheadspace`** — Server component checks admin status for mutation controls, without redirecting visitors; passes session-scoped categories/projects to Workspace
- **`/auth/callback`** — OAuth code exchange, redirects admin to `/myheadspace`, others to `/`
- **`not-found.tsx`** — Custom 404 with "Back to portfolio" button

### API Routes
- **`/api/agent`** — Full RAG pipeline: quota check (admin bypass) → history/optional rewrite → query embedding → vector/supplemental retrieval → Groq answer → save to `agent_chat_history` (authenticated) or `anon_chat_history` (anonymous)
- **`/api/agent/history`** — Authenticated display history (newest 20 messages, sorted chronologically); anonymous requests return an empty list.
- **`/api/embed`** — Secret-authenticated batch endpoint (no scheduler checked in): finds `needs_embedding=true` docs, chunks, embeds via Gemini (`gemini-embedding-001`, 768 dims), stores vectors

### Key Components
- **`workspace.tsx`** — Full MyHeadSpace CRUD: categories, projects, tasks, task_notes. Admin guard (toast on unauthorized mutation). Best-effort RAG sync on project/task/note mutation paths; category changes and dependent renames are not propagated. Project docs include task status summaries; parent project re-synced on task create/delete/status change. `updateProjectDescription()` updates description in DB and calls knowledge-doc sync; embedding requires a separate batch run.
- **`kanban-board.tsx`** — 3-column kanban (To Do / In Progress / Done) with inline editing. Displays project description below tabs with click-to-edit (admin) and muted placeholder when empty.
- **`sidebar.tsx`** — Category tree with expandable projects, inline editing. Project creation form includes optional description textarea.
- **`task-card.tsx`** — Individual task card with status dropdown, edit, delete
- **`task-details.tsx`** — Right panel showing task info and notes textarea
- **`chat-widget.tsx`** — Floating agent UI with persistent chat history (last 20 messages loaded on mount for logged-in users), source citations (relative dates via `timeAgo()`), quota display, auth modal trigger
- **`activity-feed.tsx`** — Realtime subscription on `public_activity` inserts for live updates
- **`activity-list.tsx`** — Paginated activity list with colored action dots, 30s timestamp refresh
- **`auth-modal.tsx`** — Google OAuth trigger with quota tier explanation
- **`navbar.tsx`** — Sticky nav with user avatar/sign-out dropdown, mobile hamburger menu

### Lib/Utilities
- **`lib/supabase/client.ts`** — Browser client (anon key)
- **`lib/supabase/server.ts`** — Session-aware server client + service role client
- **`lib/supabase/middleware.ts`** — Token refresh on every request
- **`lib/auth/is-admin.ts`** — `getAdminStatus()` returns `{ isAdmin, userId }`, uses service role for `app_admins` lookup
- **`lib/activity/log-activity.ts`** — Inserts into `public_activity`
- **`lib/rag/sync-knowledge-doc.ts`** — Upserts/deletes `knowledge_docs`, content blob builders for project/task/note
- **`lib/rag/chunk.ts`** — Conditional chunking with configurable thresholds
- **`lib/types.ts`** — TypeScript interfaces for Category, Project, Task, TaskNote
- **`lib/time-ago.ts`** — Relative timestamp formatting

### Infrastructure
- **`middleware.ts`** — Supabase auth token refresh on every request
- **`next.config.mjs`** — `ignoreBuildErrors: true`, `images.unoptimized: true`
- **`package.json`** — Next.js 16.1.6, React 19.2.4, groq-sdk, @supabase/ssr 0.8.0, Tailwind 4.2.0, 60+ shadcn/ui components

### HISTORICAL — previously reported environment setup

The following setup notes were recorded in earlier sessions, not reverified locally or in Vercel by this pass. Use [ENV.md](ENV.md) for current code-consumed names/defaults. In particular, `AGENT_USER_DAILY_LIMIT` and `AGENT_ANON_DAILY_LIMIT` are unused by application code; quotas come from DB RPC/tables.

- ✅ `NEXT_PUBLIC_SUPABASE_URL` — set
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` — set
- ✅ `SUPABASE_SERVICE_ROLE_KEY` — set
- ✅ `GEMINI_API_KEY` — set (used for embeddings only)
- ✅ `GROQ_API_KEY` — set (used for agent chat completion, primary key)
- ✅ `GROQ_API_KEY_2` — set (second Groq key for 429 fallback rotation)
- ✅ `GROQ_API_KEY_3` — set (third Groq key for 429 fallback rotation)
- ✅ `EMBED_SECRET` — set
- ✅ `TESTING_MODE` — set (`on` for local dev; when `off`/unset, source citations hidden from response)
- ✅ Chunking config (`CHUNK_MIN_CHARS_BEFORE_SPLIT`, `CHUNK_TARGET_CHARS`, `CHUNK_OVERLAP_CHARS`) — set
- ✅ Agent config (`AGENT_MAX_OUTPUT_TOKENS`, `AGENT_TOP_K` default 16, `AGENT_USER_DAILY_LIMIT`, `AGENT_ANON_DAILY_LIMIT`) — set
- `GROQ_FAST_MODE` — optional (`true` selects `GROQ_FAST_MODEL` with chunk cap of 8; any other value selects `GROQ_MODEL`)
- `GROQ_MODEL` — optional normal-model override; code default `openai/gpt-oss-120b`
- `GROQ_FAST_MODEL` — optional fast-model override; code default `openai/gpt-oss-20b`
- ⚠️ `testgclientid` and `testgsecret` — stale test values still present (should be removed)

---

## Historical model/policy changes and current outcome

These superseded specifications explain implementation history; current AGENT_SPEC/RAG_LITE docs now describe the implemented flow:

| What | Historical specification | Current implementation | Rationale recorded |
|---|---|---|---|
| Chat model (original specification) | `gemini-2.0-flash` | Groq-hosted `openai/gpt-oss-120b` / `openai/gpt-oss-20b` | Groq remains the provider; configurable GPT-OSS defaults replace the previous hard-coded models |
| Embedding model | `text-embedding-004` | `gemini-embedding-001` | Avoid 404 / compatibility (commits ce54695, b36fc8f, 988c13f) |
| Agent system prompt | Strict rules, hard refusals | Third-person voice, conversational, no hard refusals | Better UX — answers casual questions naturally, prioritizes recent activity |
| Agent quota | Enforced for all users | Bypassed for admin (gilvinsz@gmail.com) | Admin should have unlimited access to own portfolio agent |

**Chat completion and query rewriting** use Groq SDK (`groq-sdk`) with `openai/gpt-oss-120b` normally and `openai/gpt-oss-20b` when `GROQ_FAST_MODE=true`. `GROQ_MODEL` and `GROQ_FAST_MODEL` are optional server-side overrides; production works with the code defaults when they are absent. GPT-OSS is consumed through the Groq API, not locally. No OpenAI SDK is used.

**Embeddings** still use Gemini REST API directly (not the SDK) with `gemini-embedding-001` and `outputDimensionality: 768`, which matches the pgvector column dimension. No DB changes needed — vector dimensions stay at 768.

---

## Known Limitations (not completed work)

- **Active correctness problem:** the latest-task production discrepancy above remains unresolved. Code inspection shows incomplete rename propagation, unchecked sync/batch write errors, no checked-in batch scheduler, visitor-scoped supplemental doc reads and ambiguous knowledge timestamps. These are investigation targets, not a proven root cause; details are in [RAG_LITE.md](RAG_LITE.md) and [BACKLOG.md](BACKLOG.md).
- **Answer behavior:** the user reports an elaborate current-status answer to “hey”, unsolicited hobbies/personal details, and awkward or over-assumptive replies. Correct evidence and then behavior need evaluation.
- **Glass-wall visibility:** non-admin empty workspaces were previously reported. Session-scoped page reads and the admin-only SELECT templates are consistent with that failure, but deployed policies were not inspected in this pass. Do not report it fixed or apply old SQL blindly.
- **Build/tooling:** `next.config.mjs` still sets `ignoreBuildErrors: true`. The runtime-repair session recorded existing TypeScript/lint failures and earlier sessions reported a middleware warning; these checks were not rerun for this documentation-only change.
- **UI:** initial remaining quota is unknown until the first agent response. Task status changes use menus, not drag-and-drop. A mobile sidebar exists, but task details are hidden at smaller breakpoints.
- **Configuration/setup:** old local credential and Vercel setup notes below are historical, not current verification. No environment files or deployment settings were inspected/changed during reconciliation.

---

## HISTORICAL — Earlier manual-action checklist (completion unverified)

Preserved as a record of previously requested setup, not a current runbook. Verify deployed tables/policies/content before repeating anything below. Current actionable verification is tracked in BACKLOG; no SQL, embedding call, credential rotation or configuration change was performed here. The historical command's literal secret is replaced with a placeholder.

**To fix glass wall (Critical Bug #1):**
1. Add public SELECT policies for `categories`, `projects`, `tasks`, `task_notes` in Supabase SQL editor:
   ```sql
   CREATE POLICY "categories_public_read" ON public.categories FOR SELECT USING (true);
   CREATE POLICY "projects_public_read" ON public.projects FOR SELECT USING (true);
   CREATE POLICY "tasks_public_read" ON public.tasks FOR SELECT USING (true);
   CREATE POLICY "task_notes_public_read" ON public.task_notes FOR SELECT USING (true);
   ```

**Create chat history tables (required for persistent chat + anonymous logging):**
2. Run the CREATE TABLE + RLS SQL for `agent_chat_history` and `anon_chat_history` in Supabase SQL editor (provided in chat).

**RAG knowledge doc updates (run in Supabase SQL editor):**
3. Update "About Gilvin Zalsos" doc — new title: Full Stack Developer (Backend-focused) · DevOps Engineer · AI Solutions. Set `needs_embedding = true`.
4. Update "Education — Gilvin Zalsos" doc — add MSU-IIT IDS high school, capstone project (Automated Needs Assessment Survey, PHP/MySQL, 2018). Set `needs_embedding = true`.
5. Insert "Automated Needs Assessment Survey" into `portfolio_projects` and corresponding `knowledge_docs` row. Set `needs_embedding = true`.
6. Trigger re-embedding: `curl -X POST https://portfoliov2-three-liard.vercel.app/api/embed -H "x-embed-secret: <EMBED_SECRET>"`

**To sync Vercel deployment:**
7. Ensure `GEMINI_API_KEY`, `GROQ_API_KEY`, `GROQ_API_KEY_2`, `GROQ_API_KEY_3`, and `EMBED_SECRET` are set in Vercel env vars (Settings → Environment Variables) — all confirmed set as of March 20

**Cleanup:**
8. Remove `testgclientid` and `testgsecret` lines from `.env.local`
9. Set `ignoreBuildErrors: false` in `next.config.mjs` and fix any build errors

---

## HISTORICAL Session Log — February 28, 2026

### Commits pushed today:
1. **`58a56d9`** — `feat: expand RAG sources, tune agent prompt, fix citation dates`
   - `buildProjectContent` now includes task status summary (todo/in-progress/done counts)
   - Parent project knowledge doc re-synced on task create, delete, and status change
   - Agent system prompt rewritten: third-person voice ("Gilvin is…"), no hard refusals, prioritizes recent activity
   - Chat widget citations: replaced `formatDate()` with `timeAgo()`, null/undefined guard prevents "Invalid Date"
2. **`af94d5b`** — `feat: add Automated Needs Assessment Survey as 4th project card`
   - New amber accent color (`#d97706`) in `project-card.tsx`
   - 4th card in `projects-section.tsx`: PHP/MySQL mental health survey for MSU-IIT (no demo/code URLs)
3. **`502a451`** — `feat: bypass agent quota for admin user`
   - If authenticated user email is `gilvinsz@gmail.com`, skip `consume_agent_quota` RPC entirely
4. **`b946c54`** — `feat: add TESTING_MODE toggle to hide source citations in production`
   - Sources array returned empty when `TESTING_MODE` is `off` or unset
5. **`2c7966e`** — `feat: persistent chat history for logged-in users`
   - Server-side: insert user + assistant messages into `agent_chat_history` after each successful response
   - Client-side: load last 20 messages from `agent_chat_history` on mount when logged in
   - Anonymous users unaffected (no history)
6. **`fe63806`** — `feat: anonymous chat logging via anon_chat_history`
   - Unauthenticated user+assistant messages saved to `anon_chat_history` keyed by hashed IP
   - Service role only — no public read/write
7. **`48fd215`** — `fix: wire hero "Chat with portfolio" button to open chat widget`
   - Hero button dispatches custom `open-chat-widget` event; ChatWidget listens and sets `open = true`

### SQL provided (not yet run):
- UPDATE `About Gilvin Zalsos` knowledge doc with updated title
- UPDATE `Education — Gilvin Zalsos` knowledge doc with high school + capstone details
- INSERT `Automated Needs Assessment Survey` into `portfolio_projects` + `knowledge_docs`
- CREATE TABLE `agent_chat_history` with RLS (users read own history, service role inserts)
- CREATE TABLE `anon_chat_history` with RLS (service role only, no public access)

---

## Key URLs & IDs (Quick Reference)

| Item | Value |
|---|---|
| Vercel URL | https://portfoliov2-three-liard.vercel.app |
| GitHub | https://github.com/Golvan98/portfoliov2 |
| Supabase project ID | liqlzqrylfhuuxqbyjho |
| Supabase URL | https://liqlzqrylfhuuxqbyjho.supabase.co |
| Supabase OAuth callback | https://liqlzqrylfhuuxqbyjho.supabase.co/auth/v1/callback |
| Admin email | gilvinsz@gmail.com |

---

## HISTORICAL Session Log — March 5, 2026

The logout fix below reset the history-load ref; current code does not clear the already displayed message array on logout. The original session wording is retained as history.

Bug-fix marathon across the agent chat and MyHeadSpace workspace. No new features — all 8 commits are stability and UX fixes.

### Agent & Chat fixes
1. **`3f768e7`** — `fix(agent): add anti-hallucination guard and filter task citations from UI`
   - Added an anti-hallucination guard to the agent route so the LLM sticks to retrieved context
   - Chat widget now filters out internal task-level citations from the displayed sources
   - Created `/api/agent/history` route for fetching chat history
2. **`feef9b1`** — `fix(chat): reset history ref on logout, fix history ordering to return most recent messages`
   - Chat history ref is now cleared on logout so stale messages don't persist across sessions
   - History API returns the most recent messages in correct chronological order
3. **`224c91a`** — `fix(chat): fix history display order using explicit JS sort by created_at`
   - Added explicit client-side sort by `created_at` to guarantee message ordering regardless of DB return order

### MyHeadSpace workspace fixes
4. **`f6f3046`** — `fix(myheadspace): guard all create functions against double-submit on rapid Enter`
   - Sidebar (category/project create) and kanban (task create) now have debounce guards preventing duplicate entries when Enter is pressed quickly
5. **`7f4d002`** — `fix dropdown menu for task status not appearing bug`
   - Fixed portal/z-index issue in `dropdown-menu.tsx` so the task status dropdown renders on top of the kanban board
6. **`a705175`** — `fix(myheadspace): wrap DropdownMenuSubContent in Portal to fix submenu clipping`
   - Top navbar dropdown submenus were being clipped by overflow containers; wrapping in a Portal fixes the rendering
7. **`9c694b1`** — `fix(myheadspace): show Sign in when logged out, Sign out when logged in, wire Google OAuth from header`
   - MyHeadSpace top navbar now correctly shows "Sign in" for unauthenticated users and "Sign out" for authenticated users, with Google OAuth wired directly from the header
8. **`75092d1`** — `fixed folded categories unfolding when selecting a project from category nav tab`
   - Selecting a project from the category nav tab no longer forces its parent category to expand — collapsed categories stay collapsed

---

## HISTORICAL Session Log — March 6, 2026

Landing page polish and activity feed message overhaul.

### Commits pushed today:
1. **`be1d67d`** — `fix landing page links`
   - Project cards now support a `buttonLabel` prop — "Visit website", "Coming soon", etc. instead of the old generic "Test it out"
   - "Coming soon" renders as a disabled, dimmed button; all other labels get an arrow suffix and link to `demoUrl`
   - Added `demoUrl` and `buttonLabel` to the ClipNet project card (links to https://clipnet.ai/)
   - Minor styling: `whitespace-nowrap` on buttons, consistent icon gap on "View code"
2. **`a8cc915`** — `feat: improve activity feed messages with precise action context`
   - Rewrote all 10 `logActivity()` call sites in `workspace.tsx` to store natural, context-rich messages in `entity_title` instead of bare titles
   - Status changes use specific wording: "marked ... as Done", "marked ... as In Progress", "moved ... back to To Do"
   - Task create/update/delete messages include "in project ..." or "from project ..." for clarity
   - Project create includes "under [category]"; project delete is standalone
   - Added category CRUD activity logging (create/update/delete) — previously categories had no activity trail
   - Added `statusLabel()` helper and `entity_type: "category"` to the `logActivity` type union
   - Updated `activity-feed.tsx` and `activity-list.tsx` to render `entity_title` directly instead of constructing messages from separate action/type/title parts — removed the now-unused `actionVerbs` map

3. **`b7453ab`** — `update project description in landing page`
   - Added `description` prop to `project-card.tsx`, updated `projects-section.tsx` with project descriptions
   - Refined task `entity_title` messages in `workspace.tsx`: added "project" prefix before project names, removed redundant "task" from delete message
4. **`bc82520`** — `add image to about me`
   - Added Gilvin's photo (`public/images/gilvin.jpg`) to the About section and hero
5. **`11e1728`** — `update about me`
   - Minor copy update in About section

---

## HISTORICAL Session Log — March 15, 2026

The notes below preserve that session's observations and model names, not current guarantees. “Last 4 turns” meant four stored messages. “Guaranteed fetch” is limited by the visitor owner-ID filter and fast-mode cap. Reported answer improvements do not establish permanent regression coverage or resolve the current live correctness issue.

Agent output quality improvements and MyHeadSpace project description feature.

### Commits pushed today:
1. **`669a58f`** — `feat(myheadspace): add project description field with inline edit and RAG sync`

   **Agent response post-processing:**
   - Strips `[n]` citation markers (e.g., `[1]`, `[2]`) from all agent answers via regex (`/\[\d+\]/g`) before returning to client and before persisting to `agent_chat_history` / `anon_chat_history`

   **Agent system prompt — FORMAT instructions updated:**
   - Never wrap source titles in angle brackets (plain text only)
   - Never use asterisk (`*`) bullets — use `•` character instead
   - Never use markdown bold formatting

   **MyHeadSpace projects — `description` field:**
   - **Creation:** Both sidebar and kanban board inline creation forms now include an optional `description` textarea below the project name input. Container-level `onBlur` prevents premature submit when tabbing between fields. Empty descriptions insert as `null`.
   - **Display:** Project description shown between the tab bar and search bar on the kanban board. If no description exists, admins see a muted placeholder "No description yet. Click to add one." Non-admins see nothing when empty.
   - **Edit in place:** Clicking the description (admin only) opens an inline textarea. On blur, `onUpdateDescription` calls `updateProjectDescription()` in `workspace.tsx`, which updates the `projects` row and triggers an immediate RAG sync.
   - **RAG sync confirmed:** `buildProjectContent()` in `lib/rag/sync-knowledge-doc.ts` already included `Description: ${p.description ?? ""}` in the embedded content string — no changes needed there.

2. **`c5759bc`** — `fix agent response format, no longer tries to bolden some characters`
   - Post-processing now also strips `**bold**` wrappers and `<angle bracket>` wrappers from agent answers

3. **`f4e7659`** — `prevent agent from introducing itself every response`
   - Added FORMAT instruction: never introduce yourself or state that you are Gilvin's portfolio assistant at the start of a response

4. **`c2bec62`** — `feat(agent): query rewriting + intent classification for context-aware retrieval`
   - **Model upgrade:** `llama-3.1-8b-instant` → `llama-3.3-70b-versatile` for improved instruction following and factual accuracy
   - **Stage 3.5 — Query rewriting:** Fetches last 4 messages from chat history (`agent_chat_history` for authenticated, `anon_chat_history` for anonymous users). Calls Groq to rewrite the user query into a self-contained search query (resolving pronouns and references) and classifies intent as `professional` or `casual`. Wrapped in try/catch — falls back to raw message and default `professional` intent on failure.
   - **Embed step** now uses the rewritten query instead of the raw message for more accurate vector search
   - **Intent-based system prompt:** Professional queries restrict answers to projects, skills, and work experience. Casual queries allow personal interests, hobbies, and life outside of work.
   - **Result:** Context retention across conversation turns, personal errands no longer bleed into professional answers, contact info now retrieved correctly

5. **`c34780d`** — `feat(agent): context-aware RAG pipeline with query rewriting, history, intent classification, and response cleanup`

   **Agent pipeline overhaul:**
   - Conversation history (last 4 turns) now passed to main LLM call in Stage 7 — gives the LLM memory of prior conversation
   - History variable hoisted above try/catch for scope accessibility
   - `GROQ_FAST_MODE` env toggle: when `true`, switches both query rewriting and main LLM calls to `llama-3.1-8b-instant`; otherwise defaults to `llama-3.3-70b-versatile`
   - Top K default bumped from 8 to 16 (`AGENT_TOP_K` fallback)
   - Guaranteed fetch for all `work_experience` docs on professional queries (always included in context)
   - Guaranteed fetch for all `project` docs on professional queries (always included in context)
   - `allChunks` merges guaranteed docs with vector search results, deduplicating by `doc_id`
   - `cappedChunks` limits total chunks to 8 in fast mode to stay within 8b token limits

   **Response cleanup (post-processing chain on `cleanedAnswer`):**
   - Strip `[n]` citation markers
   - Strip `**bold**` markdown
   - Strip `<>` angle brackets
   - Strip self-introduction phrases ("I am Gilvin's portfolio assistant", "Gilvin's portfolio assistant here", "Hello I'm Gilvin's portfolio assistant")
   - Strip inline "From X:" mid-sentence citations
   - Replace `*` bullets with `•`
   - History messages also cleaned of self-introduction phrases before being passed to the LLM

   **System prompt updates:**
   - No inline source citations — sources displayed separately to user
   - Intent-based instruction injected dynamically based on query classification

   **Bug fixes:**
   - Chat bubble URL overflow fixed with `break-words` Tailwind class in `chat-widget.tsx`

---

## HISTORICAL Session Log — March 20, 2026

Groq API key rotation to increase rate limit headroom.

### Changes (uncommitted at that session; subsequently committed as `4805c06`):
1. **Groq API key rotation with 429 fallback**
   - Added `callGroqWithFallback()` helper in `/api/agent/route.ts` that cycles through `GROQ_API_KEY` → `GROQ_API_KEY_2` → `GROQ_API_KEY_3` env vars in order
   - On 429 (rate limit) errors, retries with the next key; bails immediately on all other errors
   - Both Stage 3.5 (query rewriting) and Stage 7 (main LLM call) now use `callGroqWithFallback` instead of a single Groq instance
   - Tries the next configured key on HTTP 429; multiple keys may share organization-level quotas, so additional quota is not guaranteed

### Env vars added:
- `GROQ_API_KEY_2` and `GROQ_API_KEY_3` added to both `.env.local` and Vercel environment variables


---

## HISTORICAL Session Log — October 7, 2026 — Sprint 1 runtime repair

- Replaced hard-coded chat models with Groq-hosted GPT-OSS defaults and optional `GROQ_MODEL` / `GROQ_FAST_MODEL` overrides; preserved `GROQ_FAST_MODE`.
- Preserved the three-key HTTP 429 fallback for both query rewriting and answer generation.
- Added explicit missing-Groq-key detection and safe `ai_unavailable` responses for provider/runtime failures. Visitor quota remains HTTP 429 with `quota_exceeded`; the frontend now distinguishes this from availability failures and retains its network-error message.
- RAG, embeddings, retrieval, prompts, quotas, auth, and history behavior are unchanged.
- Validation: production build passes before and after the change; lint fails before and after because no ESLint configuration exists. The separate TypeScript check reports the same five pre-existing errors (build currently skips type validation). All 31 mocked route/frontend checks pass; live provider testing requires credentials absent from this workspace.


## Documentation reconciliation — October 7, 2026

Reviewed every Markdown file under `docs/` and the legacy snapshot against repository implementation/history. Created the ordered ROADMAP, separated open BACKLOG work from completed history, corrected runtime/quota/sync claims, and marked original prompts/seeds/UI briefs as historical. The legacy snapshot was deliberately preserved. This pass made documentation changes only; no application, migration, dependency, configuration or deployment changes. Permanent evaluation coverage remains planned; prior mocked checks are historical validation, not a checked-in suite.
