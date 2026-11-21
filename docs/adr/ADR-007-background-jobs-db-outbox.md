# ADR-007: Background Jobs via Database Outbox

## Status

Accepted

## Date

2026-11-21

## Deciders

Engineering lead, product owner, institute IT administrator.

## Related

- ADR-005 (database portability) — supplies the portable `background_jobs` table and session factory.
- ADR-012 (slot reservation) — demonstrates the same atomic-write approach for booking conflicts.
- `docs/requirements/SRS.md` FR-S-09, FR-S-10, FR-A-13 — in-app notifications, transactional email, and notification templates.
- `docs/requirements/SRS.md` §3.5 — durable job queue in PostgreSQL; no Redis.

## Context

The platform must send emails and reminders and perform other asynchronous work such as notification fan-out and report preparation. Redis is not allowed in any environment, and no Celery or ARQ worker may be introduced. Jobs must survive process restarts and deployments, and handlers must be idempotent because a job may be delivered more than once after a crash.

An in-process `asyncio` task would be lost on restart and would couple background work to API instance lifetime. A table in the same database as business data gives durability without a new service, and the transactional outbox pattern lets a business change and its follow-up job commit atomically.

## Decision

Background jobs (emails, reminders, and similar asynchronous work) are queued in a `background_jobs` table in PostgreSQL/SQLite and processed by a **separate worker process** started with:

```text
python -m app.worker
```

No Redis, no Celery, no ARQ.

Implementation rules:

1. **Outbox pattern.** A job row is inserted in the same database transaction as the business change that requires it. If the business transaction rolls back, the job is never visible to the worker; if it commits, the job is durable.
2. **Worker loop.** The worker polls claimable jobs, locks them, invokes the registered handler by job type, and records the result. Handlers must be idempotent; they receive a stable job id and idempotency key.
3. **Retry policy.** Failed jobs use exponential backoff with `attempts` and `max_attempts` columns. A job that exceeds `max_attempts` moves to a `dead_letter` status with the last error captured for inspection.
4. **Dialect behavior.** The PostgreSQL adapter may claim rows with `SELECT ... FOR UPDATE SKIP LOCKED` so multiple workers can run safely. SQLite uses a single worker process because it has one writer; the portable claim path uses a status transition under transaction instead.
5. **Job record fields (minimum):** `id`, `type`, `payload` (generic JSON), `status` (`pending`, `running`, `succeeded`, `failed`, `dead_letter`), `attempts`, `max_attempts`, `run_at`, `locked_at`, `locked_by`, `last_error`, `created_at`, `updated_at`.
6. **Observability.** Emit metrics per status (`pending`, `running`, `succeeded`, `failed`, `dead_letter`), claim latency, handler duration, and retry counts. Dead-letter volume is an actionable alert.
7. **Separation from API.** The worker is deployed and scaled independently; the API only writes job rows and exposes no job execution endpoint.

## Consequences

### Positive

- Jobs survive API and worker restarts because they are committed with business data.
- No additional infrastructure service to operate, secure, or monitor.
- Atomic business-change-plus-job eliminates lost notifications caused by partial commits.
- Idempotent handlers and dead-letter status make failures recoverable and auditable.
- Works on both supported dialects per ADR-005, with a safe single-worker path on SQLite.

### Negative

- The database is used for both OLTP and queue traffic; high job volume can add load and table contention.
- Polling adds latency compared with a push-based broker; tune the interval per deployment.
- Claiming and backoff logic must be implemented and tested rather than supplied by a queue library.
- Multiple workers on PostgreSQL need `SKIP LOCKED`; on SQLite throughput is limited to one worker.

### Neutral

- Job types are registered in code; unknown types are failed with a clear error rather than silently discarded.
- `payload` uses portable generic JSON, not JSONB, per ADR-005.
- The worker process is a new deployment unit that CI and runbooks must cover.

## Alternatives Considered

- **Redis with ARQ or Celery:** rejected because Redis is explicitly disallowed and adds an operational service.
- **In-process `asyncio.create_task`:** rejected because jobs are lost on restart and cannot be audited.
- **External managed queue service:** rejected for cost, data residency, and because it cannot participate in the local database transaction.
- **Cron-driven batch scripts:** rejected because they cannot provide atomic enqueue with the business change and give poor failure visibility.
