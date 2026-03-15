# PROGRESS.md — Session Checkpoint

Update this file at the END of every Claude Code session before closing VSCode.
Next session opener: "Continue Portfolio v2. Read /docs/PROGRESS.md for where we left off. Then read all other /docs files."

---

## Current Status

**Last updated:** March 15, 2026
**Deployed at:** https://portfoliov2-three-liard.vercel.app
**GitHub:** https://github.com/Golvan98/portfoliov2
**Supabase project ID:** liqlzqrylfhuuxqbyjho

---

## Phase Completion

| Phase | Status | Notes |
|---|---|---|
| Phase 1 — UI Shell & Design System | ✅ Done | All mockups finalized, docs updated |
| Phase 2 — Project Setup | ✅ Done | Vercel deployed, Supabase connected, env vars set |
| Phase 3 — Static Shell Build | ✅ Done | All pages built, dark mode working |
| Phase 4 — Database & Auth | ✅ Done | Google OAuth working, auth callback, admin check via service role, middleware refreshing tokens |
| Phase 5 — Admin Gate | ✅ Done | `is-admin.ts` helper, service role admin check, glass wall toast on unauthorized mutations |
| Phase 6 — MyHeadSpace Admin CRUD | ✅ Done | Full 3-column workspace: sidebar (categories/projects), kanban board (todo/in_progress/done), task details + notes panel. All CRUD operations functional for admin. |
| Phase 7 — Activity Logging | ✅ Done | `logActivity()` helper fires on every project/task create/update/delete, inserts into `public_activity` |
| Phase 8 — Activity Widget + /now | ✅ Done | ActivityFeed on homepage with realtime subscription, `/now` page with load-more pagination, `timeAgo()` relative timestamps |
| Phase 9 — RAG-lite Pipeline | ✅ Done | `/api/embed` endpoint with EMBED_SECRET auth, conditional chunking (1200 chars / 150 overlap), `syncKnowledgeDoc()` and `deleteKnowledgeDoc()` helpers called on every CRUD operation. Project docs now include task status summaries (todo/in-progress/done counts). Parent project doc re-synced on every task create/delete/status change. |
| Phase 10 — Agent API Route | ✅ Done | `/api/agent` with full flow: quota enforcement via `consume_agent_quota` RPC (admin bypass for gilvinsz@gmail.com), Stage 3.5 query rewriting (fetches last 4 chat messages, rewrites query resolving pronouns, classifies intent as professional/casual via Groq), Gemini embedding (`gemini-embedding-001`, 768 dims) on rewritten query, pgvector similarity search via `match_knowledge_chunks` RPC (top K default 16), guaranteed fetch of all `work_experience` and `project` docs on professional queries (deduplicated with vector results), Groq `llama-3.3-70b-versatile` answer generation with conversation history (last 4 turns) passed to main LLM call. `GROQ_FAST_MODE` env toggle switches to `llama-3.1-8b-instant` with chunk cap of 8. System prompt tuned for third-person voice, no hard refusals, prioritizes recent activity context. Intent-based instruction: professional queries exclude personal/hobby content, casual queries allow it. FORMAT rules: no angle brackets around source titles, use `•` bullets only (no asterisks), no markdown bold, no self-introduction, no inline source citations. Post-processing strips `[n]` citation markers, `**bold**` wrappers, `<angle brackets>`, self-introduction phrases, inline `From X:` citations, and converts `*` to `•`. Saves user+assistant messages to `agent_chat_history` (authenticated) or `anon_chat_history` (anonymous, keyed by hashed IP). `TESTING_MODE` toggle controls source citation visibility. |
| Phase 11 — Wire Agent Chat UI | ✅ Done | Floating ChatWidget (bottom-right sparkles icon), persistent chat history for logged-in users (loads last 20 messages on mount), typing indicator, source citations with `timeAgo()` relative dates (max 4), quota display, sign-in nudge for anon users |
| Phase 12 — Polish | 🟡 Partial | Custom 404 page done. 4th project card added (Automated Needs Assessment Survey). Glass wall RLS still broken. See Known Bugs below. |

---

## What's Built (Codebase Audit Summary)

