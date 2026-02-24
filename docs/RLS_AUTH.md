# RLS + Auth — SQL Templates (Copy/Paste into Supabase)

All policies use the `app_admins` table for admin checks. Do NOT hard-code email strings in RLS.

---

## 0) Enable Extension

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## 1) Admin Check Pattern

Used inside all admin policies:
```sql
EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid())
```

---

## 2) Enable RLS on All Tables

```sql
ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_usage_user_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_usage_ip_daily ENABLE ROW LEVEL SECURITY;
```

---

## 3) app_admins Policies

```sql
CREATE POLICY "app_admins_select"
ON public.app_admins FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid())
);

CREATE POLICY "app_admins_write"
ON public.app_admins FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid())
);
```

> Bootstrap: after Gilvin's first Google login, run:
> `INSERT INTO public.app_admins (user_id, email) VALUES ('<gilvin_user_id>', 'gilvinsz@gmail.com');`

---

## 4) MyHeadSpace Tables (Admin-Only)

```sql
-- categories
CREATE POLICY "categories_admin_only"
ON public.categories FOR ALL
USING (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()));

-- projects
CREATE POLICY "projects_admin_only"
ON public.projects FOR ALL
USING (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()));

-- tasks
CREATE POLICY "tasks_admin_only"
ON public.tasks FOR ALL
USING (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()));

-- task_notes
CREATE POLICY "task_notes_admin_only"
ON public.task_notes FOR ALL
USING (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()));
```

---

## 5) public_activity Policies

```sql
-- Public can read
CREATE POLICY "public_activity_public_read"
ON public.public_activity FOR SELECT
USING (true);

-- Only admin can insert
CREATE POLICY "public_activity_admin_insert"
ON public.public_activity FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()));

-- Only admin can update
CREATE POLICY "public_activity_admin_update"
ON public.public_activity FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()));

-- Only admin can delete
CREATE POLICY "public_activity_admin_delete"
ON public.public_activity FOR DELETE
USING (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()));
```

---

## 6) Embeddings Tables (NO Public Access)

Agent and embedding job access these via service role server-side only.

```sql
CREATE POLICY "knowledge_docs_admin_only"
ON public.knowledge_docs FOR ALL
USING (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()));

CREATE POLICY "knowledge_chunks_admin_only"
ON public.knowledge_chunks FOR ALL
USING (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()));
```

---

## 7) Quota Tables (No Public Access)

Writes happen via `consume_agent_quota` RPC (SECURITY DEFINER). Admin can inspect directly.

```sql
CREATE POLICY "agent_usage_user_admin_only"
ON public.agent_usage_user_daily FOR ALL
USING (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()));

CREATE POLICY "agent_usage_ip_admin_only"
ON public.agent_usage_ip_daily FOR ALL
USING (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()));
```

---

## 8) portfolio_projects (Public Read, Admin Write)

```sql
ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;

-- Anyone can read published portfolio projects (landing page)
CREATE POLICY "portfolio_projects_public_read"
ON public.portfolio_projects FOR SELECT
USING (is_published = true);

-- Only admin can insert/update/delete
CREATE POLICY "portfolio_projects_admin_write"
ON public.portfolio_projects FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()));

CREATE POLICY "portfolio_projects_admin_update"
ON public.portfolio_projects FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()));

CREATE POLICY "portfolio_projects_admin_delete"
ON public.portfolio_projects FOR DELETE
USING (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()));
```
