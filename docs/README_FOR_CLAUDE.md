# Claude Code Entry — Read Order & Authority

This repo builds **Gilvin Portfolio v2** (Next.js + Supabase + OpenAI + RAG-lite).

## Authority Rules (must obey)
- **DECISIONS.md is the single source of truth.**
- If any other file conflicts with DECISIONS.md, **DECISIONS.md wins.**
- Do NOT wait for UI approval. Build the baseline UI immediately, then iterate when screenshots or Figma arrive.

## Read Order (read in this exact sequence)
1. `DECISIONS.md` — locked decisions (authoritative)
2. `SCOPE.md` — phased delivery & what's in/out
3. `DATA_MODEL.md` — tables, columns, indexes
4. `RLS_AUTH.md` — exact RLS policies (copy/paste SQL)
5. `ACTIVITY_SPEC.md` — activity logging rules + /now page
6. `RAG_LITE.md` — embeddings, chunking, pipeline
7. `AGENT_SPEC.md` — agent behavior + system prompt template
8. `USAGE_LIMITS.md` — quota enforcement + RPC contract
9. `UI_INPUTS.md` — UI is iterative; build baseline first
10. `GLOSSARY.md` — terminology reference

## Non-Negotiables (summary — full rules in DECISIONS.md)
- Only **gilvinsz@gmail.com** can CREATE/UPDATE/DELETE MyHeadSpace content.
- MyHeadSpace is accessible at `/myheadspace` — NOT `/admin`. It is branded as a distinct workspace product.
- `/myheadspace` is publicly viewable — do NOT redirect unauthorized users.
- Unauthorized mutation attempts (create/update/delete) show a toast: "This workspace is Gilvin's private area — only he can make changes."
- RLS handles actual write protection at the DB level.
- Activity must log on every CREATE/UPDATE/DELETE for projects and tasks.
- `/now` route must exist and show longer activity history.
- Embeddings tables are NOT publicly selectable under any circumstance.
- Agent answers using retrieval only — inline "From …" citations required.
- Hybrid quotas: logged-in users get per-user limits, anonymous get per-IP limits — both DB-backed.
