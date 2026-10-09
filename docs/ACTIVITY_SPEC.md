# Activity Spec (Public Snippet + /now Page)

## Current logging coverage

`workspace.tsx` calls `logActivity()` after successful category create/rename/delete, project create/rename/delete, and task create/rename/status-change/delete. Task notes are not logged. **Project description edits currently have no activity call.** The original requirement to log every project/task mutation is therefore not fully met.

Category logging was added in March 2026; category creation passes an empty `entity_id` even though the documented schema uses UUID. The helper does not inspect returned insert errors, so a call is not proof of a stored activity row. See [BACKLOG.md](BACKLOG.md) for verification tasks.

## Logging Method (LOCKED: App-Code)

Current calls attempt to insert a message snapshot into `public_activity` using the browser session:

```ts
await supabase.from('public_activity').insert({
  owner_id: session.user.id,
  action: 'create' | 'update' | 'delete',
  entity_type: 'project' | 'task' | 'category',
  entity_id: <row.id>,
  entity_title: <message>,  // preformatted action/context snapshot, not just a title
})
```

Both activity components render `Gilvin` followed by the stored `entity_title`, for example:
- `created project "{title}" under {category}`
- `created task "{title}" in project {project}`
- `marked "{title}" as Done in project {project}`

The older “Gilvin just …” bare-title format was superseded by commit `a8cc915`; see the March 6 history in [PROGRESS.md](PROGRESS.md).

---

## Landing Widget (/)

- Shows last **3** `public_activity` rows, ordered by `created_at DESC`
- Shows "Last active: X time ago" (relative timestamp from most recent row)
- No links inside activity items
- Realtime: subscribe to `public_activity` INSERT events to update widget live without page refresh

---

## /now Page

- Route: `/now`
- Shows longer activity history from `public_activity`
- Ordered by `created_at DESC`
- Loads 20 rows initially; “Load more” fetches 20 older rows using the last `created_at` as cursor
- No day grouping or realtime subscription on `/now` is implemented; displayed relative timestamps refresh every 30 seconds
- This is the destination when the user clicks "see more" from the landing widget

## Activity freshness is not agent freshness

The feed reads `public_activity` directly; the agent does not. A recent feed entry does not establish that knowledge docs/chunks were updated or retrieved. The reported ClipNET/latest-task discrepancy remains unresolved; [ROADMAP.md](ROADMAP.md) lanes 2–3 prioritize sync and temporal evidence investigation.
