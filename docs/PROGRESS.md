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
| Phase 10 — Agent API Route | ✅ Done | `/api/agent` with full flow: quota enforcement via `consume_agent_quota` RPC, Gemini embedding (`text-embedding-004`), pgvector similarity search via `match_knowledge_chunks` RPC, `gemini-2.0-flash` answer generation |
| Phase 11 — Wire Agent Chat UI | ✅ Done | Floating ChatWidget (bottom-right sparkles icon), message history, typing indicator, source citations (max 4), quota display, sign-in nudge for anon users |
| Phase 12 — Polish | 🟡 Partial | Custom 404 page done. Some env vars still need values. See Known Bugs below. |

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
- **`/api/embed`** — Background embedding job: finds `needs_embedding=true` docs, chunks, embeds via Gemini (`text-embedding-004`, 768 dims), stores vectors

### Key Components
- **`workspace.tsx`** — Full MyHeadSpace CRUD: categories, projects, tasks, task_notes. Admin guard (toast on unauthorized mutation). RAG sync on every CRUD op (non-blocking).
- **`chat-widget.tsx`** — Floating agent UI with message history, source citations, quota display, auth modal trigger
- **`activity-feed.tsx`** — Realtime subscription on `public_activity` inserts for live updates
- **`activity-list.tsx`** — Paginated activity list with colored action dots, 30s timestamp refresh
- **`auth-modal.tsx`** — Google OAuth trigger with quota tier explanation
- **`navbar.tsx`** — Sticky nav with user avatar/sign-out dropdown, mobile hamburger menu

### Lib/Utilities
- **`lib/supabase/client.ts`** — Browser client (anon key)
- **`lib/supabase/server.ts`** — Session-aware server client + service role client
- **`lib/supabase/middleware.ts`** — Token refresh on every request
- **`lib/auth/is-admin.ts`** — `getAdminStatus()` returns `{ isAdmin, userId }`
- **`lib/activity/log-activity.ts`** — Inserts into `public_activity`
- **`lib/rag/sync-knowledge-doc.ts`** — Upserts/deletes `knowledge_docs`, content blob builders
- **`lib/rag/chunk.ts`** — Conditional chunking with configurable thresholds
- **`lib/types.ts`** — TypeScript interfaces for Category, Project, Task, TaskNote
- **`lib/time-ago.ts`** — Relative timestamp formatting

### Infrastructure
- **`middleware.ts`** — Supabase auth token refresh on every request
- **`next.config.mjs`** — `ignoreBuildErrors: true`, `images.unoptimized: true`
- **`.env.local`** — Supabase URL/keys set, chunking/agent config set, `GEMINI_API_KEY` and `EMBED_SECRET` are **empty**

---

## Known Bugs & Blockers

### Critical — Blocks Functionality

1. **`GEMINI_API_KEY` is empty in `.env.local`** — Both `/api/agent` and `/api/embed` will fail with API errors. Agent chat and embedding pipeline are non-functional until this is set.
2. **`EMBED_SECRET` is empty in `.env.local`** — The `/api/embed` endpoint requires this header for auth. Embedding pipeline cannot be triggered.
3. **Glass wall RLS mismatch** — DECISIONS.md says `/myheadspace` is publicly viewable (glass wall), but RLS policies on `categories`, `projects`, `tasks`, `task_notes` are all `admin_only FOR ALL` (no public SELECT). Non-admin visitors see an **empty workspace** instead of Gilvin's projects/tasks. Fix: add public SELECT policies on these 4 tables, keep admin-only for INSERT/UPDATE/DELETE.

### Medium — Should Fix Before Production

4. **Stale test OAuth credentials in `.env.local`** — Lines `testgclientid` and `testgsecret` are hardcoded test values that should be removed.
5. **`ignoreBuildErrors: true` in `next.config.mjs`** — Hides TypeScript errors during build. Should be set to `false` and any build errors fixed.
6. **RAG seed data not loaded** — `portfolio_projects`, `work_experience`, and `personal_info` seed SQLs have not been run (require `app_admins` to be seeded first). Agent has no knowledge base to search until these are loaded and `/api/embed` is triggered.

### Low — Nice to Have

7. **ChatWidget initial quota unknown** — Quota remaining is only fetched after the first agent response. Initial state shows nothing until first interaction.
8. **No drag-and-drop on kanban** — Task status changes are via kebab menu only (documented as intentional for MVP in BACKLOG.md).

---

## Pending Manual Actions

**To make agent + RAG functional:**
1. Add `GEMINI_API_KEY` to `.env.local` (and Vercel env vars)
2. Generate and add `EMBED_SECRET` to `.env.local` (and Vercel env vars): `openssl rand -hex 32`
3. Run RAG seed SQLs in Supabase SQL editor (requires `app_admins` to be seeded):
   - `portfolio_projects` seed (DATA_MODEL.md)
   - `work_experience` seed (DATA_MODEL.md)
   - `personal_info` seed (DATA_MODEL.md)
4. Trigger embedding: `curl -X POST https://<url>/api/embed -H "x-embed-secret: <secret>"`

**To fix glass wall:**
5. Add public SELECT policies for `categories`, `projects`, `tasks`, `task_notes` in Supabase SQL editor

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
