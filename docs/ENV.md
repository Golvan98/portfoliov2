# Environment Variables

## Supabase (public client — safe to expose)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Supabase (server only — never expose to client)
```
SUPABASE_SERVICE_ROLE_KEY=
```

## Gemini (server only — used for embeddings only)
```
GEMINI_API_KEY=
```

## Groq (server only — used for agent chat completion)
```
GROQ_API_KEY=
```

## Chunking (used by embedding pipeline)
```
CHUNK_MIN_CHARS_BEFORE_SPLIT=2000
CHUNK_TARGET_CHARS=1200
CHUNK_OVERLAP_CHARS=150
```

## Agent (used by /api/agent)
```
AGENT_MAX_OUTPUT_TOKENS=400
AGENT_TOP_K=8
AGENT_USER_DAILY_LIMIT=20
AGENT_ANON_DAILY_LIMIT=5
```

## Testing (used by /api/agent)
```
TESTING_MODE=on
```
When `on`, source citations are returned in the agent response and displayed in the chat widget. When `off` or unset, the sources array is returned empty — citations are hidden from visitors. Set to `on` for local dev; leave `off` or unset in production (Vercel).

## Notes
- `SUPABASE_SERVICE_ROLE_KEY` is used only in server-side routes (`/api/agent`, embedding job). Never import in client components.
- `GEMINI_API_KEY` is server-only, used for embeddings. Never import in client components.
- `GROQ_API_KEY` is server-only, used for agent chat completion. Never import in client components.
- All `NEXT_PUBLIC_*` vars are safe for client-side Supabase initialization.
