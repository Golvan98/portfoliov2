# Data Model (Supabase)

## Important Notes
- This is a schema reference plus historical SQL templates, not a verified export of the deployed database. No migration files or deployed-schema exports are checked in; `match_knowledge_chunks` SQL is absent. The quota RPC template is in USAGE_LIMITS. SQL below has not been executed by this reconciliation.
- Embeddings use pgvector, **768** dimensions from Gemini `gemini-embedding-001` with explicit output dimensionality. Groq-hosted GPT-OSS is chat-only; its migration required no vector/schema changes.
- Any future embedding change needs compatibility/re-embedding review; a chat-model change alone does not require changing dimensions or indexes.
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

## MyHeadSpace Tables (admin writes; public-read intent)

The app allows visiting the workspace without redirecting. The SQL templates in [RLS_AUTH.md](RLS_AUTH.md) restrict reads too, conflicting with glass-wall intent; deployed policy state needs verification.

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
  entity_type   text not null  -- app sends 'project' | 'task' | 'category'
  entity_id     uuid not null
  entity_title  text not null  -- current app stores a preformatted action/context message
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
  source_type   text not null  -- 'project' | 'task' | 'note' | 'portfolio_project' | 'work_experience' | 'personal_info'
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
  embedding    vector(768) not null
  created_at   timestamptz default now()
  updated_at   timestamptz default now()
```

`source_id` is a generic source identifier; no source-table cascade is declared here. Sync looks up `(source_type, source_id)`, but this reference does not define a unique constraint for that pair: verify deployed uniqueness. Explicit source deletion cleanup and doc-to-chunk cascade are distinct.

`knowledge_docs.updated_at` changes on both sync and embedding; it is not a reliable source-event timestamp. Category creation currently supplies an empty activity entity ID, inconsistent with the documented UUID column. These are open verification targets in [BACKLOG.md](BACKLOG.md) and [ROADMAP.md](ROADMAP.md), lanes 2–3.

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

## Portfolio Projects (RAG Seed Only — NOT Used by Landing Page UI)

**CRITICAL:** This table exists PURELY to give the AI agent context about Gilvin's flagship projects.
The landing page project cards are HARDCODED in the component — this table does NOT drive the UI.

These are Gilvin's flagship/showcase projects only (ClipNET, StudySpring, MyHeadSpace).
Personal or hobby projects are NOT included here.

Seeded once via SQL after first deploy. Updated manually in Supabase table editor when needed.
No checked-in hook copies edits from this source table into `knowledge_docs`. Its corresponding knowledge content/hash must be synchronized and marked `needs_embedding=true` before a separate `/api/embed` invocation; automatic end-to-end refresh is not established.
No admin UI exists for this table. The original seed below has three entries; this is not a claim about current deployed row count or the five hardcoded landing cards.

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
  display_order  int not null default 0          -- for RAG retrieval ordering only
  is_published   bool not null default true
  created_at     timestamptz default now()
  updated_at     timestamptz default now()
```

Indexes:
```sql
CREATE INDEX ON public.portfolio_projects (display_order ASC);
CREATE INDEX ON public.portfolio_projects (is_published) WHERE is_published = true;
```

