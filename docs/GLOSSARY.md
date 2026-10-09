# Glossary

Use these definitions consistently. Database access descriptions express intended policies; deployed RLS has not been verified by this documentation pass (see [RLS_AUTH.md](RLS_AUTH.md)).

---

| Term | Definition |
|------|------------|
| **MyHeadSpace** | Gilvin's workspace at `/myheadspace`, with admin-only mutations. The page allows visitors without redirecting; intended public browsing depends on RLS (a visibility mismatch remains to verify). CRUD covers categories, projects, tasks and task_notes. |
| **Portfolio Projects** | Gilvin's flagship showcase projects (ClipNET, StudySpring, MyHeadSpace). Landing page cards are HARDCODED — not DB-driven. The `portfolio_projects` table exists purely as a RAG knowledge seed so the agent can answer questions about these projects. Seeded once via SQL. |
| **MyHeadSpace Projects** | Projects created inside the MyHeadSpace admin app. Source type: `project`. |
| **Activity Snippet** | The small widget on the landing page (`/`) showing the last 3 `public_activity` items + "Last active: X ago". |
| **/now page** | The route `/now` showing a longer history of `public_activity` items with load more / pagination. |
| **public_activity** | The public read-only Postgres table that stores activity log entries. SELECT is open to everyone; INSERT/UPDATE/DELETE is admin-only. |
| **knowledge_docs** | Internal (non-public) table. Intended one row per source item (project, task, note, portfolio project, work experience or personal info). Content is used for embedding; source ID uniqueness and freshness require verification. |
| **knowledge_chunks** | Internal (non-public) table. Derived from `knowledge_docs` via conditional chunking. Each row has an `embedding` vector. |
| **RAG-lite** | Retrieval approach: optional history-aware rewrite → Gemini embedding → `match_knowledge_chunks` → merge supplemental knowledge docs → Groq answer. No dedicated temporal lookup; see [agent_pipeline.md](agent_pipeline.md). |
| **Service Role** | The Supabase service role key (`SUPABASE_SERVICE_ROLE_KEY`). Used server-side in agent/history/embedding routes and admin lookup. Bypasses RLS. Never exposed to the client. |
| **Conditional Chunking** | If content is short (≤ `CHUNK_MIN_CHARS_BEFORE_SPLIT`), create 1 chunk. Otherwise split into overlapping chunks. |
| **Hybrid Quota** | Usage enforcement: logged-in users get per-user daily limits; anonymous users get per-IP daily limits. Both stored in DB. |
| **consume_agent_quota** | The Supabase RPC function that atomically checks and increments quota. `SECURITY DEFINER`. Called once per non-admin agent question before Groq/Gemini calls, not by the batch embedding endpoint; provider limits are separate. |
| **Admin** | Any user whose `user_id` exists in the `app_admins` table. The intended owner is Gilvin (`gilvinsz@gmail.com`); the agent quota bypass separately checks that email directly. |
| **portfolio_projects** | Supabase table used ONLY as a RAG seed for flagship projects. NOT used by the landing page UI (which is hardcoded). No public SELECT policy. Manual source-table changes have no checked-in automatic knowledge sync; the embedding route reads knowledge docs, not this table. |
| **Kanban board** | The task view inside MyHeadSpace. 3 columns: To Do, In Progress, Done. Maps to `tasks.status` field (`todo` / `in_progress` / `done`). |
| **Glass wall** | The UX pattern for `/myheadspace` — publicly viewable by anyone, but mutation attempts by non-admins show a Sonner toast instead of a redirect or 403. |
| **Sonner toast** | The toast notification library used for the glass wall message and other non-blocking UI feedback. Already wired via v0 scaffold. |
| **Task-scoped notes** | Notes in the right panel of MyHeadSpace belong to a specific task (via `task_notes.task_id`), not to a project. |
| **`...` kebab menu** | The three-dot overflow menu on category rows, project rows, project tabs, and task cards. Reveals Edit/Delete actions. Visible on hover. |
| **work_experience** | Supabase table storing Gilvin's work history (Ross Media Group, Northspyre, PivotalHire, Pylon). RAG seed only — no UI reads from it. Historically seeded via SQL; knowledge docs must be synchronized separately before embedding. |
| **Work Experience (RAG source)** | Source type `work_experience` in `knowledge_docs`. Allows the agent to answer questions about Gilvin's career history, roles, and skills. Content blob includes company, role, industry, duration, highlights, and tech stack. |
| **personal_info** | RAG source type for static personal knowledge — bio, education, skills, certifications. Seeded directly as `knowledge_docs` rows (no separate table). No CRUD hooks — update manually in Supabase when info changes. |
