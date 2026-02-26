# Usage Limits (Hybrid, DB-Backed)

## Limits

| User type   | Limit      |
|-------------|------------|
| Logged-in   | 20 prompts/day |
| Anonymous   | 5 prompts/day  |

---

## Required RPC: consume_agent_quota

This function MUST be called server-side before any Gemini call.

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
const ipHash = hashIP(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress)

const { data } = await supabaseServiceRole.rpc('consume_agent_quota', {
  p_user_id: session?.user?.id ?? null,
  p_ip_hash: ipHash,
  p_cost: 1,
})

if (!data[0].allowed) {
  return res.status(429).json({
    error: 'quota_exceeded',
    remaining: 0,
    message: 'You have reached your daily limit. Sign in with Google for a higher quota.',
  })
}
```

---

## Notes

- Anonymous users behind the same office NAT share a quota — this is a known trade-off. The per-user path is fairest; encourage login.
- IP is always hashed before storage — never store raw IPs.
- The RPC is `SECURITY DEFINER` so it bypasses RLS and can write to quota tables regardless of caller role.
- Daily limits reset at UTC midnight (based on `current_date`).
