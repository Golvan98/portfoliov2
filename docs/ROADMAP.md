# Post-launch Refinement Roadmap

Current direction as of October 7, 2026. This is the ordered future-work reference, not an implementation checklist. [PROGRESS.md](PROGRESS.md) records shipped work and history; [BACKLOG.md](BACKLOG.md) holds concrete open issues; [DECISIONS.md](DECISIONS.md) records architectural/product decisions.

Status vocabulary: **DONE** = implemented; **ACTIVE/NEXT** = current sprint direction, not completed; **PLANNED** = later work; **HISTORICAL** = prior state retained for context; **DEFERRED** = outside the current sequence or deliberately postponed.

## Active correctness problem

In the user-reported production test, `/now` showed ClipNET activity from approximately two hours earlier. Asking **“What is his most recent task rn?”** returned **“update project descriptions”**, project **“myHeadSpace & Portfolio v2”**, last updated **2026-03-06**.

The revived agent is operational, but it does not reliably identify the most recent/current project or task. **This is unresolved.** The cause has not been established. A fresh activity feed does not prove fresh AI-accessible knowledge, and semantic similarity does not establish chronology. The route currently neither queries live task/project/activity tables for these questions nor applies a dedicated temporal intent path. Investigate lanes 2 and 3 before redesigning retrieval or tuning answers.

## Ordered lanes

| Order | Lane | Status | Direction and completion evidence |
|---|---|---|---|
| 1 | AI Provider & Runtime Reliability | **DONE — SUBSTANTIALLY COMPLETE** | GPT-OSS migration implemented; user confirms the live agent operates. Groq via `groq-sdk`: normal `openai/gpt-oss-120b`, fast `openai/gpt-oss-20b`, optional model overrides and existing fast toggle. HTTP 429 key fallback preserved; `ai_unavailable` distinct from visitor `quota_exceeded`. Gemini embeddings and RAG unchanged. Permanent regression coverage belongs to lane 6; no further provider migration is planned. |
| 2 | Knowledge Freshness & Sync | **ACTIVE/NEXT — NEXT ACTIVE SPRINT** | Trace source edits through `syncKnowledgeDoc`, `knowledge_docs`, batch embeddings, chunks, and retrieval. Check project/task edits, renames, deletes, dependent docs, source IDs, timestamps, stale/orphaned chunks, and whether new activity reaches AI-accessible knowledge. Reproduce the live discrepancy and identify the failing boundary. |
| 3 | Temporal / Current-State Awareness | **ACTIVE/NEXT — NEXT AFTER / CLOSELY COUPLED WITH LANE 2** | Investigate “current”, “latest”, “recent”, “today”, “working on”, and related intent. Decide whether structured live task/project/activity reads should supply evidence instead of relying solely on vector RAG. Define recency, status, timezone, and insufficient-evidence behavior. This routing is not implemented. |
| 4 | RAG / Retrieval Refinement | **PLANNED — after freshness is verified** | Evaluate semantic ranking, filtering, deduplication, supplemental document selection and context budgets against verified fresh knowledge. Do not use retrieval tuning to mask sync failures. |
| 5 | AI Answer Quality | **PLANNED — after reliable evidence** | Address elaborate current-status answers to “hey”, unsolicited hobbies/personal details, awkward phrasing, and over-assumptions. Review conflicting prompt instructions and evidence-grounded uncertainty. |
| 6 | AI Evaluation & Regression Testing | **PLANNED** | Add permanent regressions for model migration, freshness, temporal questions, hallucination, rename/edit/delete, insufficient evidence, and provider failures. Earlier mocked checks recorded in PROGRESS are not a checked-in regression suite. |
| 7 | AI Observability & Diagnostics | **PLANNED** | Make query rewriting, intent, retrieved documents/chunks, similarity, source timestamps, selected model, latency, and fallback/error reasons inspectable with appropriate privacy controls. Current logs and testing citations are partial visibility only. |
| 8 | Knowledge Content Quality | **PLANNED — after retrieval correctness is understood** | Enrich curated sources and reconcile historical seeds with verified project/work content; distinguish content gaps from stale or inaccessible evidence. |
| 9 | Frontend UI / UX Refinement | **PLANNED** | Refine frontend, floating chat, and recruiter experience; verify glass-wall visibility and responsive workspace behavior. |
| 10 | Security & Abuse Hardening | **PLANNED** | Review quota/RPC access, RLS, anonymous history sharing, source visibility, input limits, privacy, and credential hygiene. |
| 11 | General Technical Debt / Cleanup | **DEFERRED — after higher-value correctness work** | Address skipped build type checks, lint setup, previously reported middleware warnings, and routine cleanup after correctness priorities. |

## Historical and deferred scope

**HISTORICAL:** The MVP build phases, former Gemini chat and Llama models, and previous prompt policies remain in [PROGRESS.md](PROGRESS.md), [DECISIONS.md](DECISIONS.md), and marked historical sections. They are not pending implementation.

**DEFERRED:** Embedding activity rows, richer `/now` filtering, curated-source admin UI, drag-and-drop, and multi-user workspaces remain separate scope choices in [BACKLOG.md](BACKLOG.md). Lane 3 may evaluate reading structured activity without embedding it. The dedicated `/chat` page remains omitted by product decision.
