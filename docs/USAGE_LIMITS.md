# Usage Limits (Hybrid, DB-Backed)

## Limits

| User type   | Limit      |
|-------------|------------|
| Logged-in   | 20 prompts/day |
| Anonymous   | 5 prompts/day  |

---

## Required RPC: consume_agent_quota

For each non-admin `POST /api/agent` request, the route calls this RPC server-side **once, before Groq query rewriting/answer generation and Gemini query embedding**. It counts visitor questions, not provider tokens or individual model calls. The admin email `gilvinsz@gmail.com` bypasses it. The separate `/api/embed` ingestion endpoint uses `EMBED_SECRET` authentication and does not call this visitor-quota RPC.

Consumption happens before provider configuration checks/calls; failed downstream requests are not refunded. HTTP 429 with `quota_exceeded` means visitor quota exhaustion. Missing Groq configuration and main-call `Groq.APIError` failures return HTTP 503 / `ai_unavailable`; other runtime failures, including quota RPC errors, return HTTP 500 / `ai_unavailable`. Rewrite failure is best-effort and falls back. Provider limits are distinct from visitor quota; three Groq keys do not guarantee triple provider quota.

The SQL below is the documented RPC template, not a verified export of the deployed database. Its defaults are 20/5; `AGENT_USER_DAILY_LIMIT` and `AGENT_ANON_DAILY_LIMIT` are not read by runtime code. See [ENV.md](ENV.md) and [agent_pipeline.md](agent_pipeline.md).

### Signature

```sql
CREATE OR REPLACE FUNCTION consume_agent_quota(
  p_user_id  uuid,       -- pass NULL if anonymous
  p_ip_hash  text,       -- always pass (used for anon enforcement)
  p_cost     int DEFAULT 1
)
RETURNS TABLE (
  allowed    boolean,
  remaining  int,
  used       int,
  "limit"    int
)
LANGUAGE plpgsql
SECURITY DEFINER  -- bypasses RLS; runs as owner
AS $$
DECLARE
  v_used  int;
  v_limit int;
BEGIN
  IF p_user_id IS NOT NULL THEN
    -- Per-user enforcement
    INSERT INTO public.agent_usage_user_daily (user_id, day, used, "limit")
    VALUES (p_user_id, current_date, p_cost, 20)
    ON CONFLICT (user_id, day)
    DO UPDATE SET used = agent_usage_user_daily.used + p_cost
    WHERE agent_usage_user_daily.used < agent_usage_user_daily.limit
    RETURNING agent_usage_user_daily.used, agent_usage_user_daily.limit
    INTO v_used, v_limit;

    IF v_used IS NULL THEN
      -- Conflict update was skipped (quota exceeded)
      SELECT used, "limit" INTO v_used, v_limit
      FROM public.agent_usage_user_daily
      WHERE user_id = p_user_id AND day = current_date;

      RETURN QUERY SELECT false, (v_limit - v_used), v_used, v_limit;
    ELSE
      RETURN QUERY SELECT true, (v_limit - v_used), v_used, v_limit;
    END IF;

  ELSE
    -- Per-IP enforcement
    INSERT INTO public.agent_usage_ip_daily (ip_hash, day, used, "limit")
    VALUES (p_ip_hash, current_date, p_cost, 5)
    ON CONFLICT (ip_hash, day)
    DO UPDATE SET used = agent_usage_ip_daily.used + p_cost
    WHERE agent_usage_ip_daily.used < agent_usage_ip_daily.limit
    RETURNING agent_usage_ip_daily.used, agent_usage_ip_daily.limit
    INTO v_used, v_limit;

    IF v_used IS NULL THEN
      SELECT used, "limit" INTO v_used, v_limit
      FROM public.agent_usage_ip_daily
      WHERE ip_hash = p_ip_hash AND day = current_date;

      RETURN QUERY SELECT false, (v_limit - v_used), v_used, v_limit;
    ELSE
      RETURN QUERY SELECT true, (v_limit - v_used), v_used, v_limit;
    END IF;
  END IF;
END;
$$;
```

### Usage (server-side in /api/agent)

```ts
// Inside the route's non-admin branch; serviceClient and ipHash are resolved earlier.
const { data: quotaData, error: quotaErr } = await serviceClient.rpc('consume_agent_quota', {
  p_user_id: user?.id ?? null,
  p_ip_hash: ipHash,
  p_cost: 1,
})
if (quotaErr || !quotaData?.[0]) return aiUnavailableResponse(500)
if (!quotaData[0].allowed) {
  return NextResponse.json({
    error: 'quota_exceeded',
    remaining: 0,
    message: 'You have reached your daily limit. Sign in with Google for a higher quota.',
  }, { status: 429 })
}
```

---

## Notes

- Anonymous users behind the same office NAT share a quota — this is a known trade-off. The per-user path is fairest; encourage login.
- The route SHA-256 hashes the first `x-forwarded-for` IP (or `unknown` if absent) before quota/history storage.
- The RPC is `SECURITY DEFINER` so it bypasses RLS and can write to quota tables regardless of caller role.
- Daily rows use database `current_date`: reset is midnight in the database session timezone, UTC only if configured that way. The route does not set it.
- `p_cost: 1` is the implemented caller contract; the template tests `used < limit`, not whether an arbitrary larger cost would cross the limit. RPC/grant review is planned in [ROADMAP.md](ROADMAP.md), lane 10.
- The widget marks quota exhausted on HTTP 429 / `quota_exceeded`, or after a successful last allowed answer with `remaining: 0`. Provider failures do not set that state.
