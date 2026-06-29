# AI Operations Runbook

Operational procedures for managing Camp Scout AI safely in production.

## Enabling OpenAI

1. Set `AI_ENABLED=true` on the deployment platform (Fly secrets or `.env.local` for dev).
2. Set `OPENAI_ANSWER_PROVIDER=openai`.
3. Set `OPENAI_API_KEY` to a valid API key.
4. Optionally set `OPENAI_MODEL` (default: `gpt-4o-mini`).
5. Set `CAMP_SCOUT_API_TOKEN` for protected route access.
6. Deploy and verify with `GET /health` and a test `/api/ask` request.
7. Confirm the dashboard at `GET /api/ai/dashboard` shows `aiEnabled: true` and `requestsByProvider.openai`.

```bash
fly secrets set AI_ENABLED=true OPENAI_ANSWER_PROVIDER=openai OPENAI_API_KEY=sk-... CAMP_SCOUT_API_TOKEN=...
fly deploy
```

## Disabling OpenAI (Kill Switch)

Use the global kill switch to stop all OpenAI traffic immediately without rotating keys or redeploying code.

1. Set `AI_ENABLED=false` (this is the default).
2. All OpenAI calls are bypassed; the fake provider is used automatically.
3. No network requests are sent to OpenAI.
4. Check logs for `[AI disabled]` entries.

```bash
fly secrets set AI_ENABLED=false
```

## Rotating API Keys

1. Create a new key in the OpenAI dashboard.
2. Update the secret: `fly secrets set OPENAI_API_KEY=sk-new-key`.
3. Revoke the old key in the OpenAI dashboard.
4. Run `node scripts/diagnose-openai.mjs` to verify connectivity.
5. Monitor `/api/ai/dashboard` for successful requests.

## Investigating Unexpected Spend

1. Open `GET /api/ai/dashboard` (requires API token).
2. Review `spend.requestsToday`, `estimatedOpenAiCostUsd`, and `requestsByEndpoint`.
3. Query recent audit entries: `GET /api/ai/audit?limit=100`.
4. Check Fly logs for `[AI request]` and `[AI cost alert]` entries.
5. Use correlation IDs from responses to trace individual requests end-to-end.
6. Run reconciliation: `node scripts/ai-reconciliation.mjs --openai-requests=N --openai-input-tokens=N`.
7. If spend is unauthorized, set `AI_ENABLED=false` immediately.

## Interpreting Logs

| Log prefix | Meaning |
|------------|---------|
| `[AI disabled]` | Kill switch active; fake provider in use |
| `[AI request]` | Structured request metadata (no prompts or secrets) |
| `[AI budget exceeded]` | Daily or hourly budget limit hit |
| `[AI cost alert]` | Budget threshold warning (50/75/90/100%) |
| `[AI maintenance]` | Maintenance mode enabled |
| `[AI error]` | Error with correlation context |
| `[OpenAI diagnostic]` | Provider-level diagnostics (no API keys) |

Each `[AI request]` log includes: timestamp, endpoint, requestId, correlationId, model, provider, token estimates, latency, clientIp, authenticatedUser, responseStatus.

## Restoring Service

1. Identify root cause (budget, maintenance mode, kill switch, missing token).
2. Resolve the underlying issue:
   - Budget exceeded → wait for reset or increase limits
   - Maintenance mode → set `AI_MAINTENANCE_MODE=false`
   - Kill switch → set `AI_ENABLED=true`
   - Missing token → set `CAMP_SCOUT_API_TOKEN`
3. Verify `GET /health` returns `{"status":"ok"}`.
4. Send a test request to `/api/ask` with a valid API token.
5. Confirm dashboard metrics increment.

## Responding to Quota Exhaustion

1. OpenAI returns quota errors → clients receive HTTP 503.
2. Set `AI_ENABLED=false` to prevent further OpenAI calls.
3. Check OpenAI dashboard for billing and quota status.
4. Increase quota or wait for reset.
5. Re-enable with `AI_ENABLED=true` after quota is restored.

## Daily Shutdown Checklist

- [ ] Set `AI_ENABLED=false` if AI is not needed overnight
- [ ] Review `GET /api/ai/dashboard` for today's spend
- [ ] Check for unresolved `[AI cost alert]` warnings in logs
- [ ] Verify no anomalous traffic in `busiestIps`
- [ ] Export audit log if needed: `GET /api/ai/audit?limit=500`

## Production Deployment Checklist

- [ ] `AI_ENABLED` set intentionally (default `false`)
- [ ] `CAMP_SCOUT_API_TOKEN` configured
- [ ] Budget limits configured (`AI_DAILY_*`, `AI_HOURLY_*`)
- [ ] Rate limits configured (`API_RATE_LIMIT_*`)
- [ ] `GET /health` passing
- [ ] `GET /metrics` returning Prometheus data
- [ ] Kill switch tested (`AI_ENABLED=false` → fake provider)
- [ ] Maintenance mode tested (`AI_MAINTENANCE_MODE=true` → 503)
- [ ] CI passing (`npm test`)
- [ ] Lint passing (`npm run lint`)
- [ ] Review `docs/AI_PRODUCTION_READINESS.md`

## Environment Variables Reference

| Variable | Default | Purpose |
|----------|---------|---------|
| `AI_ENABLED` | `false` | Global kill switch |
| `AI_MAINTENANCE_MODE` | `false` | Maintenance mode for AI endpoints |
| `AI_DAILY_REQUEST_LIMIT` | unset | Max requests per day |
| `AI_DAILY_INPUT_TOKEN_LIMIT` | unset | Max input tokens per day |
| `AI_DAILY_OUTPUT_TOKEN_LIMIT` | unset | Max output tokens per day |
| `AI_DAILY_DOLLAR_LIMIT` | unset | Max estimated spend per day |
| `AI_HOURLY_REQUEST_LIMIT` | unset | Max requests per hour |
| `AI_HOURLY_TOKEN_LIMIT` | unset | Max tokens per hour |
| `AI_HOURLY_DOLLAR_LIMIT` | unset | Max estimated spend per hour |
| `AI_AUDIT_LOG_PATH` | `.ai-audit/audit-log.jsonl` | Audit log file path |
| `AI_AUDIT_LOG_RETENTION_DAYS` | `30` | Audit log retention |

## Internal Endpoints

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /metrics` | None | Prometheus metrics |
| `GET /api/ai/dashboard` | API token | Spend and monitoring dashboard |
| `GET /api/ai/audit?limit=N` | API token | Recent audit log entries |
| `GET /api/ai/reconciliation` | API token | Cost reconciliation report |
| `GET /api/ai/reconciliation?format=csv` | API token | CSV export |

All AI endpoints return an `x-correlation-id` header and include `correlationId` in JSON responses.