HISTORICAL — original portfolio seed SQL (preserved, not verified current content; do not blindly rerun):
```sql
INSERT INTO public.portfolio_projects (owner_id, name, role, summary, tech_list, bullets, links, display_order)
VALUES
  (
    (SELECT user_id FROM app_admins LIMIT 1),
    'ClipNET',
    'Full-stack Engineer',
    'An end-to-end video pipeline that ingests raw footage, runs object detection and scene segmentation, and surfaces highlights through a clean web dashboard.',
    ARRAY['Python', 'FastAPI', 'React', 'PostgreSQL', 'OpenCV'],
    ARRAY['Object detection pipeline', 'Scene segmentation', 'Web dashboard for highlights'],
    '{"github": "https://github.com/Golvan98/clipnet"}',
    1
  ),
  (
    (SELECT user_id FROM app_admins LIMIT 1),
    'StudySpring',
    'Full-stack Engineer',
    'A spaced repetition study platform with adaptive scheduling, progress analytics, and collaborative decks built around retention science.',
    ARRAY['Next.js', 'Supabase', 'Tailwind', 'TypeScript'],
    ARRAY['Spaced repetition algorithm', 'Progress analytics', 'Collaborative decks'],
    '{"github": "https://github.com/Golvan98/studyspring"}',
    2
  ),
  (
    (SELECT user_id FROM app_admins LIMIT 1),
    'MyHeadSpace',
    'Full-stack Engineer',
    'A private workspace for managing projects, tasks, and notes — the operational core of this portfolio. Every action is publicly logged so visitors see real, ongoing work.',
    ARRAY['Next.js', 'Supabase', 'pgvector', 'OpenAI'],
    ARRAY['RAG-lite agent pipeline', 'Real-time activity feed', 'Kanban task management'],
    '{"live": "https://portfoliov2-three-liard.vercel.app"}',
    3
  );
```

---

## Work Experience (RAG Seed Only — NOT Used by Any UI)

**CRITICAL:** This table exists PURELY to give the AI agent context about Gilvin's work history.
No UI reads from this table. Seeded once via SQL. Updated manually in Supabase table editor when a new role is added.
No checked-in hook copies edits from this source table into `knowledge_docs`. Its corresponding knowledge content/hash must be synchronized and marked `needs_embedding=true` before a separate `/api/embed` invocation; automatic end-to-end refresh is not established.

```
work_experience
  id            uuid pk default gen_random_uuid()
  owner_id      uuid not null references auth.users(id)
  company       text not null
  role          text not null
  industry      text not null
  duration      text not null        -- e.g. '2025 → Present', '~4 years'
  description   text not null        -- full narrative paragraph
  highlights    text[] not null default '{}'   -- bullet points
  tech_list     text[] not null default '{}'   -- tools/stack used
  is_current    bool not null default false    -- true if current role
  display_order int not null default 0         -- most recent = lowest number
  created_at    timestamptz default now()
  updated_at    timestamptz default now()
```

Indexes:
```sql
CREATE INDEX ON public.work_experience (display_order ASC);
CREATE INDEX ON public.work_experience (is_current) WHERE is_current = true;
```