### Pages
- **`/`** — Hero, proof cards, activity widget (realtime), projects section, about, contact, footer, ChatWidget
- **`/now`** — Activity history with load-more, fetches `public_activity` (20 per page)
- **`/myheadspace`** — Server component with admin guard, passes initial categories/projects to Workspace client component
- **`/auth/callback`** — OAuth code exchange, redirects admin to `/myheadspace`, others to `/`
- **`not-found.tsx`** — Custom 404 with "Back to portfolio" button

### API Routes
- **`/api/agent`** — Full RAG pipeline: quota check (admin bypass) → embed question → vector search → LLM answer with sources → save to `agent_chat_history` (authenticated) or `anon_chat_history` (anonymous)
- **`/api/embed`** — Background embedding job: finds `needs_embedding=true` docs, chunks, embeds via Gemini (`gemini-embedding-001`, 768 dims), stores vectors

### Key Components
- **`workspace.tsx`** (~717 lines) — Full MyHeadSpace CRUD: categories, projects, tasks, task_notes. Admin guard (toast on unauthorized mutation). RAG sync on every CRUD op (non-blocking). Project docs include task status summaries; parent project re-synced on task create/delete/status change. `updateProjectDescription()` updates description in DB and triggers immediate RAG sync.
- **`kanban-board.tsx`** (~446 lines) — 3-column kanban (To Do / In Progress / Done) with inline editing. Displays project description below tabs with click-to-edit (admin) and muted placeholder when empty.
- **`sidebar.tsx`** (~465 lines) — Category tree with expandable projects, inline editing. Project creation form includes optional description textarea.
- **`task-card.tsx`** (155 lines) — Individual task card with status dropdown, edit, delete
- **`task-details.tsx`** (115 lines) — Right panel showing task info and notes textarea
- **`chat-widget.tsx`** (~365 lines) — Floating agent UI with persistent chat history (last 20 messages loaded on mount for logged-in users), source citations (relative dates via `timeAgo()`), quota display, auth modal trigger
- **`activity-feed.tsx`** — Realtime subscription on `public_activity` inserts for live updates
- **`activity-list.tsx`** (124 lines) — Paginated activity list with colored action dots, 30s timestamp refresh
- **`auth-modal.tsx`** (72 lines) — Google OAuth trigger with quota tier explanation
- **`navbar.tsx`** — Sticky nav with user avatar/sign-out dropdown, mobile hamburger menu

### Lib/Utilities
- **`lib/supabase/client.ts`** — Browser client (anon key)
- **`lib/supabase/server.ts`** — Session-aware server client + service role client
- **`lib/supabase/middleware.ts`** — Token refresh on every request
- **`lib/auth/is-admin.ts`** — `getAdminStatus()` returns `{ isAdmin, userId }`, uses service role for `app_admins` lookup
- **`lib/activity/log-activity.ts`** — Inserts into `public_activity`
- **`lib/rag/sync-knowledge-doc.ts`** (123 lines) — Upserts/deletes `knowledge_docs`, content blob builders for project/task/note
- **`lib/rag/chunk.ts`** (27 lines) — Conditional chunking with configurable thresholds
- **`lib/types.ts`** — TypeScript interfaces for Category, Project, Task, TaskNote
- **`lib/time-ago.ts`** — Relative timestamp formatting

### Infrastructure
- **`middleware.ts`** — Supabase auth token refresh on every request
- **`next.config.mjs`** — `ignoreBuildErrors: true`, `images.unoptimized: true`
- **`package.json`** — Next.js 16.1.6, React 19.2.4, groq-sdk, @supabase/ssr 0.8.0, Tailwind 4.2.0, 60+ shadcn/ui components

