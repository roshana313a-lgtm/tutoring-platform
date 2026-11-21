# ADR-001: Initial Architecture

## Status

Accepted

## Context

We are building an online tutoring platform with three roles (Student, Instructor, Admin) and nine initial capabilities, including authentication, instructor profiles and discovery, booking, payments, assignments, progress tracking, and an admin dashboard. The system must be testable, auditable, and evolve feature by feature under spec-driven development and TDD.

We need an architecture that supports async I/O, a strongly typed API contract, relational data with clear consistency requirements, background work, and a modern reactive UI, while remaining easy to test in isolation.

## Decision

We will use the following stack and layering:

- **Backend:** Python 3.12+, FastAPI (async), Uvicorn, SQLAlchemy 2.0 (async) with Alembic migrations, PostgreSQL 16, Redis 7, ARQ for background jobs, Pydantic v2 for schemas and settings.
- **Frontend:** Vue 3 (Composition API, `<script setup>`), TypeScript (strict), Vite, Pinia, Vue Router, TailwindCSS with shadcn-vue-style primitives, zod + vee-validate for forms.
- **Infrastructure:** Docker + docker-compose for local development, GitHub Actions for CI.

Backend code is organized in layers with a one-way dependency direction:

```text
Router (app/api/v1) → Service (app/domain) → Repository (app/infrastructure) → Model (app/infrastructure)
```

- **Router** handles HTTP concerns: request parsing, response shaping, and status codes.
- **Service** holds business rules and orchestrates use cases; it is framework-agnostic.
- **Repository** encapsulates persistence and data access.
- **Model** defines the database schema via SQLAlchemy.

Schemas (`app/schemas`) define the Pydantic v2 DTOs crossing the HTTP boundary. Cross-layer imports must point inward only; the domain layer must not import FastAPI or SQLAlchemy.

## Consequences

### Positive

- Async endpoints and async database access scale well for I/O-heavy workloads such as booking and sessions.
- Pydantic v2 schemas give a typed, validated contract that can generate OpenAPI documentation.
- Layered structure keeps business logic testable with unit tests and allows repositories to be faked in API tests.
- PostgreSQL provides strong consistency for bookings and payments; Redis supports caching and queues.
- A clear repository layout makes each feature's SPEC/PLAN mapping unambiguous.

### Negative

- More files and indirection than a single-file application; small features require touching several layers.
- Async SQLAlchemy and Alembic add setup and debugging complexity.
- Running integration tests requires PostgreSQL 16 and Redis 7 (via testcontainers or docker-compose).

### Neutral

- Background jobs will use ARQ (Celery remains a fallback if richer orchestration is needed).
- Frontend component and form libraries will be introduced incrementally, with justification in each feature's PLAN.md.
