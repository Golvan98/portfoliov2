# Repository Guide for Coding and Reasoning Agents

The filename is retained for compatibility; this guide applies to any agent. Portfolio v2 / MyHeadSpace is already shipped: Next.js + Supabase, Groq-hosted GPT-OSS chat and Gemini embeddings.

## Read order and document roles

1. [PROGRESS.md](PROGRESS.md) — implemented state, factual history and known limitations.
2. [ROADMAP.md](ROADMAP.md) — ordered post-launch lanes and current sprint direction.
3. [AGENT_SPEC.md](AGENT_SPEC.md) — current agent contract, error semantics and behavior limits.
4. [agent_pipeline.md](agent_pipeline.md) — implemented request/history/retrieval/ingestion paths.
5. [ENV.md](ENV.md) — variables actually consumed by code and their defaults.
6. [DATA_MODEL.md](DATA_MODEL.md) — schema reference, application field usage and historical seeds.
7. [DECISIONS.md](DECISIONS.md) — durable decisions and rationale, with superseded choices labeled.

Then consult [BACKLOG.md](BACKLOG.md) for concrete open tasks, [RAG_LITE.md](RAG_LITE.md) for ingestion, [USAGE_LIMITS.md](USAGE_LIMITS.md), [RLS_AUTH.md](RLS_AUTH.md), [ACTIVITY_SPEC.md](ACTIVITY_SPEC.md) and [GLOSSARY.md](GLOSSARY.md). SCOPE and UI_INPUTS preserve original MVP briefs.

## Authority and current focus

- Follow the current user task and its scope. Verify repository code when docs conflict; do not treat “locked” wording or SQL examples as evidence of deployed behavior.
- **Do not assume `legacy/` docs are current.** Historical prompts, seed data, models and session observations must remain labeled history; do not silently turn them into present-day instructions.
- GPT-OSS revival is implemented and the user has confirmed the live agent operates. Chat uses Groq `openai/gpt-oss-120b` normally / `openai/gpt-oss-20b` in fast mode; embeddings use Gemini `gemini-embedding-001`, 768 dimensions. RAG was intentionally unchanged.
- **The next focus is Knowledge Freshness & Sync. Do not redesign RAG before locating the source of stale/current-state behavior.** The production latest-task discrepancy is unresolved. Temporal intent and possible live structured reads follow closely; these are planned behavior, not shipped features.
- Verify source mutation → knowledge doc → embedding/chunk → retrieved evidence, including rename/delete propagation, IDs, timestamps, ownership and external job invocation. Fresh `/now` activity is not proof of fresh AI evidence.
- PROGRESS records what happened; ROADMAP sets order; BACKLOG contains open actions; DECISIONS explains choices. Update the relevant document without duplicating the entire roadmap.

## Product and implementation boundaries

- `/myheadspace` is the workspace route, with admin-only mutations and a public-viewing product intent. The page does not redirect visitors; actual visibility depends on RLS, whose previously reported mismatch still requires verification.
- Workspace admin lookup uses `app_admins`; the agent quota bypass separately checks the admin email. Visitor quotas are DB-backed and distinct from provider rate limits.
- Knowledge tables have no intended public SELECT access. Server routes use service role; browser sync uses the admin session. Never expose the service-role key.
- The agent UI is the floating widget on `/` and `/now`; no `/chat` route exists. Inline citations are suppressed; POST metadata and history visibility differ (see pipeline).
- Landing project cards and About copy are hardcoded. Read `components/projects-section.tsx` and `app/page.tsx` for current content/links instead of old placeholders.

## Key URLs

- **Live site:** https://portfoliov2-three-liard.vercel.app
- **GitHub:** https://github.com/Golvan98/portfoliov2
- **Supabase project ID:** liqlzqrylfhuuxqbyjho
- **Admin email:** gilvinsz@gmail.com
- **GitHub profile:** https://github.com/Golvan98
- **LinkedIn:** https://www.linkedin.com/in/gilvin-zalsos-213692141/
- **Resume PDF:** https://drive.google.com/file/d/1d_RmS4N7g7aRTEP-VICP0yKygA8KKmfn/view?usp=sharing
