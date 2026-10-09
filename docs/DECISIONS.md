# Decisions — Architecture and Product Rationale

This document records durable decisions and explicitly superseded choices. Verify repository code when documentation conflicts with implementation; a decision records intent, not proof it is enforced. See [PROGRESS.md](PROGRESS.md) for shipped history, [ROADMAP.md](ROADMAP.md) for ordered refinements, and [BACKLOG.md](BACKLOG.md) for unresolved tasks.

---

## A) Public Activity Snippet

**A1. Log on EVERY CREATE/UPDATE/DELETE for:**
- projects
- tasks

Current message decision (March 6, `a8cc915`): store action/context prose in `entity_title`; the UI prepends “Gilvin”. Categories now also have logging calls. The original “Gilvin just …” bare-title format is historical. Project description edits currently lack logging, so the every-mutation requirement is not fully implemented; see [ACTIVITY_SPEC.md](ACTIVITY_SPEC.md).

Logging method: app-code only (after successful DB mutation, insert into public_activity).

**A2. Landing widget behavior:**
- Shows last 3 activities
- Shows "Last active: X time ago"
- No links inside activity items
- Realtime subscription on public_activity INSERTS for live updates

**A3. /now route is INCLUDED:**
- Route: `/now`
- Shows longer activity history (pagination or "load more")
- Uses `public_activity` table
- This is the "show more" destination from the landing widget

---

## B) Auth / Admin

- Encourage Google OAuth login.
- Only Gilvin can CRUD MyHeadSpace content.
- Admin identity: email == `gilvinsz@gmail.com`
- Admin gating method: `app_admins` table (LOCKED — not hard-coded email in RLS).
- RLS checks admin via: `EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())`
- Admin route: `/myheadspace` (NOT `/admin`) — branded as a distinct workspace product.
- `/myheadspace` has public-viewing intent and no page redirect. Actual data visibility depends on deployed RLS; the original admin-only SELECT templates conflict with that intent and require verification.
- Only `gilvinsz@gmail.com` can mutate data (create/update/delete).
- Unauthorized users who attempt any mutation (clicking "+ New Task", editing, deleting) see a non-blocking toast/flash message: "This workspace is Gilvin's private area — only he can make changes."
- RLS enforces this at the DB level regardless. The toast is a frontend affordance for visibility and recruiter experience.
- Do NOT redirect unauthorized users away from `/myheadspace` — the glass wall is intentional.

---

## C) RAG-lite Sources

Embed content from:
- MyHeadSpace projects
- MyHeadSpace tasks
- task_notes
- curated portfolio project entries (`portfolio_project` source type)
- work experience entries (`work_experience` source type)
- personal info entries (`personal_info` source type) — bio, education, skills, certifications

**Source types (LOCKED):** `project` | `task` | `note` | `portfolio_project` | `work_experience` | `personal_info`

**IMPORTANT — portfolio_projects table purpose (LOCKED):**
- The `portfolio_projects` table exists PURELY as a RAG knowledge seed.
- It does NOT drive the landing page UI — landing page project cards are HARDCODED in the component.
- These are Gilvin's FLAGSHIP projects only (ClipNET, StudySpring, MyHeadSpace) — not personal/hobby projects.
- Seeded once via SQL. Updated manually in Supabase table editor when flagship project details change.
- Curated source edits require corresponding knowledge-doc synchronization and a separate embedding run. The repo has no automatic source-table hook; content-hash detection only operates when `syncKnowledgeDoc()` is called.
- There is NO admin UI for portfolio_projects; original seed SQL had three rows, not a verified current count.
- Landing page stays hardcoded forever unless Gilvin manually edits the component file.

Do NOT embed `public_activity` rows for MVP (too noisy, redundant).

Chunking strategy (LOCKED — conditional):
- If `content length <= CHUNK_MIN_CHARS_BEFORE_SPLIT`: create 1 chunk (no split)
- Else: split into chunks of `CHUNK_TARGET_CHARS` with `CHUNK_OVERLAP_CHARS` overlap

Defaults:
- `CHUNK_MIN_CHARS_BEFORE_SPLIT` = 2000
- `CHUNK_TARGET_CHARS` = 1200
- `CHUNK_OVERLAP_CHARS` = 150

Embedding update policy:
- Create/Update: upsert `knowledge_docs`, set `needs_embedding = true` if `content_hash` changed
- Delete: remove `knowledge_docs` row; chunks cascade-delete