HISTORICAL — original work-experience seed SQL (preserved, not verification of current roles):
```sql
INSERT INTO public.work_experience
  (owner_id, company, role, industry, duration, description, highlights, tech_list, is_current, display_order)
VALUES
(
  (SELECT user_id FROM app_admins LIMIT 1),
  'Ross Media Group',
  'Backend Software Engineer — Backend & Pipeline + DevOps (Contract)',
  'Media / Creator Tools (AI-assisted Twitch clip generation)',
  '2025 → Present',
  'Backend engineer on ClipNET, an end-to-end Twitch live/VOD processing pipeline that turns streams into segment files and metadata for downstream scoring and clip selection.',
  ARRAY[
    'Built and maintained an end-to-end Twitch live/VOD processing pipeline producing segments, transcripts, previews, and analytics for ML ingestion',
    'Implemented durable job orchestration using Redis and DB job tables with idempotency, deduplication, retries, and status observability',
    'Integrated FFmpeg and Streamlink for capture and segmentation workflows producing structured artifacts',
    'Wired Cloudinary uploads and media lifecycle tracking for stable URL access to generated previews and clips',
    'Handled DevOps and storage infrastructure including S3-compatible APIs, Cloudflare R2 bucket workflows, and container/staging reliability'
  ],
  ARRAY['Python', 'FastAPI', 'Redis', 'PostgreSQL', 'Docker', 'FFmpeg', 'Streamlink', 'Cloudinary', 'Cloudflare R2', 'Railway', 'Linux'],
  true,
  1
),
(
  (SELECT user_id FROM app_admins LIMIT 1),
  'Northspyre',
  'Website Administrator / Vendor Profile Manager',
  'SaaS — Real estate / construction project management',
  '~4 years',
  'Managed and maintained vendor and profile records at scale on a SaaS platform serving real estate and construction project management clients, ensuring data accuracy and operational consistency.',
  ARRAY[
    'Managed vendor/profile records at scale ensuring data accuracy and consistency across the platform',
    'Improved operational workflows by restructuring trackers and introducing clearer IDs, ownership, and status conventions',
    'Created source-of-truth documentation and cheat sheets to reduce repeated research and speed up onboarding',
    'Trained teammates on best practices for data hygiene and repeatable admin processes',
    'Coordinated updates and communications to keep profiles current and compliant with internal standards'
  ],
  ARRAY['Excel', 'Google Sheets', 'Internal admin/CMS tools', 'Documentation/workflow trackers'],
  false,
  2
),
(
  (SELECT user_id FROM app_admins LIMIT 1),
  'PivotalHire Solutions',
  'Data Quality Analyst / Data Analyst',
  'Staffing / Recruiting operations (data services)',
  'Duration unspecified',
  'Data analyst focused on cleaning, validating, and maintaining large datasets for a staffing and recruiting operations firm, ensuring high-integrity records for downstream teams.',
  ARRAY[
    'Cleaned and validated large datasets, resolving inconsistencies and ensuring high-integrity records',
    'Reconciled mismatched entries and standardized fields to improve usability for downstream teams',
    'Maintained structured trackers and QA checks to keep datasets reliable over time',
    'Flagged recurring data issues and helped improve processes to prevent repeat errors'
  ],
  ARRAY['Excel', 'Spreadsheet-based QA workflows'],
  false,
  3
),
(
  (SELECT user_id FROM app_admins LIMIT 1),
  'Pylon Online Solutions',
  'Lead Generator',
  'BPO / Lead generation',
  '~1 year',
  'Lead generator for BPO clients, building and qualifying lead pipelines using repeatable research and sourcing workflows, including introducing scraper-assisted processes to improve throughput.',
  ARRAY[
    'Generated and qualified leads for BPO clients using repeatable research and sourcing workflows',
    'Built and introduced a scraper-assisted process to speed up data collection and improve throughput',
    'Maintained trackers and pipeline status updates to keep lead lists organized and actionable',
    'Coordinated with stakeholders to align lead requirements and delivery expectations'
  ],
  ARRAY['Web research tools', 'Spreadsheet trackers', 'Scraping/automation tooling'],
  false,
  4
);
```

---

## Personal Info (RAG Seed Only — Static Knowledge)

No table needed for these — they are seeded directly as `knowledge_docs` rows with source_type `personal_info`.
HISTORICAL — original personal-info seed SQL below is preserved. Verify current content before applying any update; these inserts are not idempotent. Historical MyHeadSpace seed text names OpenAI, but the current runtime uses Groq chat and Gemini embeddings.

