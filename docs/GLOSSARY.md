# Glossary

Use these definitions consistently across all files and code. When in doubt, refer here.

---

| Term | Definition |
|------|------------|
| **MyHeadSpace** | Gilvin's private workspace app at `/myheadspace`. CRUD for categories, projects, tasks, and task_notes. Branded as a standalone product, not an admin panel. Only accessible to `gilvinsz@gmail.com`. |
| **Portfolio Projects** | Gilvin's flagship showcase projects (ClipNET, StudySpring, MyHeadSpace). Landing page cards are HARDCODED — not DB-driven. The `portfolio_projects` table exists purely as a RAG knowledge seed so the agent can answer questions about these projects. Seeded once via SQL. |
| **MyHeadSpace Projects** | Projects created inside the MyHeadSpace admin app. Source type: `project`. |
| **Activity Snippet** | The small widget on the landing page (`/`) showing the last 3 `public_activity` items + "Last active: X ago". |
| **/now page** | The route `/now` showing a longer history of `public_activity` items with load more / pagination. |
| **public_activity** | The public read-only Postgres table that stores activity log entries. SELECT is open to everyone; INSERT/UPDATE/DELETE is admin-only. |
| **knowledge_docs** | Internal (non-public) table. One row per source item (project, task, note, portfolio project). Content is the full text blob used for embedding. |
| **knowledge_chunks** | Internal (non-public) table. Derived from `knowledge_docs` via conditional chunking. Each row has an `embedding` vector. |
| **RAG-lite** | Retrieval approach: embed the question → cosine similarity search over `knowledge_chunks` → pass top K results as context to the agent. No rerankers or complex evals for MVP. |
| **Service Role** | The Supabase service role key (`SUPABASE_SERVICE_ROLE_KEY`). Used server-side only in `/api/agent` and the embedding job. Bypasses RLS. Never exposed to the client. |
| **Conditional Chunking** | If content is short (≤ `CHUNK_MIN_CHARS_BEFORE_SPLIT`), create 1 chunk. Otherwise split into overlapping chunks. |
| **Hybrid Quota** | Usage enforcement: logged-in users get per-user daily limits; anonymous users get per-IP daily limits. Both stored in DB. |
| **consume_agent_quota** | The Supabase RPC function that atomically checks and increments quota. `SECURITY DEFINER`. Called before every OpenAI request. |
| **Admin** | Any user whose `user_id` exists in the `app_admins` table. Currently only Gilvin (`gilvinsz@gmail.com`). |
| **portfolio_projects** | Supabase table used ONLY as a RAG seed for flagship projects. NOT used by the landing page UI (which is hardcoded). No public SELECT policy. Service role reads it for embedding. Updated manually via Supabase table editor. |
| **Kanban board** | The task view inside MyHeadSpace. 3 columns: To Do, In Progress, Done. Maps to `tasks.status` field (`todo` / `in_progress` / `done`). |
| **Glass wall** | The UX pattern for `/myheadspace` — publicly viewable by anyone, but mutation attempts by non-admins show a Sonner toast instead of a redirect or 403. |
| **Sonner toast** | The toast notification library used for the glass wall message and other non-blocking UI feedback. Already wired via v0 scaffold. |
| **Task-scoped notes** | Notes in the right panel of MyHeadSpace belong to a specific task (via `task_notes.task_id`), not to a project. |
| **`...` kebab menu** | The three-dot overflow menu on category rows, project rows, project tabs, and task cards. Reveals Edit/Delete actions. Visible on hover. |
| **work_experience** | Supabase table storing Gilvin's work history (Ross Media Group, Northspyre, PivotalHire, Pylon). RAG seed only — no UI reads from it. Service role access for embedding pipeline. Seeded once via SQL after app_admins is set up. |
| **Work Experience (RAG source)** | Source type `work_experience` in `knowledge_docs`. Allows the agent to answer questions about Gilvin's career history, roles, and skills. Content blob includes company, role, industry, duration, highlights, and tech stack. |
| **personal_info** | RAG source type for static personal knowledge — bio, education, skills, certifications. Seeded directly as `knowledge_docs` rows (no separate table). No CRUD hooks — update manually in Supabase when info changes. |
