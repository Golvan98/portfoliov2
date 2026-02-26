# Scope & Phasing

## Phase 1 — Foundation
- Next.js app shell + routes
- Tailwind + shadcn/ui baseline
- Public landing page sections: Hero, Proof cards, Activity widget, Projects, Experience, Contact
- Supabase connected

## Phase 2 — MyHeadSpace v2 (private, `/myheadspace`)
- Google OAuth
- Admin gate for `gilvinsz@gmail.com` (via `app_admins` table)
- Route: `/myheadspace` — branded as a standalone workspace, not an "admin panel"
- `/myheadspace` is publicly viewable (glass wall) — anyone can browse
- Unauthorized mutation attempts show a toast flash message instead of redirecting
- RLS enforces write protection at the DB level regardless of UI
- CRUD:
  - categories
  - projects (belongs to category)
  - tasks (belongs to project) — status: todo/in_progress/done (kanban)
  - task_notes (belongs to task, task-scoped)
- Seed `portfolio_projects` table via SQL for MVP — RAG seed only, NOT used by landing page UI
- Landing page project cards remain HARDCODED — personal/hobby projects stay private in MyHeadSpace

## Phase 3 — Public Activity (read-only)
- `public_activity` table
- Landing activity widget: last 3 items + "Last active: X time ago"
- App-code logs every CRUD action on projects/tasks
- Realtime subscription updates the widget live
- `/now` route: longer activity history + load more

## Phase 4 — RAG-lite + Agent
- pgvector enabled
- `knowledge_docs` + `knowledge_chunks` tables
- Async batch embedding job
- `/api/agent` endpoint: quota check → embed → retrieve → answer with citations
- Chat UI
- Hybrid quotas (logged-in + anonymous)

---

## Out of Scope (MVP)
- Public CRUD demo mode
- Full RAG with complex evals or rerankers
- Multi-user workspaces
- Embedding `public_activity` rows
- Richer `/now` filtering (tags/search) — backlog
- Admin UI for curated portfolio project entries — backlog (seed via SQL for MVP)
