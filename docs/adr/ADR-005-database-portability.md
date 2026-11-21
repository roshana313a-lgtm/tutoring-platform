# ADR-005: Database Portability

## Status

Accepted — supersedes the infrastructure portions of ADR-001.

## Date

2026-11-21

## Deciders

Engineering lead, product owner, institute IT administrator.

## Related

- ADR-001 (initial architecture) — this ADR supersedes its Redis and single-dialect assumptions.
- ADR-007 (background jobs via DB outbox) — relies on the same portable database layer.
- ADR-012 (slot reservation) — relies on identical behavior on both dialects.
- `docs/requirements/SRS.md` §3.4 and §9 — no containers, SQLite locally, PostgreSQL 16 in staging/production.
- `backend/pyproject.toml` — `sqlalchemy[asyncio]`, `aiosqlite`, `asyncpg`.

## Context

The project follows ADR-0005 portability and SAD v1.1: no Docker or containers are used in development, CI, or production. Developers need instant local startup with zero infrastructure setup, while staging and production need PostgreSQL 16 for full concurrency, durability, and operational tooling. A single codebase must support both without conditional forks in business logic.

Using dialect-specific SQLAlchemy types or raw SQL in domain/repository code would make local SQLite behavior diverge from production PostgreSQL, causing bugs that only appear after deployment. The data layer must therefore be deliberately portable, with the small number of genuinely PostgreSQL-specific optimizations isolated behind adapters.

## Decision

The same codebase runs on SQLite (via `aiosqlite`) for local development and unit tests, and on PostgreSQL 16 (via `asyncpg`) for staging and production. The database URL is configuration, not code.

Implementation rules:

1. **Portable ORM types only.** Use `sqlalchemy.Uuid` for UUID columns, generic `JSON` for structured data, and `DateTime(timezone=True)` through a custom `UtcDateTime` TypeDecorator that normalizes timezone-aware values on both dialects. All timestamps are stored and returned as UTC-aware datetimes.
2. **Repository pattern enforces portability.** All data access goes through repository classes; SQLAlchemy expressions and dialect details never appear in services, routers, or domain code. Repositories accept an `AsyncSession` supplied by the dependency-injection layer.
3. **Dialect-specific optimizations are isolated.** PostgreSQL-only features live behind `pg_*` adapters selected by a factory based on the active dialect. The default adapter uses portable SQL. No `pg_*` adapter is required for correctness — only for performance.
4. **Forbidden types and constructs** (use a portable equivalent or an isolated `pg_*` adapter instead): `ARRAY`, `JSONB`, `HSTORE`, native `ENUM`, `SERIAL`/`BIGSERIAL` auto-increment columns, PostgreSQL-specific `ON CONFLICT` syntax outside an adapter, server-side advisory locks, `DISTINCT ON`, `ILIKE` outside an adapter, and raw dialect SQL in domain or service code.
5. **Migration discipline.** Alembic migrations must be reviewable for both dialects; any index or constraint used for correctness must exist on both.
6. **Integration tests run on both dialects in CI.** The same integration suite executes once against in-memory/file SQLite and once against PostgreSQL 16, so dialect drift is caught before release. Unit tests use SQLite by default.

## Consequences

### Positive

- Developers start the application and run tests immediately with no external services.
- One domain and service layer for all environments; behavior differences are confined to adapters.
- CI catches dialect-specific defects before staging.
- Timezone handling is explicit and consistent through `UtcDateTime`.
- Repository boundaries make it possible to add another supported dialect later.

### Negative

- Some PostgreSQL capabilities (JSONB indexing, advisory locks, native arrays) cannot be used directly in the portable path.
- The `UtcDateTime` adapter and `pg_*` adapter factory add initial code and maintenance overhead.
- SQLite's single-writer model makes concurrency tests less representative; the PostgreSQL CI leg is mandatory, not optional.
- Generic `JSON` on PostgreSQL is slower to query than `JSONB` unless an adapter is introduced for read-heavy paths.

### Neutral

- PostgreSQL 16 remains the production target of record; SQLite is a development and test dialect, not a production deployment option.
- DI of `AsyncSession` means tests can supply an in-memory engine without changing application code.
- The forbidden-type list will evolve as new features are reviewed; additions require an ADR update.

## Alternatives Considered

- **PostgreSQL only with Docker for local development:** rejected because ADR-0005/SAD v1.1 forbid containers and developers require instant startup.
- **Repository abstraction with in-memory fake only:** rejected because it cannot validate real SQL, constraints, or transactional behavior.
- **Raw SQL per dialect in services:** rejected because it duplicates business logic and makes divergence likely.
- **Native ENUM / JSONB everywhere with SQLite translation layer:** rejected because the translation layer would be complex and hide correctness differences.
