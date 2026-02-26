# RAG-lite (pgvector + Conditional Chunking)

## Goal

The Recruiter Agent answers questions grounded in Gilvin's actual content:
- MyHeadSpace projects, tasks, task_notes
- Curated portfolio project entries
- Work experience entries
- Personal info entries (bio, education, skills, certifications)

Do NOT embed `public_activity` rows for MVP — too noisy, adds no retrieval value.

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

These are the exact string formats to store as `content` in `knowledge_docs`.

### Project doc
```
Title: "Project: {title}"

Content:
Project: {title}
Category: {category_name}
Description: {description}
Updated: {updated_at}
```

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
They have no CRUD hooks — update manually in Supabase when info changes.

---

## Embedding Pipeline (Async / Batch)

### Write-time (on CRUD of source content)
1. Upsert `knowledge_docs` row with new `content` and `content_hash`
2. If `content_hash` changed → set `needs_embedding = true`
3. Do NOT embed synchronously (background job handles it)

### Batch job (runs on schedule or trigger)
1. Find all `knowledge_docs` where `needs_embedding = true`
2. For each doc:
   a. Apply conditional chunking to `content`
   b. Delete existing `knowledge_chunks` for this `doc_id`
   c. Insert new chunks with `chunk_text` + `chunk_hash`
   d. Embed each `chunk_text` → store as `embedding` vector
3. Set `needs_embedding = false` on the doc

### Delete-time
1. Delete `knowledge_docs` row
2. `knowledge_chunks` cascade-delete automatically (via `on delete cascade`)

---

## Retrieval (at query time)

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

- Use service role client (server-side only)
- Tie-breaker: prefer fresher `updated_at` when similarity scores are close