Embedding pipeline:
- Async/batch: the secret-authenticated `/api/embed` endpoint finds `needs_embedding = true` docs and processes them. No scheduler is checked in; do not assume flagged docs have been processed.

---

## D) Agent Behavior

**Current decision:** Ground claims about Gilvin in supplied evidence, speak in third person, acknowledge missing details, and keep answers concise. Casual/off-topic conversation is allowed. FORMAT instructions and cleanup suppress introductions/inline citations; source metadata is separate and POST visibility is controlled by `TESTING_MODE`. Prompt conflicts and citation/history limitations are documented in [AGENT_SPEC.md](AGENT_SPEC.md).

Prompt requests for recent/in-progress context do not establish current-state correctness. The live latest-task failure remains unresolved; no structured temporal lookup is implemented. Diagnose freshness before changing retrieval.

**HISTORICAL — original MVP answer policy, superseded:**

- Answer ONLY from retrieved chunks. Do NOT invent any detail not present in sources.
- If sources don't contain the answer: respond with "I don't have that detail in my portfolio data."
- If the question is unrelated to Gilvin's work or experience: politely redirect.
- Inline citations required: `From <Source Title> (updated <date>): …`
- Default answer style: concise + structured bullets for recruiter scannability.
- Offer follow-up expansion if needed.

---

## E) Usage Limits

Hybrid enforcement (LOCKED):
- Logged-in users: per-user quota (DB-backed via `agent_usage_user_daily`)
- Anonymous users: per-IP quota (DB-backed via `agent_usage_ip_daily`, hashed IP)

Defaults:
- Logged-in: 20 prompts/day
- Anonymous: 5 prompts/day

Quota is consumed once per non-admin agent question via `consume_agent_quota`, before Groq rewriting/completion and Gemini query embedding. The admin email bypasses it; batch embeddings do not use visitor quota. Limits come from DB RPC/tables, not the unused daily-limit env names. Provider failures use `ai_unavailable`; visitor exhaustion uses `quota_exceeded`. See [USAGE_LIMITS.md](USAGE_LIMITS.md).

---

## F) Embeddings Visibility

- `knowledge_docs` and `knowledge_chunks` are NOT publicly selectable.
- Agent/history/embedding routes use server-side service role. Workspace sync accesses knowledge docs using the admin browser session under RLS; no service-role secret is exposed to the browser.
- No public RLS SELECT policy on these tables — ever.

---

## G) Model Strategy

**Current decision — GPT-OSS revival (`ea2bb82`):** Groq via `groq-sdk` hosts both query rewriting and answer generation. Normal default `openai/gpt-oss-120b`; `GROQ_FAST_MODE=true` selects fast default `openai/gpt-oss-20b`. Optional overrides are `GROQ_MODEL` and `GROQ_FAST_MODEL`. `GROQ_API_KEY` → `GROQ_API_KEY_2` → `GROQ_API_KEY_3` fallback occurs on HTTP 429 only; shared quotas mean three keys do not guarantee triple quota.

Gemini remains embedding-only: `gemini-embedding-001`, 768 dimensions. Retrieval remains Supabase/pgvector/`match_knowledge_chunks`. The provider repair intentionally did not change RAG, prompts, quota policy or history. Output cap defaults to 400 tokens, vector top-K to 16, fast merged-context cap to eight. See [ENV.md](ENV.md).

**HISTORICAL — original model specification, superseded:**

- Use Google Gemini as the AI provider.
- Chat model: `gemini-2.0-flash`. Embedding model: `text-embedding-004` (768 dims).
- Keep responses concise: enforce `maxOutputTokens` via `AGENT_MAX_OUTPUT_TOKENS` env var.
- Default: `AGENT_MAX_OUTPUT_TOKENS` = 400, `AGENT_TOP_K` = 8

---

## H) Admin Gating

- Use `app_admins` table (locked).
- Seed Gilvin's `user_id` after first successful Google OAuth login via SQL.
- Do NOT hard-code email string directly in RLS policies.

---

## I) /myheadspace Visibility (Glass Wall)

- Keep the public glass-wall product intent; the page is not gated behind auth. The known RLS/template mismatch means public row visibility still needs verification.
- The workspace being visible to recruiters is intentional — it shows Gilvin's real work and organization.
- Mutation attempts (create/update/delete) by non-admins are handled as follows:
  - Frontend: show a non-blocking toast/flash message — "This workspace is Gilvin's private area — only he can make changes."
  - Backend: RLS blocks the actual DB write regardless — the toast is a UX affordance only.
