# PROGRESS.md — Session Checkpoint

Update this file at the END of every Claude Code session before closing VSCode.
Next session opener: "Continue Portfolio v2. Read /docs/PROGRESS.md for where we left off. Then read all other /docs files."

---

## Current Status

**Last updated:** February 28, 2026
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
| Phase 10 — Agent API Route | ✅ Done | `/api/agent` with full flow: quota enforcement via `consume_agent_quota` RPC (admin bypass for gilvinsz@gmail.com), Gemini embedding (`gemini-embedding-001`, 768 dims), pgvector similarity search via `match_knowledge_chunks` RPC, Groq `llama-3.1-8b-instant` answer generation. System prompt tuned for third-person voice, no hard refusals, prioritizes recent activity context. Saves user+assistant messages to `agent_chat_history` (authenticated) or `anon_chat_history` (anonymous, keyed by hashed IP). `TESTING_MODE` toggle controls source citation visibility. |
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
- **`workspace.tsx`** (~640 lines) — Full MyHeadSpace CRUD: categories, projects, tasks, task_notes. Admin guard (toast on unauthorized mutation). RAG sync on every CRUD op (non-blocking). Project docs include task status summaries; parent project re-synced on task create/delete/status change.
- **`kanban-board.tsx`** (345 lines) — 3-column kanban (To Do / In Progress / Done) with inline editing
- **`sidebar.tsx`** (422 lines) — Category tree with expandable projects, inline editing
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
- ✅ Agent config (`AGENT_MAX_OUTPUT_TOKENS`, `AGENT_TOP_K`, `AGENT_USER_DAILY_LIMIT`, `AGENT_ANON_DAILY_LIMIT`) — set
- ⚠️ `testgclientid` and `testgsecret` — stale test values still present (should be removed)

---

## Model Deviations from Docs

The following intentional changes were made via recent commits and differ from AGENT_SPEC.md / RAG_LITE.md:

| What | Docs say | Code uses | Reason |
|---|---|---|---|
| Chat model | `gemini-2.0-flash` | Groq `llama-3.1-8b-instant` | Gemini free tier chat quota too restrictive; Groq provides generous free tier for chat |
| Embedding model | `text-embedding-004` | `gemini-embedding-001` | Avoid 404 / compatibility (commits ce54695, b36fc8f, 988c13f) |
| Agent system prompt | Strict rules, hard refusals | Third-person voice, conversational, no hard refusals | Better UX — answers casual questions naturally, prioritizes recent activity |
| Agent quota | Enforced for all users | Bypassed for admin (gilvinsz@gmail.com) | Admin should have unlimited access to own portfolio agent |

**Chat completion** uses Groq SDK (`groq-sdk`) with `llama-3.1-8b-instant`. The `@google/generative-ai` SDK has been removed from the project.

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
