# Environment Variables

Examples below document code defaults and variable names, not verified local or deployed values.

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
Both `/api/agent` and `/api/embed` call Gemini REST `gemini-embedding-001` with `outputDimensionality: 768`. There is no embedding-model environment override in the code.

## Embedding endpoint authentication (server only)
```
EMBED_SECRET=
```
`POST /api/embed` requires an `x-embed-secret` header matching this value; missing configuration or mismatch returns 401. No scheduler or automatic invocation is checked in.

## Groq (server only — used for query rewriting and agent chat completion)
```
GROQ_API_KEY=
GROQ_API_KEY_2=
GROQ_API_KEY_3=
GROQ_MODEL=openai/gpt-oss-120b
GROQ_FAST_MODEL=openai/gpt-oss-20b
GROQ_FAST_MODE=false
```

Groq remains the hosting/API provider, accessed through `groq-sdk`. GPT-OSS runs through Groq, not locally; no OpenAI SDK or local inference is used.

`GROQ_MODEL` and `GROQ_FAST_MODEL` are optional overrides. With `GROQ_FAST_MODE=true`, both query rewriting and answer generation use `GROQ_FAST_MODEL` (code default: `openai/gpt-oss-20b`). Otherwise, both use `GROQ_MODEL` (code default: `openai/gpt-oss-120b`). Production does not require either override. Fast mode retains the existing cap of 8 context chunks.

At least one Groq API key must be configured. `callGroqWithFallback()` tries configured keys in order: `GROQ_API_KEY` → `GROQ_API_KEY_2` → `GROQ_API_KEY_3`. On HTTP 429 it tries the next key; other errors stop the call. Keys may share organization-level quotas, so three keys do not guarantee additional quota.

## Chunking (used by embedding pipeline)
```
CHUNK_MIN_CHARS_BEFORE_SPLIT=2000
CHUNK_TARGET_CHARS=1200
CHUNK_OVERLAP_CHARS=150
```

## Agent (used by /api/agent)
```
AGENT_MAX_OUTPUT_TOKENS=400
AGENT_TOP_K=16
```

`AGENT_TOP_K` controls vector match count; supplemental documents can increase normal-mode context beyond it. Fast mode caps merged context at eight entries.

Historical names `AGENT_USER_DAILY_LIMIT` and `AGENT_ANON_DAILY_LIMIT` are **not read by the application** and do not configure quotas. Limits are governed by the deployed `consume_agent_quota` RPC/tables; the documented SQL defaults are 20 logged-in / 5 anonymous questions per day. See [USAGE_LIMITS.md](USAGE_LIMITS.md).

## Testing (used by /api/agent)
```
TESTING_MODE=on
```
Only the exact value `on` includes source metadata in new POST responses; otherwise POST returns an empty sources array. The widget filters Task titles and shows at most four distinct documents. Sources are still persisted, and `/api/agent/history` returns stored sources without this gate: it is not a global citation/privacy switch. This example is not a claim that testing is enabled in production.

## Notes
- `SUPABASE_SERVICE_ROLE_KEY` is used only server-side (agent, history, embedding routes and admin lookup). Never import in client components.
- `GEMINI_API_KEY` is server-only, used for embeddings. Never import in client components.
- All `GROQ_*` variables are server-only. Never import Groq keys in client components.
- All `NEXT_PUBLIC_*` vars are safe for client-side Supabase initialization.
