# Backlog — Open Post-launch Work

Only unresolved tasks belong here. Priority and dependencies follow [ROADMAP.md](ROADMAP.md); shipped work belongs in [PROGRESS.md](PROGRESS.md). Checkboxes below are all open, not claims of implemented behavior.

## ACTIVE/NEXT — Freshness and current-state correctness (lanes 2–3)

- [ ] Reproduce the production discrepancy recorded in ROADMAP: recent ClipNET activity on `/now`, but “What is his most recent task rn?” answered with “update project descriptions” in “myHeadSpace & Portfolio v2”, dated 2026-03-06. Capture source rows, knowledge docs/chunks and returned evidence to locate the failure.
- [ ] Trace create/edit/status/rename/delete paths in `workspace.tsx` through `syncKnowledgeDoc` and `deleteKnowledgeDoc`. Inspect returned Supabase errors (currently unchecked in these helpers), source ID matching, duplicate/orphaned docs and chunks, and partial failures.
- [ ] Verify dependent content after renames: project renames currently refresh only the project doc; task renames do not refresh note docs; category edits do not refresh project content. Check deletion cleanup and whether failed ID collection leaves stale descendants.
- [ ] Verify the actual invocation/schedule of `/api/embed` outside the repo. No scheduler or automatic caller is checked in. Inspect `needs_embedding`, failed writes and partial replacement: the route deletes old chunks before embedding, ignores returned write errors, and has no transaction or concurrent-edit guard.
- [ ] Distinguish source `updated_at`, content `Updated:`, knowledge sync time, embedding time and activity time. The embedding route overwrites `knowledge_docs.updated_at`; it is not necessarily the source-change time.
- [ ] Verify knowledge coverage for anonymous, non-admin and admin queries. Supplemental project/work-experience reads filter `owner_id` by the visitor's user ID (or empty string), not a resolved portfolio owner. Their query errors are not checked; confirm the effect rather than assuming these docs are always included.
- [ ] Establish how manual `portfolio_projects` / `work_experience` edits reach `knowledge_docs`. No source-table sync hook is checked in; direct personal-info edits also require embedding invalidation.
- [ ] Define temporal intent and evaluate structured live project/task/activity queries, including “today” timezone, deleted entities, and insufficient evidence. Do not equate vector similarity or prompt wording with latest-state correctness.

## PLANNED — Evidence, answers and diagnostics (lanes 4–8)

- [ ] Once freshness is verified, evaluate ranking, threshold/top-K, supplemental context, deduplication and fast-mode truncation; add a context budget if justified.
- [ ] Recheck “hey”, unsolicited hobbies/personal facts, awkward answers and assumptions using correct evidence. Resolve conflicting introduction/citation instructions in the prompt.
- [ ] Create checked-in regressions for normal/fast models and overrides, HTTP 429 key fallback, quota versus provider failure, freshness, temporal questions, hallucination, rename/edit/delete and insufficient evidence. No test script/suite is currently checked in.
- [ ] Add privacy-conscious diagnostics for rewrite/intent, document/chunk IDs, similarity, timestamps, model, latency and fallback reason. Response sources currently come from vector results, not the exact context sent to the model.
- [ ] Reconcile and enrich curated content after retrieval correctness is understood. Verify completion of the historical bio, education, capstone and chat-table setup actions before repeating them.

## PLANNED — UI, security and privacy (lanes 9–10)

- [ ] Reverify glass-wall visibility against deployed RLS. The page does not redirect visitors; the documented admin-only SELECT policies conflict with public browsing. Review appropriate public data before changing policies.
- [ ] Review quota display before first reply and after sign-in/exhaustion, plus responsive workspace behavior (mobile sidebar exists; task details are hidden on small screens).
- [ ] Review RLS/RPC grants and chat-history policies against the deployed DB; repository SQL templates do not fully describe it. Review anonymous users sharing history by IP and messages retained in client state on logout.
- [ ] Review historical credential exposure in documentation, previously reported unused local OAuth values, input/rate limits and embedding error details. Verify credential status and rotate only as separately authorized; no configuration changes were made in this reconciliation.
- [ ] Review citation privacy: `TESTING_MODE` gates new POST responses, while history stores sources and GET history returns them without that gate.
- [ ] Verify activity integrity: category creation supplies an empty entity ID despite the documented UUID column, project description edits have no activity call, and logging does not inspect returned insert errors.

## DEFERRED — Cleanup and optional product features (lane 11 / later scope)

- [ ] Address `ignoreBuildErrors: true`, add working lint configuration/tooling, and verify the previously reported middleware deprecation warning.
- [ ] Evaluate `/now` tag/search filtering, curated portfolio admin UI, kanban drag-and-drop and further mobile layout refinement when prioritized.
- [ ] Revisit embedding `public_activity` only if justified by the freshness/temporal investigation; activity embedding is currently excluded.
- [ ] Multi-user workspaces remain deferred.

**Product decision, not an open task:** A dedicated `/chat` page remains omitted; the floating widget is the agent UI.