- Toast behavior: appears top-right or bottom-right, auto-dismisses after 3 seconds, does not navigate away.
- Do NOT show a 403 page, modal, or redirect. The glass wall must feel seamless.

## J) Auth Flow

- `/auth/callback` — Supabase OAuth callback route. No visual UI. Exchanges code for session, then redirects to `/myheadspace` if admin, or `/` for everyone else.
- Login is triggered via the "Sign in" button in the navbar → opens a modal (not a page).
- Login modal contains: "Sign in to get more daily questions" + Google OAuth button.
- No dedicated `/login` page — modal only.
- `/chat` page is OMITTED. The floating chat widget is the agent's only UI surface.

---

## K) MyHeadSpace UI & Interaction Patterns

**Layout: Option A hybrid (LOCKED)**
- Left sidebar (`220px`): collapsible category tree with projects nested underneath
- Middle column (`flex-1`): project tabs at top + kanban board below
- Right panel (`300px`): task details + task-scoped notes

**Kanban board (LOCKED):**
- Tasks have 3 statuses: `todo` | `in_progress` | `done`
- This replaces the simple `is_done boolean` — see DATA_MODEL.md
- 3 columns: "To Do", "In Progress", "Done"
- Each column independently scrollable

**CRUD affordances (LOCKED):**
- Categories: `...` kebab on hover in sidebar → Edit name / Delete
- Projects: `...` kebab on hover in sidebar row + on hover over active project tab → Edit name / Delete. `+ New Project` tab creates new project.
- Tasks: `...` kebab on each task card → Edit title / Change status / Delete. `+ Add Task` in column header creates new task.
- Task notes: textarea in right panel, Save button. Notes are task-scoped (belong to selected task, not project).

**MyHeadSpace navbar (distinct from portfolio navbar):**
- Left: "MyHeadSpace." branding in Syne 700 with purple dot
- Right: user avatar + name, home icon linking back to `/`

**Glass wall toast (LOCKED):**
- Implemented via Sonner (already wired in v0 output)
- Toast message: "This workspace is Gilvin's private area — only he can make changes."
- Auto-dismisses after 3 seconds
- Fires on any mutation attempt by non-admin

**HISTORICAL — original MVP page checklist (these pages/components are now implemented):**
- `/` ✓
- `/now` ✓
- `/myheadspace` ✓
- `/auth/callback` — Claude Code builds (no UI)
- `not-found.tsx` — Claude Code builds inline
- Login modal — Claude Code builds inline
- `/chat` page — OMITTED (floating widget only)

---

## L) Personal Info & Static Links (LOCKED)

**HISTORICAL — original approved About copy (minor wording later changed in `app/page.tsx`):**
> "I'm Gilvin Zalsos — a backend-focused builder from the Philippines with a strong ops + data foundation. I like working on the parts of software that make everything else feel smooth and reliable: APIs, background jobs, automation pipelines, and the systems that move data from 'messy input' to 'clean output.' My technical comfort zone is end-to-end backend execution — designing services, wiring integrations, handling storage, and making workflows observable and repeatable. If you want someone who can ship, debug, and systematize — especially in backend/pipeline-heavy work — that's what I do."

**Static links (hardcoded in navbar + footer):**
- GitHub: https://github.com/Golvan98
- LinkedIn: https://www.linkedin.com/in/gilvin-zalsos-213692141/
- Resume: https://drive.google.com/file/d/1d_RmS4N7g7aRTEP-VICP0yKygA8KKmfn/view?usp=sharing
- Email: gilvinsz@gmail.com
- Vercel URL: https://portfoliov2-three-liard.vercel.app (no custom domain for MVP)

**Project card external links:**
- Current source is `components/projects-section.tsx`: ClipNET links to `https://clipnet.ai/` with a private-repo label; StudySpring has live/demo and GitHub links; MyHeadSpace 2.0 links to the workspace and this repo. MyHeadSpace v1.0 and Automated Needs Assessment Survey bring the current list to five cards.
- **HISTORICAL:** The original ClipNET/StudySpring `#` placeholders were superseded; do not restore them.

**OG tags for `app/layout.tsx`:**
- title: "Gilvin Zalsos — Full Stack Developer"
- description: "Backend-focused full stack developer from the Philippines. Ask my AI agent anything about my projects and experience."
- og:url: https://portfoliov2-three-liard.vercel.app

**personal_info RAG docs:** Seeded directly as `knowledge_docs` rows (no separate table). See DATA_MODEL.md for seed SQL. Covers: bio, education (BS Information Systems, MSU-IIT, 2015-2019), skills, certifications, and community involvement.