### Env Vars (`.env.local`)
- ✅ `NEXT_PUBLIC_SUPABASE_URL` — set
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` — set
- ✅ `SUPABASE_SERVICE_ROLE_KEY` — set
- ✅ `GEMINI_API_KEY` — set (used for embeddings only)
- ✅ `GROQ_API_KEY` — set (used for agent chat completion)
- ✅ `EMBED_SECRET` — set
- ✅ `TESTING_MODE` — set (`on` for local dev; when `off`/unset, source citations hidden from response)
- ✅ Chunking config (`CHUNK_MIN_CHARS_BEFORE_SPLIT`, `CHUNK_TARGET_CHARS`, `CHUNK_OVERLAP_CHARS`) — set
- ✅ Agent config (`AGENT_MAX_OUTPUT_TOKENS`, `AGENT_TOP_K` default 16, `AGENT_USER_DAILY_LIMIT`, `AGENT_ANON_DAILY_LIMIT`) — set
- ✅ `GROQ_FAST_MODE` — optional (`true` switches to `llama-3.1-8b-instant` with chunk cap of 8; unset defaults to `llama-3.3-70b-versatile`)
- ⚠️ `testgclientid` and `testgsecret` — stale test values still present (should be removed)

---

## Model Deviations from Docs

The following intentional changes were made via recent commits and differ from AGENT_SPEC.md / RAG_LITE.md:

| What | Docs say | Code uses | Reason |
|---|---|---|---|
| Chat model | `gemini-2.0-flash` | Groq `llama-3.3-70b-versatile` | Gemini free tier chat quota too restrictive; Groq provides generous free tier. Upgraded from `llama-3.1-8b-instant` for improved instruction following and factual accuracy |
| Embedding model | `text-embedding-004` | `gemini-embedding-001` | Avoid 404 / compatibility (commits ce54695, b36fc8f, 988c13f) |
| Agent system prompt | Strict rules, hard refusals | Third-person voice, conversational, no hard refusals | Better UX — answers casual questions naturally, prioritizes recent activity |
| Agent quota | Enforced for all users | Bypassed for admin (gilvinsz@gmail.com) | Admin should have unlimited access to own portfolio agent |

**Chat completion** uses Groq SDK (`groq-sdk`) with `llama-3.3-70b-versatile` (upgraded from `llama-3.1-8b-instant`). The `@google/generative-ai` SDK has been removed from the project.

**Embeddings** still use Gemini REST API directly (not the SDK) with `gemini-embedding-001` and `outputDimensionality: 768`, which matches the pgvector column dimension. Gemini's embedding free tier has generous limits. No DB changes needed — vector dimensions stay at 768.

---

## Known Bugs & Blockers

### Critical — Blocks Functionality

1. **Glass wall RLS mismatch — non-admin visitors see empty workspace.**
   `/myheadspace/page.tsx` fetches categories and projects using `createClient()` (session-scoped, respects RLS). The RLS policies on `categories`, `projects`, `tasks`, and `task_notes` are all `admin_only FOR ALL` — meaning anonymous and non-admin users get zero rows back. The workspace renders but is completely empty for visitors. **Fix:** Add public SELECT policies on these 4 tables in Supabase SQL editor, keeping INSERT/UPDATE/DELETE as admin-only.

### Medium — Should Fix Before Production

2. **`ignoreBuildErrors: true` in `next.config.mjs`** — Hides TypeScript errors during build. Should be set to `false` and any build errors fixed.

3. **Stale test OAuth credentials in `.env.local`** — Lines `testgclientid` and `testgsecret` are unused test values that should be removed for hygiene.

4. **Vercel env vars may be stale.** `GEMINI_API_KEY`, `GROQ_API_KEY`, and `EMBED_SECRET` are set locally but may not be set in Vercel's environment. The deployed site's agent/embed endpoints will fail if these aren't mirrored to Vercel.

### Low — Nice to Have

5. **ChatWidget initial quota unknown** — Quota remaining is only fetched after the first agent response. Initial state shows nothing until first interaction.

6. **No drag-and-drop on kanban** — Task status changes are via kebab menu only (documented as intentional for MVP in BACKLOG.md).

7. **Middleware deprecation warning** — Next.js warns about deprecated middleware pattern (should use "proxy"). Functional but should be migrated eventually.

---

## Pending Manual Actions

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
6. Trigger re-embedding: `curl -X POST https://portfoliov2-three-liard.vercel.app/api/embed -H "x-embed-secret: 461d55ba99cf7857075d1a79ee705c1b2ac385c797e02d5495442883a5f43722"`

**To sync Vercel deployment:**
7. Ensure `GEMINI_API_KEY`, `GROQ_API_KEY`, and `EMBED_SECRET` are set in Vercel env vars (Settings → Environment Variables)

**Cleanup:**
8. Remove `testgclientid` and `testgsecret` lines from `.env.local`
9. Set `ignoreBuildErrors: false` in `next.config.mjs` and fix any build errors

---

## Session Log — February 28, 2026

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

## Session Log — March 5, 2026

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

## Session Log — March 6, 2026

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

## Session Log — March 15, 2026

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