```sql
-- Bio / About
INSERT INTO public.knowledge_docs (owner_id, source_type, source_id, title, content, content_hash, needs_embedding)
VALUES (
  (SELECT user_id FROM app_admins LIMIT 1),
  'personal_info',
  gen_random_uuid(),
  'About Gilvin Zalsos',
  'Name: Gilvin Zalsos
Title: Full Stack Developer (Backend-focused)
Location: Iligan City, Philippines
Email: gilvinsz@gmail.com
Phone: +639761202389
GitHub: https://github.com/Golvan98
LinkedIn: https://www.linkedin.com/in/gilvin-zalsos-213692141/
Resume: https://drive.google.com/file/d/1d_RmS4N7g7aRTEP-VICP0yKygA8KKmfn/view?usp=sharing

About:
I am Gilvin Zalsos — a backend-focused builder from the Philippines with a strong ops and data foundation. I like working on the parts of software that make everything else feel smooth and reliable: APIs, background jobs, automation pipelines, and the systems that move data from messy input to clean output.

My technical comfort zone is end-to-end backend execution — designing services, wiring integrations, handling storage, and making workflows observable and repeatable. I enjoy untangling complexity: breaking big problems into small components, adding the right logs and guardrails, and turning a fragile process into something dependable.

If you want someone who can ship, debug, and systematize — especially in backend/pipeline-heavy work — that is what I do.',
  md5('bio-v1'),
  true
);

-- Education
INSERT INTO public.knowledge_docs (owner_id, source_type, source_id, title, content, content_hash, needs_embedding)
VALUES (
  (SELECT user_id FROM app_admins LIMIT 1),
  'personal_info',
  gen_random_uuid(),
  'Education — Gilvin Zalsos',
  'Degree: Bachelor of Science in Information Systems
Institution: MSU - Iligan Institute of Technology, Philippines
Duration: 2015 - 2019
Notable project: System Development Project — Mental Health Services System and Analytics for Guidance Services',
  md5('education-v1'),
  true
);

-- Skills
INSERT INTO public.knowledge_docs (owner_id, source_type, source_id, title, content, content_hash, needs_embedding)
VALUES (
  (SELECT user_id FROM app_admins LIMIT 1),
  'personal_info',
  gen_random_uuid(),
  'Skills — Gilvin Zalsos',
  'Tech Stack: Python, HTML, PHP, Javascript, PostgreSQL, MySQL, Node.js, Express.js, Typescript, React, Vue.js, Next.js, Laravel
Other Skills: Database Management, Business Process Engineering, Project Management, Public Speaking, Lead Generation and Data Mining
Languages: English (Native or Bilingual Proficiency), Filipino (Full Professional Proficiency)',
  md5('skills-v1'),
  true
);

-- Certifications
INSERT INTO public.knowledge_docs (owner_id, source_type, source_id, title, content, content_hash, needs_embedding)
VALUES (
  (SELECT user_id FROM app_admins LIMIT 1),
  'personal_info',
  gen_random_uuid(),
  'Certifications — Gilvin Zalsos',
  'Certifications:
- React - The Complete Guide 2025 | Udemy | 2025
- Master Laravel 9, Vue 3 and Inertia Fullstack | Udemy | 2023
- PHP with Laravel for Beginners | Udemy | 2023
- Technology Adoption Specialist | FABLAB Mindanao | 2018
- Competent Communicator | Toastmasters International | 2018
- Intern Project Manager | FABLAB Mindanao | 2017

Community Involvement:
- Toastmasters International - Iligan Club | 2017 - 2020
  - Vice President (2019-2020)
  - Vice President Education (2018-2019)
  - Sergeant-at-Arms (2017-2019)',
  md5('certifications-v1'),
  true
);
```

```sql
-- HISTORICAL additional work experience seed: FABLAB Mindanao (from resume, was missing)
-- Run this alongside the work_experience seed SQL
INSERT INTO public.work_experience
  (owner_id, company, role, industry, duration, description, highlights, tech_list, is_current, display_order)
VALUES (
  (SELECT user_id FROM app_admins LIMIT 1),
  'FABLAB Mindanao',
  'Intern Project Manager',
  'Digital fabrication / education',
  '2017',
  'Intern project manager at FABLAB Mindanao, planning and conducting digital fabrication workshops for Computer Sales and Services stores in Iligan City.',
  ARRAY[
    'Planned and conducted digital fabrication workshops for Computer Sales and Services stores in Iligan City'
  ],
  ARRAY['Project management', 'Workshop facilitation'],
  false,
  5
);
```

## Chat history — current application contract

These tables are used by the route but their CREATE TABLE/RLS definitions are not checked in. This is a field-usage reference, not replacement migration SQL:

| Table | Fields read/written by the application | Scope |
|---|---|---|
| `agent_chat_history` | `user_id`, `role`, `content`, `sources`, `created_at` | Four messages for model context; latest 20 for authenticated display history |
| `anon_chat_history` | `hashed_ip`, `role`, `content`, `sources`, `created_at` | Four messages for model context shared by hashed IP; no anonymous display-history endpoint |

The route inserts `user`/`assistant` roles and stores source metadata even when POST citations are hidden. Verify deployed types, indexes, defaults and RLS before schema work. See [agent_pipeline.md](agent_pipeline.md).
