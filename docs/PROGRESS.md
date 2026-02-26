# PROGRESS.md — Session Checkpoint

Update this file at the END of every Claude Code session before closing VSCode.
Next session opener: "Continue Portfolio v2. Read /docs/PROGRESS.md for where we left off. Then read all other /docs files."

---

## Current Status

**Last updated:** February 27, 2026
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
| Phase 9 — RAG-lite Pipeline | ✅ Done | `/api/embed` endpoint with EMBED_SECRET auth, conditional chunking (1200 chars / 150 overlap), `syncKnowledgeDoc()` and `deleteKnowledgeDoc()` helpers called on every CRUD operation |
| Phase 10 — Agent API Route | ✅ Done | `/api/agent` with full flow: quota enforcement via `consume_agent_quota` RPC, Gemini embedding (`gemini-embedding-001`, 768 dims), pgvector similarity search via `match_knowledge_chunks` RPC, `gemini-1.5-flash` answer generation |
| Phase 11 — Wire Agent Chat UI | ✅ Done | Floating ChatWidget (bottom-right sparkles icon), message history, typing indicator, source citations (max 4), quota display, sign-in nudge for anon users |
| Phase 12 — Polish | 🟡 Partial | Custom 404 page done. Glass wall RLS still broken. See Known Bugs below. |

---

## What's Built (Codebase Audit Summary)

### Pages
- **`/`** — Hero, proof cards, activity widget (realtime), projects section, about, contact, footer, ChatWidget
- **`/now`** — Activity history with load-more, fetches `public_activity` (20 per page)
- **`/myheadspace`** — Server component with admin guard, passes initial categories/projects to Workspace client component
- **`/auth/callback`** — OAuth code exchange, redirects admin to `/myheadspace`, others to `/`
- **`not-found.tsx`** — Custom 404 with "Back to portfolio" button

### API Routes
- **`/api/agent`** — Full RAG pipeline: quota check → embed question → vector search → LLM answer with sources
- **`/api/embed`** — Background embedding job: finds `needs_embedding=true` docs, chunks, embeds via Gemini (`gemini-embedding-001`, 768 dims), stores vectors

### Key Components
- **`workspace.tsx`** (597 lines) — Full MyHeadSpace CRUD: categories, projects, tasks, task_notes. Admin guard (toast on unauthorized mutation). RAG sync on every CRUD op (non-blocking).
- **`kanban-board.tsx`** (345 lines) — 3-column kanban (To Do / In Progress / Done) with inline editing
- **`sidebar.tsx`** (422 lines) — Category tree with expandable projects, inline editing
- **`task-card.tsx`** (155 lines) — Individual task card with status dropdown, edit, delete
- **`task-details.tsx`** (115 lines) — Right panel showing task info and notes textarea
- **`chat-widget.tsx`** (330 lines) — Floating agent UI with message history, source citations, quota display, auth modal trigger
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
- **`package.json`** — Next.js 16.1.6, React 19.2.4, @google/generative-ai 0.24.1, @supabase/ssr 0.8.0, Tailwind 4.2.0, 60+ shadcn/ui components

### Env Vars (`.env.local`)
- ✅ `NEXT_PUBLIC_SUPABASE_URL` — set
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` — set
- ✅ `SUPABASE_SERVICE_ROLE_KEY` — set
- ✅ `GEMINI_API_KEY` — set
- ✅ `EMBED_SECRET` — set
- ✅ Chunking config (`CHUNK_MIN_CHARS_BEFORE_SPLIT`, `CHUNK_TARGET_CHARS`, `CHUNK_OVERLAP_CHARS`) — set
- ✅ Agent config (`AGENT_MAX_OUTPUT_TOKENS`, `AGENT_TOP_K`, `AGENT_USER_DAILY_LIMIT`, `AGENT_ANON_DAILY_LIMIT`) — set
- ⚠️ `testgclientid` and `testgsecret` — stale test values still present (should be removed)

---

## Model Deviations from Docs

The following intentional changes were made via recent commits and differ from AGENT_SPEC.md / RAG_LITE.md:

| What | Docs say | Code uses | Reason |
|---|---|---|---|
| Chat model | `gemini-2.0-flash` | `gemini-1.5-flash` | Avoid rate limits (commit c907a3e) |
| Embedding model | `text-embedding-004` | `gemini-embedding-001` | Avoid 404 / compatibility (commits ce54695, b36fc8f, 988c13f) |

Both embedding endpoints (`/api/agent` and `/api/embed`) use Gemini REST API directly (not the SDK's `embedContent`) with `outputDimensionality: 768`, which matches the pgvector column dimension.

---

## Known Bugs & Blockers

### Critical — Blocks Functionality

1. **Glass wall RLS mismatch — non-admin visitors see empty workspace.**
   `/myheadspace/page.tsx` fetches categories and projects using `createClient()` (session-scoped, respects RLS). The RLS policies on `categories`, `projects`, `tasks`, and `task_notes` are all `admin_only FOR ALL` — meaning anonymous and non-admin users get zero rows back. The workspace renders but is completely empty for visitors. **Fix:** Add public SELECT policies on these 4 tables in Supabase SQL editor, keeping INSERT/UPDATE/DELETE as admin-only.

2. **RAG seed data likely not loaded.** The `portfolio_projects`, `work_experience`, and `personal_info` seed SQLs (DATA_MODEL.md) require `app_admins` to be seeded first. If these haven't been run, the agent has no knowledge base to search — it will return "(No sources found)" for every question. **Status unknown — requires checking Supabase tables.**

### Medium — Should Fix Before Production

3. **`ignoreBuildErrors: true` in `next.config.mjs`** — Hides TypeScript errors during build. Should be set to `false` and any build errors fixed.

4. **Stale test OAuth credentials in `.env.local`** — Lines `testgclientid` and `testgsecret` are unused test values that should be removed for hygiene.

5. **Vercel env vars may be stale.** `GEMINI_API_KEY` and `EMBED_SECRET` are set locally but may not be set in Vercel's environment. The deployed site's agent/embed endpoints will fail if these aren't mirrored to Vercel.

### Low — Nice to Have

6. **ChatWidget initial quota unknown** — Quota remaining is only fetched after the first agent response. Initial state shows nothing until first interaction.

7. **No drag-and-drop on kanban** — Task status changes are via kebab menu only (documented as intentional for MVP in BACKLOG.md).

8. **Middleware deprecation warning** — Next.js warns about deprecated middleware pattern (should use "proxy"). Functional but should be migrated eventually.

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

**To make agent + RAG functional (if seed data not loaded):**
2. Verify `app_admins` is seeded (Gilvin's `user_id` after first Google login)
3. Run RAG seed SQLs in Supabase SQL editor:
   - `portfolio_projects` seed (DATA_MODEL.md)
   - `work_experience` seed (DATA_MODEL.md)
   - `personal_info` seed (DATA_MODEL.md)
4. Trigger embedding: `curl -X POST https://portfoliov2-three-liard.vercel.app/api/embed -H "x-embed-secret: <secret>"`

**To sync Vercel deployment:**
5. Ensure `GEMINI_API_KEY` and `EMBED_SECRET` are set in Vercel env vars (Settings → Environment Variables)

**Cleanup:**
6. Remove `testgclientid` and `testgsecret` lines from `.env.local`
7. Set `ignoreBuildErrors: false` in `next.config.mjs` and fix any build errors

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
