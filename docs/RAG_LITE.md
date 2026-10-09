# RAG-lite (pgvector + Conditional Chunking)

## Goal

The Recruiter Agent answers questions grounded in Gilvin's actual content:
- MyHeadSpace projects, tasks, task_notes
- Curated portfolio project entries
- Work experience entries
- Personal info entries (bio, education, skills, certifications)

`public_activity` is not embedded or directly queried by the current agent. The original MVP decision excluded activity embedding for noise/redundancy. Whether temporal questions need structured live data is now an open investigation in [ROADMAP.md](ROADMAP.md), after knowledge freshness is verified.

---

## Conditional Chunking (LOCKED)

```
if len(content) <= CHUNK_MIN_CHARS_BEFORE_SPLIT:
    create 1 chunk (no split)
else:
    split into chunks of CHUNK_TARGET_CHARS with CHUNK_OVERLAP_CHARS overlap
```

Defaults (set via env vars):
- `CHUNK_MIN_CHARS_BEFORE_SPLIT` = 2000
- `CHUNK_TARGET_CHARS` = 1200
- `CHUNK_OVERLAP_CHARS` = 150

---

## Content Blob Formats (knowledge_docs.content)

Project/task/note formats below come from `lib/rag/sync-knowledge-doc.ts`. Curated portfolio/work-experience formats are original content conventions, not implemented source-table sync builders. Current chat uses Groq-hosted GPT-OSS; both query and document embeddings remain Gemini `gemini-embedding-001`, 768 dimensions.

### Project doc
```
Title: "Project: {title}"

Content:
Project: {title}
Category: {category_name}
Description: {description}
Tasks: {total} total ({todo} to-do, {in_progress} in progress, {done} done)
Updated: {updated_at}
```

The `Tasks:` line is included when a task summary is supplied (as in current workspace project sync paths).

### Task doc
```
Title: "Task: {task_title}"

Content:
Task: {title}
Project: {project_title}
Status: {status}  -- 'todo' | 'in_progress' | 'done'
Updated: {updated_at}
```

### Note doc
```
Title: "Note (Task: {task_title})"

Content:
Note for Task: {task_title}
Project: {project_title}
Body: {body}
Updated: {updated_at}
```

### Portfolio project doc (curated)
```
Title: "Portfolio: {name}"

Content:
Portfolio Project: {name}
Role: {role}
Summary: {summary}
Tech: {tech_list}
Bullets: {bullets}
Links: {links}
Updated: {updated_at}
```

### Work experience doc
```
Title: "Work Experience: {company} — {role}"

Content:
Company: {company}
Role: {role}
Industry: {industry}
Duration: {duration}
Current role: {is_current ? 'Yes' : 'No'}
Description: {description}
Highlights:
{highlights joined with newlines, each prefixed with '- '}
Tech/Tools: {tech_list joined with ', '}
Updated: {updated_at}
```

### Personal info doc
```
Title: "About Gilvin Zalsos" / "Education — Gilvin Zalsos" / "Skills — Gilvin Zalsos" / etc.

Content:
(Full text blob as seeded — see DATA_MODEL.md personal_info seed SQL)
```
Note: personal_info docs are seeded directly into knowledge_docs (no source table).
They have no CRUD hooks — update manually in Supabase when info changes, maintain content/hash and mark `needs_embedding=true`, then invoke the embedding endpoint.

---

## Embedding Pipeline (Async / Batch)

### Write-time: implemented browser-side sync

`syncKnowledgeDoc()` uses the admin's browser Supabase session. It looks up `(source_type, source_id)` and compares a SHA-256 content hash, then updates or inserts a doc marked `needs_embedding=true`. This is not an atomic database upsert. Returned Supabase errors are not checked; source mutation success does not establish sync success.

| Mutation | Current knowledge update |
|---|---|
| Project create / rename / description edit | Sync that project doc, including task counts |
| Task create / status change / delete | Sync/delete that task and refresh the parent project summary |
| Task rename | Sync only the task; existing note titles/content are not refreshed |
| Note save | Sync the note |
| Project/task delete | Collect descendant IDs, delete source, then explicitly delete related knowledge docs |
| Category create / rename / delete | No knowledge sync; embedded project category labels can remain stale |
| Manual curated source-table edit | No checked-in hook copying the change into knowledge docs |

Project renames do not refresh existing task/note content with the new project name. Sync helpers are best-effort and non-blocking from the user's perspective. These gaps require investigation; they are not a confirmed diagnosis of the live latest-task failure.

### Batch endpoint: invocation is separate

`POST /api/embed`, authenticated by `x-embed-secret` / `EMBED_SECRET`, reads flagged knowledge docs using service role. No scheduler or automatic caller is checked in; any external scheduling must be verified.

For each doc, it chunks content, deletes existing chunks, calls Gemini for each replacement, inserts text/hash/vector, then clears `needs_embedding` and sets `knowledge_docs.updated_at` to the processing time. It does not inspect returned write errors or wrap replacement in a transaction. Partial failure/concurrent changes can leave inconsistent state. The endpoint does not read `portfolio_projects`, `work_experience`, or `public_activity` to discover source changes.

### Delete-time and timestamps

Deleting a knowledge doc relies on the documented `knowledge_chunks.doc_id ON DELETE CASCADE` to remove chunks. `knowledge_docs.source_id` is a generic identifier, not a cascading foreign key to every source table; source deletion alone is insufficient.

`knowledge_docs.updated_at` is changed by sync and embedding. Content `Updated:` lines reflect builder inputs, which sometimes use the current browser time (including parent-project summary refresh), not a freshly read source timestamp. Neither field by itself proves latest task activity. Verify the deployed schema and timestamps during lane 2.

## Retrieval (at query time)

The route embeds the rewritten query (or raw question fallback) and calls `match_knowledge_chunks` with threshold **0.5** and `AGENT_TOP_K` default **16**, using service role. The intended database search is pgvector cosine similarity over chunks joined to doc metadata. RPC SQL is not checked in, so deployed ordering/filtering must be inspected rather than inferred from old example SQL.

Professional queries also attempt full project/work-experience document reads filtered to the visitor's `owner_id`. These are not guaranteed portfolio-wide reads. Supplements precede vector results; vector chunks overlapping supplemental doc IDs are excluded. Fast mode caps merged context at eight entries; normal mode has no additional cap. See [agent_pipeline.md](agent_pipeline.md).

There is no explicit recency tie-breaker, temporal intent route or live activity lookup in application code. The former “prefer fresher updated_at” line was a design aspiration, not verified behavior. Current-state correctness remains unresolved; verify freshness before semantic retrieval refinement per [ROADMAP.md](ROADMAP.md).

## HISTORICAL — Original retrieval SQL sketch

Preserved as the MVP design sketch, not the deployed RPC definition. The current route calls the RPC with a threshold and supplements as described above.

```sql
SELECT
  kc.chunk_text,
  kc.chunk_index,
  kc.doc_id,
  kd.title,
  kd.source_type,
  kd.updated_at
FROM knowledge_chunks kc
JOIN knowledge_docs kd ON kd.id = kc.doc_id
ORDER BY kc.embedding <=> $q_embedding  -- cosine distance
LIMIT $AGENT_TOP_K;
```
