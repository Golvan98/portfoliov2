# Activity Spec (Public Snippet + /now Page)

## What to Log

Log on EVERY successful CREATE/UPDATE/DELETE of:
- `projects`
- `tasks`

Do NOT log `categories` or `task_notes` for MVP.

## Logging Method (LOCKED: App-Code)

After every successful DB mutation, insert into `public_activity`:

```ts
await supabase.from('public_activity').insert({
  owner_id: session.user.id,
  action: 'create' | 'update' | 'delete',
  entity_type: 'project' | 'task',
  entity_id: <row.id>,
  entity_title: <row.title>,  // snapshot — do NOT store reference, store the value
})
```

Message format rendered in UI:
- "Gilvin just created project: {entity_title}"
- "Gilvin just updated task: {entity_title}"
- "Gilvin just deleted task: {entity_title}"

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
- Supports **pagination or "load more"** (implement load more for MVP simplicity)
- Optional (nice-to-have): group items by day
- This is the destination when the user clicks "see more" from the landing widget
