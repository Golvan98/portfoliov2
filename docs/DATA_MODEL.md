# Data Model (Supabase)

## Important Notes
- Embeddings use pgvector. Vector dimension is **1536** (OpenAI `text-embedding-3-small` or `text-embedding-ada-002`).
- If you change the embedding model, update the vector dimension here and recreate the index.
- All UUIDs use `gen_random_uuid()` as default.
- All timestamps use `timestamptz default now()`.

---

## Admin Gating (LOCKED)

Table: `app_admins`

```
app_admins
  user_id    uuid pk references auth.users(id)
  email      text unique not null
  created_at timestamptz default now()
```

Admin check pattern used in all RLS policies:
```sql
EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid())
```

Seed Gilvin's user_id here after first Google OAuth login. Do NOT hard-code email in RLS.

---

## Admin-Only Tables (MyHeadSpace)

```
categories
  id          uuid pk default gen_random_uuid()
  owner_id    uuid not null references auth.users(id)
  name        text not null
  created_at  timestamptz default now()

projects
  id           uuid pk default gen_random_uuid()
  owner_id     uuid not null references auth.users(id)
  category_id  uuid references categories(id) on delete set null
  title        text not null
  description  text null
  created_at   timestamptz default now()
  updated_at   timestamptz default now()

tasks
  id          uuid pk default gen_random_uuid()
  owner_id    uuid not null references auth.users(id)
  project_id  uuid references projects(id) on delete cascade
  title       text not null
  status      text not null default 'todo'  -- 'todo' | 'in_progress' | 'done'
  priority    int null  -- optional, keep nullable for MVP
  created_at  timestamptz default now()
  updated_at  timestamptz default now()

task_notes
  id          uuid pk default gen_random_uuid()
  owner_id    uuid not null references auth.users(id)
  task_id     uuid references tasks(id) on delete cascade
  body        text not null
  created_at  timestamptz default now()
  updated_at  timestamptz default now()
```

---

## Public Read-Only Activity

```
public_activity
  id            uuid pk default gen_random_uuid()
  owner_id      uuid not null references auth.users(id)
  action        text not null  -- 'create' | 'update' | 'delete'
  entity_type   text not null  -- 'project' | 'task'
  entity_id     uuid not null
  entity_title  text not null  -- snapshot of title at time of action
  created_at    timestamptz default now()
```

Indexes:
```sql
CREATE INDEX ON public.public_activity (created_at DESC);
```

---

## RAG-lite Index (NOT Publicly Readable)

```
knowledge_docs
  id            uuid pk default gen_random_uuid()
  owner_id      uuid not null references auth.users(id)
  source_type   text not null  -- 'project' | 'task' | 'note' | 'portfolio_project'
  source_id     uuid not null
  title         text not null
  content       text not null
  content_hash  text not null
  needs_embedding bool default true
  created_at    timestamptz default now()
  updated_at    timestamptz default now()

knowledge_chunks
  id           uuid pk default gen_random_uuid()
  owner_id     uuid not null references auth.users(id)
  doc_id       uuid not null references knowledge_docs(id) on delete cascade
  chunk_index  int not null
  chunk_text   text not null
  chunk_hash   text not null
  embedding    vector(1536) not null
  created_at   timestamptz default now()
  updated_at   timestamptz default now()
```

Required indexes:
```sql
-- B-tree indexes
CREATE INDEX ON public.knowledge_chunks (doc_id);
CREATE INDEX ON public.knowledge_docs (updated_at DESC);
CREATE INDEX ON public.knowledge_docs (needs_embedding) WHERE needs_embedding = true;

-- Vector index (choose ONE based on Supabase pgvector version)
-- HNSW (preferred — better query performance, available in pgvector >= 0.5.0)
CREATE INDEX ON public.knowledge_chunks USING hnsw (embedding vector_cosine_ops);

-- IVFFLAT (fallback if HNSW not available)
-- CREATE INDEX ON public.knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

---

## Quota Tables (DB-Backed)

```
agent_usage_user_daily
  id       uuid pk default gen_random_uuid()
  user_id  uuid not null references auth.users(id)
  day      date not null
  used     int not null default 0
  limit    int not null default 20
  UNIQUE (user_id, day)

agent_usage_ip_daily
  id       uuid pk default gen_random_uuid()
  ip_hash  text not null
  day      date not null
  used     int not null default 0
  limit    int not null default 5
  UNIQUE (ip_hash, day)
```

---

## Portfolio Projects (Curated, Public Read)

These are the showcase entries displayed on the landing page and sourced into RAG.
Seeded via SQL for MVP. Admin can read/write; public can SELECT.

```
portfolio_projects
  id             uuid pk default gen_random_uuid()
  owner_id       uuid not null references auth.users(id)
  name           text not null
  role           text not null
  summary        text not null
  tech_list      text[] not null default '{}'    -- e.g. ARRAY['Next.js','Supabase']
  bullets        text[] not null default '{}'    -- key achievements/features
  links          jsonb null                      -- {"live":"https://...","github":"https://..."}
  display_order  int not null default 0          -- controls order on landing page
  is_published   bool not null default true
  created_at     timestamptz default now()
  updated_at     timestamptz default now()
```

Indexes:
```sql
CREATE INDEX ON public.portfolio_projects (display_order ASC);
CREATE INDEX ON public.portfolio_projects (is_published) WHERE is_published = true;
```
