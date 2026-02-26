# Decisions (Locked) — Single Source of Truth

If any file conflicts with this document, this document wins.

---

## A) Public Activity Snippet

**A1. Log on EVERY CREATE/UPDATE/DELETE for:**
- projects
- tasks

Message format (locked):
- "Gilvin just created project: {title}"
- "Gilvin just updated task: {title}"
- "Gilvin just deleted task: {title}"

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
- `/myheadspace` is publicly VIEWABLE — anyone can visit and browse the workspace.
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
- When updated, RAG pipeline re-embeds the new content automatically (content_hash change detection).
- There is NO admin UI for portfolio_projects — Supabase table editor is sufficient for 3 rows.
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
- Async/batch: background job finds `needs_embedding = true` rows and processes them

---

## D) Agent Behavior

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

Quota is enforced server-side via `consume_agent_quota` RPC before any Gemini call.

---

## F) Embeddings Visibility

- `knowledge_docs` and `knowledge_chunks` are NOT publicly selectable.
- `/api/agent` and the embedding job access them via service role only (server-side).
- No public RLS SELECT policy on these tables — ever.

---

## G) Model Strategy

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

- `/myheadspace` is publicly VIEWABLE by anyone — do NOT gate the page behind auth.
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

**Pages finalized — no more pages needed for MVP:**
- `/` ✓
- `/now` ✓
- `/myheadspace` ✓
- `/auth/callback` — Claude Code builds (no UI)
- `not-found.tsx` — Claude Code builds inline
- Login modal — Claude Code builds inline
- `/chat` page — OMITTED (floating widget only)

---

## L) Personal Info & Static Links (LOCKED)

**About section copy (landing page — hardcoded):**
> "I'm Gilvin Zalsos — a backend-focused builder from the Philippines with a strong ops + data foundation. I like working on the parts of software that make everything else feel smooth and reliable: APIs, background jobs, automation pipelines, and the systems that move data from 'messy input' to 'clean output.' My technical comfort zone is end-to-end backend execution — designing services, wiring integrations, handling storage, and making workflows observable and repeatable. If you want someone who can ship, debug, and systematize — especially in backend/pipeline-heavy work — that's what I do."

**Static links (hardcoded in navbar + footer):**
- GitHub: https://github.com/Golvan98
- LinkedIn: https://www.linkedin.com/in/gilvin-zalsos-213692141/
- Resume: https://drive.google.com/file/d/1d_RmS4N7g7aRTEP-VICP0yKygA8KKmfn/view?usp=sharing
- Email: gilvinsz@gmail.com
- Vercel URL: https://portfoliov2-three-liard.vercel.app (no custom domain for MVP)

**Project card external links:**
- ClipNET and StudySpring "Test it out" and "View code" buttons: leave href as `#` for now — links not ready yet
- MyHeadSpace "Test it out" button: links to `https://portfoliov2-three-liard.vercel.app/myheadspace`

**OG tags for `app/layout.tsx`:**
- title: "Gilvin Zalsos — Full Stack Developer"
- description: "Backend-focused full stack developer from the Philippines. Ask my AI agent anything about my projects and experience."
- og:url: https://portfoliov2-three-liard.vercel.app

**personal_info RAG docs:** Seeded directly as `knowledge_docs` rows (no separate table). See DATA_MODEL.md for seed SQL. Covers: bio, education (BS Information Systems, MSU-IIT, 2015-2019), skills, certifications, and community involvement.
