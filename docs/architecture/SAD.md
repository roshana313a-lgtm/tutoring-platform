# Software Architecture Document (SAD)

**Project:** Online Tutoring Platform — Educational Institute
**Version:** 1.1
**Status:** Accepted for implementation
**Date:** 2026-11-21
**Audience:** Institute management, engineering, QA, operations
**Normative references:** `AGENTS.md`, `docs/requirements/SRS.md`, `docs/adr/ADR-001-initial-architecture.md`, `docs/adr/ADR-002-auth-strategy.md`, `docs/adr/ADR-005-database-portability.md`, `docs/adr/ADR-007-background-jobs-db-outbox.md`, `docs/adr/ADR-012-slot-reservation.md`

> **Terminology note (applies to the whole document):** In the C4 model, a *container* means a separately running application or data store (for example "API process" or "PostgreSQL"). It does **not** mean an OS/OCI container. This project uses **no Docker, no OCI containers, and no container orchestration in development, CI, staging, or production**. All processes are native.

---

## 1. Purpose & Scope

### 1.1 Purpose

This Software Architecture Document describes the architecture of the institute's online tutoring platform for three actors — **Student (زبان­آموز)**, **Instructor (مدرس)**, and **Admin (مدیر مؤسسه)** — as specified in `docs/requirements/SRS.md`. It explains how the system is structured into runtime units, backend and frontend components, data, and deployment topology, and why those choices were made.

The document is the architectural counterpart to the SRS: the SRS states *what* the system must do; this SAD states *how the system is organized to do it*. It does not add new requirements.

### 1.2 Scope

**In scope:** system context, container view, backend/frontend component views, data architecture, runtime flows, deployment topology, cross-cutting concerns, code mapping, evolution, risks, and ADR backlog.

**Out of scope:** detailed feature behavior (see `docs/requirements/SRS.md` and per-feature `features/<feature>/SPEC.md`), test plans, UI visual design, and operational runbooks (to be recorded in `docs/running.md`).

### 1.3 Conformance to ISO/IEC/IEEE 42010

ISO/IEC/IEEE 42010 requires an architecture description to identify stakeholders and their concerns, viewpoints, views, and architecture decisions. This document satisfies that as follows:

| 42010 concept | Representation in this document |
| --- | --- |
| Stakeholders | Institute management, Student, Instructor, Admin, developers, QA, operations — derived from SRS §3.1 and `AGENTS.md` §1 |
| Architecture concerns | Ranked in §2 as architectural drivers; cross-cutting concerns in §10 |
| Viewpoints | C4 system context (§3), C4 container (§4), C4 component (§5–§6), runtime/process (§8), deployment (§9), data (§7), cross-cutting (§10) |
| Views | The diagrams and tables in §§3–10 |
| Architecture decisions | ADRs 001, 002, 005, 007, 012; backlog in §15 |
| Correspondence rules | §11 maps every architectural element to concrete code paths and requirement IDs |

### 1.4 Viewpoint catalogue

| Viewpoint | Section | Answers |
| --- | --- | --- |
| C4 Level 1 — System Context | §3 | Who uses the system and which external systems it depends on |
| C4 Level 2 — Container | §4 | Which processes and data stores exist and how they communicate |
| C4 Level 3 — Component (backend) | §5 | Which backend components implement which SRS features |
| C4 Level 3 — Component (frontend) | §6 | Which frontend modules implement which SRS features |
| Data viewpoint | §7 | Logical entities, portability, slot uniqueness |
| Runtime viewpoint | §8 | How key flows execute across components |
| Deployment viewpoint | §9 | How processes are installed, started, and networked |
| Cross-cutting viewpoint | §10 | Error handling, security, observability, i18n, configuration |
| Code mapping | §11 | Where each architectural element lives in the repository |

---

## 2. Architectural Drivers

Ranked from most to least constraining. Each driver traces to SRS requirements or an ADR.

| Rank | Quality attribute / concern | Source | Architectural consequence |
| --- | --- | --- | --- |
| 1 | **Scheduling correctness** — no double-booked slots | SRS FR-B-05, FR-P-04, FR-A-09; ADR-012 | Unique constraint on `booking_slots(class_session_id, start_at)`; atomic insert and conflict-to-409 mapping; no distributed lock or TTL |
| 2 | **Testability** — fast unit tests, both-dialect integration tests | SRS NFR-18; `AGENTS.md` §3; ADR-005 | SQLite default for unit tests; injectable `AsyncSession`; repositories isolate SQL; CI runs integration tests on SQLite and PostgreSQL 16 |
| 3 | **Database portability** — one codebase, two dialects | ADR-005; SRS §3.4, §9 | Portable ORM types only; `UtcDateTime` adapter; `pg_*` adapters behind a factory; forbidden dialect-specific types; no raw SQL in services |
| 4 | **Security & role isolation** | SRS FR-S-02–FR-S-07, NFR-04–NFR-08; ADR-002 | JWT access tokens, bcrypt hashing, server-side RBAC on every protected endpoint, generic 401, file authorization, TLS, rate limiting |
| 5 | **Performance** | SRS NFR-01–NFR-03, NFR-10 | Async FastAPI + async SQLAlchemy, indexed lookups, connection pooling, streaming file transfer, Redis-free caching avoided by design |
| 6 | **Observability** | SRS NFR-19, NFR-17, FR-S-13 | Structured logs, request metrics, per-status job metrics, audit log, health endpoint |
| 7 | **Evolvability** — feature-by-feature delivery | `AGENTS.md` §1–§2; SRS §10–§11 | Hexagonal backend, FSD frontend, per-feature SPEC/PLAN, ADR-backed decisions, adapter boundary for external providers |
| 8 | **Simplicity of operations with no containers** | ADR-005; SRS §3.4, §9; ADR backlog 0010 | Native processes managed by systemd; Caddy/NGINX reverse proxy; native PostgreSQL install in CI; no Docker, no OCI runtime, no orchestration |
| 9 | **Durability of background jobs** | SRS FR-S-09, FR-S-10, FR-A-13; ADR-007 | DB-backed outbox in `background_jobs`; separate worker; retries with backoff; dead-letter status; idempotent handlers |

Driver 1 outranks 5: a fast booking response is meaningless if it can double-book. Driver 8 outranks convenience of broker-based queues because Redis is explicitly disallowed.

---

## 3. System Context

### 3.1 Actors and external systems

This is the C4 Level 1 view. The three human actors are defined in SRS §3.1.

```text
                          +----------------------------------+
                          |      Online Tutoring Platform    |
                          |  (institute-operated learning    |
                          |   system of record, web only)    |
                          +----------------------------------+
                             ^            ^             ^
      discovery, booking,    |            |             |   governance, analytics,
      homework, sessions     |            |             |   approvals, moderation
                             |            |             |
              +--------------+----+  +-----+---------+  +---------------+
              | Student (زبان­آموز)|  | Instructor   |  | Admin         |
              |                    |  | (مدرس)       |  | (مدیر مؤسسه)  |
              +--------------------+  +--------------+  +---------------+

                          |            |             |
                          v            v             v
              +--------------------+ +------------------+ +-------------------+
              | SMTP provider      | | Payment gateway  | | Video-conference  |
              | emails, reminders  | | classes, refunds | | provider (live)   |
              +--------------------+ +------------------+ +-------------------+

                          +-------------------------------+
                          | Object storage / filesystem   |
                          | resumes, attachments, files   |
                          +-------------------------------+
```

### 3.2 External system responsibilities

| External system | SRS reference | Interaction | Data ownership |
| --- | --- | --- | --- |
| SMTP provider | FR-S-10, FR-A-07 | Sends verification, booking confirmation, reminder, and notification emails through the worker | No pedagogical data stored externally |
| Payment gateway | FR-B-15, FR-A-08 | Charges for booked classes (P2) and reports payment status | Transaction tokens only; institute owns booking/payment records |
| Video-conference provider | FR-B-06, FR-P-06, NFR-13 | Hosts live class sessions, optional captions and recordings | Platform owns schedule, joining links, attendance |
| Object storage / filesystem | FR-S-08, FR-P-02, FR-B-16 | Stores resumes, homework attachments, submissions, materials | Platform owns access control and metadata |

**Explicitly absent:** Redis, Celery, ARQ, Docker, and any OCI container runtime. PostgreSQL is internal infrastructure, not an external SaaS system (ADR-005, ADR-007).

---

## 4. Container View

### 4.1 C4 Level 2 — runtime units

Again, "container" below is a C4 runtime unit, not a Docker container.

```text
  Browser
     |
     | HTTPS (static assets + /api)
     v
+--------------------------------+
| Reverse Proxy (Caddy or NGINX) |  serves built Vue assets,
| native process, TLS terminator |  proxies /api to API process
+----------------+----------------+
                 | HTTP
                 v
        +---------------------+        +------------------------+
        | API process         |        | Worker process         |
        | uvicorn app.main:app|        | python -m app.worker   |
        | systemd tutoring-api|        | systemd tutoring-worker|
        +----------+----------+        +-----------+------------+
                   |                              |
                   | SQL (asyncpg / aiosqlite)    | SQL (same DB)
                   v                              v
        +------------------------------------------------+
        | PostgreSQL 16 (staging/prod)                   |
        | or SQLite file (local dev / unit tests)        |
        | tables incl. booking_slots, background_jobs     |
        +------------------------------------------------+
                   ^
                   | file metadata / controlled reads
                   v
        +--------------------------------+
        | Filesystem (uploads + backups) |
        | native directory, no container |
        +--------------------------------+
```

### 4.2 Container specifications

| C4 container | Technology | Responsibility | SRS/ADR reference |
| --- | --- | --- | --- |
| Static Vue | Vue 3 + TypeScript + Vite build output | Browser UI for all three actors; built to static files | SRS §9; `AGENTS.md` §3 |
| Reverse Proxy | Caddy or NGINX, native process | TLS, static asset delivery, `/api` reverse proxy, optional basic request limiting | SRS NFR-04, NFR-08 |
| API process | FastAPI + Uvicorn, `systemd` unit `tutoring-api` | HTTP endpoints, RBAC, validation, business orchestration, transactional writes | SRS FR-S-01–FR-S-03; ADR-001, ADR-002 |
| Worker process | `python -m app.worker`, `systemd` unit `tutoring-worker` | Claims and executes `background_jobs` (emails, reminders, notifications) | SRS FR-S-09, FR-S-10; ADR-007 |
| PostgreSQL 16 | Native service, `asyncpg` driver | System of record and durable job queue; `booking_slots` uniqueness | ADR-005, ADR-007, ADR-012 |
| SQLite (dev/test only) | `aiosqlite` driver, local file or in-memory | Local development and fast unit/integration tests | ADR-005 |
| Filesystem | Native directory | Resumes, homework attachments, submissions, materials, DB backups | SRS FR-S-08; ADR-005 |

**No Redis container, no cache service, no Celery/ARQ broker, no Docker daemon, no orchestrator.** Caching needs, if any, are satisfied through query design and PostgreSQL indexing rather than an external cache (ADR-005).

### 4.3 Communication rules

- Browser → Reverse Proxy: HTTPS only in staging/production.
- Reverse Proxy → API: plain HTTP on loopback/private interface.
- API/Worker → Database: SQLAlchemy 2.0 async sessions; driver selected by the configured URL (ADR-005).
- API → Worker: **never direct calls**; the API inserts a `background_jobs` row in the same transaction as the business change (ADR-007).
- API → Filesystem: authorized read/write through the files component; object paths are metadata in the database.

---

## 5. Backend Component View

### 5.1 Layering

The backend follows hexagonal layering from `AGENTS.md` and ADR-001. Dependencies point inward:

```text
   +--------------------------------------------------+
   | api/  (FastAPI routers, request/response DTOs)    |  -> SRS FR-S-* endpoints
   +------------------------+-------------------------+
                            | calls
                            v
   +--------------------------------------------------+
   | domain/ (entities, services, policies, errors)    |  no FastAPI, no SQLAlchemy
   +------------------------+-------------------------+
                            | uses ports (interfaces)
                            v
   +--------------------------------------------------+
   | infrastructure/ (repositories, models, adapters,  |
   |  outbox, files, SMTP/payment/video clients, jobs) |
   +--------------------------------------------------+
```

`core/` holds cross-cutting primitives (settings, database session factory, security helpers, error types, `UtcDateTime`). `schemas/` holds Pydantic v2 request/response models. The repository layer is the port that enforces database portability (ADR-005).

### 5.2 Component catalogue

| Component | Layer | Responsibility | SRS reference |
| --- | --- | --- | --- |
| Auth | api + domain + infrastructure | Registration, login, JWT issuance, current user, bcrypt hashing, role claims | FR-S-01–FR-S-07; ADR-002 |
| Profiles | api + domain | Own profile management for all actors | FR-S-05, FR-P-01, FR-P-02 |
| Instructor discovery | api + domain + infrastructure | Search/filter by expertise, rating, reviews; side-by-side comparison; profile read | FR-B-01–FR-B-03 |
| Class calendar | api + domain | Instructor availability publishing, timezone display, availability exceptions | FR-B-04, FR-P-04, FR-P-16 |
| Booking | api + domain + infrastructure | Reserve slot atomically, list/cancel/reschedule, conflict mapping | FR-B-05, FR-B-10, FR-A-09; ADR-012 |
| Homework | api + domain + infrastructure | Create assignments, list for Student, submit text/files, deadlines | FR-B-07, FR-B-08, FR-P-07 |
| Grading | api + domain | Score submissions, written feedback, grade visibility | FR-B-09, FR-P-08 |
| Evaluations | api + domain | Post-class performance evaluation records | FR-B-13, FR-P-09 |
| Progress | api + domain + infrastructure | Time-series view of scores, topics, evaluations | FR-B-11, FR-P-11 |
| Weak areas | api + domain | Mark, explain, and display weak areas per Student | FR-B-12, FR-P-10, FR-B-20 |
| Admin | api + domain | Instructor approval, user management, taxonomy, policy configuration, moderation | FR-A-01–FR-A-05, FR-A-07–FR-A-12 |
| Notifications | domain + infrastructure | In-app notification records and outbox job creation; worker handlers for email | FR-S-09, FR-S-10, FR-A-13; ADR-007 |
| Files | api + infrastructure | Validated upload/download, object metadata, authorized access | FR-S-08, FR-P-02, FR-B-16 |

### 5.3 Component interactions (key rule)

- Routers never import SQLAlchemy models; they call domain services and map results through Pydantic schemas.
- Domain services never import FastAPI or dialect-specific SQL; they depend on repository interfaces.
- Infrastructure repositories implement those interfaces using portable SQLAlchemy expressions.
- Dialect-specific behavior lives in `infrastructure/adapters/pg_*`, selected by a factory from the configured URL (ADR-005).
- Any side effect that must outlive the request (email, reminder) is written to `background_jobs` in the same transaction (ADR-007).

---

## 6. Frontend Component View

### 6.1 Feature-Sliced Design (FSD) layout

The Vue 3 + TypeScript + Pinia + Vite frontend is organized by FSD layers. Imports flow downward only:

```text
frontend/src/
├── app/          # application bootstrap, router, providers, global styles
├── processes/    # multi-feature flows (registration, booking, submission, evaluation)
├── pages/        # route-level components per actor
├── widgets/      # composed UI blocks (instructor card, comparison table, progress chart)
├── features/     # user-facing feature modules (one per SRS feature group)
├── entities/     # domain data models and API typings (user, instructor, class, homework)
└── shared/       # UI primitives, api client, config, i18n, validation helpers
```

### 6.2 Feature modules and SRS mapping

| FSD module (under `features/`) | Actor(s) | SRS reference | Related backend components |
| --- | --- | --- | --- |
| `auth` | All | FR-S-01–FR-S-04 | Auth |
| `profile` | All | FR-S-05 | Profiles |
| `discovery` | Student | FR-B-01–FR-B-03 | Instructor discovery, Profiles |
| `calendar` | Student, Instructor | FR-B-04, FR-P-04 | Class calendar |
| `booking` | Student, Admin | FR-B-05, FR-B-10 | Booking |
| `sessions` | Student, Instructor | FR-B-06, FR-P-06 | Class calendar |
| `homework` | Student, Instructor | FR-B-07, FR-B-08, FR-P-07 | Homework, Files |
| `grading` | Student, Instructor | FR-B-09, FR-P-08 | Grading |
| `evaluations` | Student, Instructor | FR-B-13, FR-P-09 | Evaluations |
| `progress` | Student, Instructor | FR-B-11, FR-P-11 | Progress |
| `weak-areas` | Student, Instructor | FR-B-12, FR-P-10 | Weak areas |
| `admin` | Admin | FR-A-01–FR-A-18 | Admin |
| `notifications` | All | FR-S-09, FR-A-13 | Notifications |
| `files` | All | FR-S-08 | Files |

### 6.3 Frontend rules

- Pinia stores hold session/user state and actor-scoped UI state; they call the typed API client in `shared/api`.
- Each feature module owns its pages/widgets usage but may not import from another `features/` slice; shared flows go in `processes/`.
- Role-based UI gating is a usability measure only; server-side RBAC remains authoritative (SRS NFR-06).
- All user-facing strings come from the i18n layer (English/Persian, RTL) per SRS NFR-14/NFR-15.

---

## 7. Data Architecture

### 7.1 Logical entities

The model is relational and normalized. UUID primary keys use `sqlalchemy.Uuid`; structured payloads use generic `JSON`; timestamps use the `UtcDateTime` adapter (ADR-005).

| Entity | Purpose | Key attributes / constraints | SRS reference |
| --- | --- | --- | --- |
| `users` | Accounts for all three roles | `id` (UUID PK), `email` unique + indexed, `hashed_password`, `role`, `created_at` | FR-S-01, FR-S-06; ADR-002 |
| `instructor_profiles` | Instructor credentials and biography | `user_id` (FK), bio, languages, approval status, rating aggregate fields | FR-P-01–FR-P-03, FR-A-03, FR-B-03 |
| `expertise_areas` | Admin-maintained subject taxonomy | `id`, name, parent/category, active flag | FR-A-04, FR-B-01 |
| `class_availability` | Instructor-published recurring/one-off slots | `instructor_id`, start/end UTC, recurrence rule, timezone reference | FR-B-04, FR-P-04, FR-P-16 |
| `class_sessions` | Concrete scheduled classes | `id`, instructor, subject/expertise, start/end UTC, status, joining link | FR-B-05, FR-P-05, FR-P-06 |
| `booking_slots` | Atomic slot reservations | `id`, `class_session_id`, `start_at`, **UNIQUE (class_session_id, start_at)** | FR-B-05; ADR-012 |
| `bookings` | Student reservations and lifecycle | `id`, `student_id`, `class_session_id`, `booking_slot_id`, status, timestamps | FR-B-05, FR-B-10 |
| `homework` | Instructor assignments | `id`, class/session, instructions, deadline UTC, attachments metadata | FR-B-07, FR-P-07 |
| `submissions` | Student submitted work and grades | `id`, `homework_id`, `student_id`, payload/file refs, score, feedback, status | FR-B-08, FR-B-09, FR-P-08 |
| `evaluations` | Post-class performance records | `id`, `student_id`, `class_session_id`, instructor, score, completed topics, notes | FR-B-13, FR-P-09 |
| `weak_areas` | Instructor-marked improvement topics | `id`, `student_id`, `evaluation_id`, topic, explanatory note | FR-B-12, FR-P-10 |
| `progress_entries` | Time-series learning progress | `id`, `student_id`, source reference, score/topic, recorded_at UTC | FR-B-11, FR-P-11 |
| `reviews` | Student ratings/reviews of instructors | `id`, `student_id`, `instructor_id`, `class_session_id`, score, text, moderation status | FR-B-14, FR-P-12, FR-A-12 |
| `notifications` | In-app notification records | `id`, recipient, type, payload, read status, created_at | FR-S-09, FR-A-13 |
| `background_jobs` | Durable outbox queue | `id`, `type`, generic `JSON` payload, status, attempts/max_attempts, run_at, locked_at/by, last_error, timestamps | FR-S-09, FR-S-10; ADR-007 |
| `audit_log` | Attribution of sensitive changes | `id`, actor, action, entity, before/after JSON, timestamp | FR-S-13, NFR-17, FR-A-15 |

Relationship notes: an instructor profile links to `users` and many-to-many `expertise_areas`; a booking links a Student, a `class_session`, and exactly one `booking_slots` row; a submission links homework and a Student; an evaluation may spawn weak-area and progress-entry rows. Admin taxonomy and policy configuration are stored as regular entities/config records, not as code constants.

### 7.2 Portability strategy (ADR-005)

- Use `sqlalchemy.Uuid`, generic `JSON`, and `DateTime(timezone=True)` through the custom `UtcDateTime` adapter on both dialects.
- Forbidden: `ARRAY`, `JSONB`, `HSTORE`, native `ENUM`, `SERIAL`/`BIGSERIAL`, dialect-only SQL in services/repositories, advisory locks, `DISTINCT ON`, and unadapted `ILIKE`.
- All access goes through repositories; domain and API layers never write SQL.
- PostgreSQL-only optimizations live in `pg_*` adapters chosen by a factory from the active dialect. They improve performance but are never required for correctness.
- CI runs the same integration suite against SQLite and PostgreSQL 16; unit tests default to SQLite.

### 7.3 Slot reservation strategy (ADR-012)

- Booking writes a `booking_slots` row with `UNIQUE (class_session_id, start_at)`.
- Success means reserved; a unique violation is translated to `HTTP 409` (no pre-check, no distributed lock).
- Cancellation deletes the slot row and updates the booking in the same transaction.
- Works identically on SQLite (single writer) and PostgreSQL 16 (MVCC + unique index).
- No TTL, lease, lock owner, or renewal job exists.

### 7.4 Job queue strategy (ADR-007)

- Business transaction and `background_jobs` insert commit together (outbox).
- Worker claims jobs, applies exponential backoff with `attempts`/`max_attempts`, and moves exhausted jobs to `dead_letter`.
- SQLite: one worker. PostgreSQL: `FOR UPDATE SKIP LOCKED` adapter permits multiple workers.
- Metrics are emitted per job status.

---

## 8. Runtime View

### 8.1 Register / login (SRS FR-S-01, FR-S-02, FR-S-04; ADR-002)

1. Browser posts credentials to `/api/v1/auth/register` or `/api/v1/auth/login` through the reverse proxy.
2. API router validates the Pydantic schema; invalid input returns structured 422.
3. Auth service obtains an `AsyncSession` via the `get_db` dependency.
4. Registration normalizes email, checks the repository for duplicates (409 on conflict), bcrypt-hashes the password, and inserts the `users` row.
5. Login loads the user, verifies the bcrypt hash, and returns a generic 401 for unknown email or wrong password.
6. On success the service issues a JWT carrying `sub` and `role`; `GET /api/v1/auth/me` decodes it and returns the safe user payload.

### 8.2 Browse instructors (SRS FR-B-01–FR-B-03)

1. Student opens discovery page; frontend feature `discovery` requests filtered instructors.
2. Router parses expertise/rating/review/availability filters.
3. Domain discovery service builds a portable query through the instructor repository (joins `instructor_profiles`, `expertise_areas`, `reviews`).
4. Only approved instructors are returned (FR-A-03); results include expertise, resume metadata, teaching history, rating, and reviews for profile view.
5. Comparison requests fetch two or more profiles and normalize them into the comparison widget.

### 8.3 Book a class (SRS FR-B-05, FR-P-04; ADR-012, ADR-007)

1. Student selects a slot shown from `class_availability` / `class_sessions`.
2. Booking service opens a transaction.
3. It attempts an atomic `INSERT` into `booking_slots`.
4. Unique violation → rollback and `HTTP 409`; the UI offers alternative slots.
5. Successful insert → create the `bookings` row and enqueue a confirmation/reminder `background_jobs` row **in the same transaction**.
6. Commit. A notification row is created for in-app display (FR-S-09).

### 8.4 Submit homework (SRS FR-B-07, FR-B-08, FR-P-07, FR-P-08; FR-S-08)

1. Instructor creates homework with deadline and optional attachments; files are validated and written through the files component, metadata stored in DB.
2. Student lists homework and submits text and/or an uploaded file before the deadline.
3. Files component stores the object; `submissions` row records references and status.
4. A notification and an outbox job are written for the instructor.
5. Instructor grades the submission (score + feedback); grading service updates the row and creates a notification plus outbox job for the Student.
6. Student views grades and feedback (FR-B-09).

### 8.5 Worker loop for notifications (ADR-007)

1. `python -m app.worker` starts and registers handlers by job type (email, reminder, notification fan-out).
2. Loop claims pending `background_jobs` rows where `run_at` is due.
3. PostgreSQL claims with `FOR UPDATE SKIP LOCKED`; SQLite runs a single worker and transitions status under transaction.
4. Handler executes with the job id/idempotency key; handlers are idempotent because delivery may repeat after a crash.
5. Success sets `succeeded`; failure increments `attempts`, schedules exponential backoff, or sets `dead_letter` at `max_attempts`.
6. Metrics are emitted per status; dead-letter count is alertable.

---

## 9. Deployment View

### 9.1 Local development — no Docker, no containers

- Create a native Python virtual environment and install `backend/pyproject.toml` dependencies.
- Default settings use `sqlite+aiosqlite:///./dev.db`; no database service is started.
- Start API: `uvicorn app.main:app --reload`.
- Start worker: `python -m app.worker`.
- Frontend: `npm run dev` (Vite dev server); built assets can be served by a local Caddy/NGINX process if proxy behavior must be tested.
- Alembic migrations run against the same SQLite URL.
- No Docker Compose, no OCI image, no container runtime.

### 9.2 CI — native PostgreSQL in GitHub Actions

- Checkout, set up Python and Node toolchains natively on the runner.
- Install and start **PostgreSQL 16 as a native OS service** on the runner; do not declare a service container and do not use Docker.
- Create a test database and set `DATABASE_URL` to the native PostgreSQL instance for the integration leg.
- Stages: lint (`ruff`, ESLint), type-check (`mypy`, `tsc`), unit tests (SQLite), integration tests (SQLite **and** PostgreSQL 16), frontend tests (Vitest), build (Vite), optional Playwright E2E.
- Alembic migration check runs on both dialects.

### 9.3 Staging / production — native processes

```text
                 HTTPS
   Internet -------------> [ Caddy / NGINX :443 ]
                                  |
                    static assets |  /api proxy
                    +-------------+--------------+
                    v                            v
        [ Vue build directory ]      [ tutoring-api.service ]
                                      uvicorn app.main:app
                                              |
                                              v
                                   [ PostgreSQL 16 native service ]
                                              ^
                                              |
                                [ tutoring-worker.service ]
                                   python -m app.worker
```

- **Reverse proxy:** Caddy (automatic TLS) or NGINX, installed as a native system service; serves the Vite build output and proxies `/api` to the API process on loopback.
- **API process:** systemd unit `tutoring-api`, running Uvicorn with the configured number of workers; stateless and horizontally scalable behind the proxy.
- **Worker process:** systemd unit `tutoring-worker`, one instance on SQLite; multiple instances on PostgreSQL using `SKIP LOCKED` (ADR-007).
- **Database:** PostgreSQL 16 installed natively, with daily backups and tested restore (SRS NFR-20); `asyncpg` driver (ADR-005).
- **Filesystem:** native directory for uploads and backups, included in backup policy.
- Secrets (JWT secret, SMTP/payment credentials) come from environment/systemd credentials and are never logged (SRS NFR-04, FR-A-07, FR-A-08).
- No Docker, no OCI images, no Kubernetes, no container registry in any environment.

---

## 10. Cross-Cutting Concerns

### 10.1 Error envelope

All API errors use one JSON shape:

```json
{ "error": { "code": "SLOT_TAKEN", "message": "The selected slot is no longer available.", "details": {} } }
```

Mapping: 401 unauthenticated/invalid token, 403 insufficient role, 404 not found, 409 business conflict (duplicate email, taken slot), 422 validation, 500 unexpected with a generic message. The slot-conflict mapping is mandated by ADR-012. A dedicated ADR for the envelope is in the backlog (§15, ADR-0008).

### 10.2 Security & RBAC

- JWT access tokens signed with HS256 and `sub`/`role` claims; bcrypt password hashing (ADR-002).
- RBAC enforced server-side on every protected endpoint; 401 vs 403 distinctions per SRS FR-S-03.
- Duplicate-email and bad-credential responses avoid account enumeration (SRS FR-S-07).
- Uploads are type/size-checked and served only through authorized endpoints (SRS NFR-07).
- TLS in staging/production; rate limiting on auth endpoints; secrets excluded from logs (SRS NFR-04, NFR-08).
- Audit log records admin approvals, moderation, and grade changes (SRS NFR-17, FR-S-13).

### 10.3 Observability

- Structured JSON logs with request id, actor id, and route; no secrets or password hashes.
- Metrics: request latency/error rate, job counts per status, claim latency, handler duration, dead-letter count, queue depth (SRS NFR-19).
- `GET /health` for readiness (SRS FR-S-16).
- System-health indicators surfaced to Admin (FR-A-14).

### 10.4 Internationalization

- English (LTR) and Persian (RTL) with a locale switch (SRS FR-S-14, NFR-14).
- No hardcoded user-facing strings; localized dates, numbers, and currency.
- UTC storage everywhere with IANA timezone display (ADR backlog 0004); UTF-8 content renders in both directions (NFR-15).

### 10.5 Configuration

- Typed settings via `pydantic-settings` in `backend/app/core/config.py`: `database_url`, `jwt_secret`, `jwt_algorithm`, `jwt_expire_minutes`.
- Admin-configurable SMTP, payment, booking/cancellation/late-submission policies, and notification templates (SRS FR-A-07–FR-A-09, FR-A-13, FR-S-17).
- Configuration values are environment-driven per deployment; dialect-specific adapters are selected from `database_url` (ADR-005).

---

## 11. Architecture-to-Code Mapping

| Architectural element | ADR / SRS ref | Repository location | Status |
| --- | --- | --- | --- |
| SRS baseline | — | `docs/requirements/SRS.md` | Exists |
| Engineering rules | — | `AGENTS.md` | Exists |
| This architecture | — | `docs/architecture/SAD.md` | This document |
| Layered architecture decision | ADR-001 | `docs/adr/ADR-001-initial-architecture.md` | Exists |
| Auth decision | ADR-002, FR-S-01–FR-S-07 | `docs/adr/ADR-002-auth-strategy.md` | Exists |
| Portability decision | ADR-005 | `docs/adr/ADR-005-database-portability.md` | Exists |
| Outbox decision | ADR-007 | `docs/adr/ADR-007-background-jobs-db-outbox.md` | Exists |
| Slot reservation decision | ADR-012, FR-B-05 | `docs/adr/ADR-012-slot-reservation.md` | Exists |
| FastAPI app + health | FR-S-16 | `backend/app/main.py` | Exists |
| Auth router | FR-S-01–FR-S-04 | `backend/app/api/v1/auth.py` | Exists |
| API routers (all features) | SRS §10 | `backend/app/api/v1/` | Partially implemented |
| Settings | §10.5 | `backend/app/core/config.py` | Exists |
| DB session / Base / `get_db` | ADR-005 | `backend/app/core/db.py` | Exists |
| Password/JWT helpers | ADR-002 | `backend/app/core/security.py` | Exists (hashing) |
| Error types | §10.1 | `backend/app/core/errors.py` | Exists |
| Pydantic schemas | FR-S-01 | `backend/app/schemas/` | Partially implemented |
| Domain services | §5.1 | `backend/app/domain/` (target); current auth service in `backend/app/services/auth_service.py` | Target defined; reconciliation pending |
| Repositories | ADR-005, ADR-006 backlog | `backend/app/infrastructure/` (target); current in `backend/app/repositories/user_repository.py` | Target defined; reconciliation pending |
| ORM models | ADR-005 | `backend/app/models/user.py` (current); target `backend/app/infrastructure/models/` | Partially implemented |
| Dialect adapters | ADR-005 | `backend/app/infrastructure/adapters/` | Planned |
| Worker entry point | ADR-007 | `backend/app/worker.py` | Planned |
| Outbox handlers / jobs | ADR-007 | `backend/app/infrastructure/jobs/` | Planned |
| Migrations | ADR-005 | `backend/alembic/` | Planned |
| Tests | SRS NFR-18 | `backend/tests/{unit,integration,e2e}/` | Partially implemented |
| Frontend FSD layers | §6 | `frontend/src/{app,processes,pages,widgets,features,entities,shared}/` | Partially implemented |
| Feature specs/plans | `AGENTS.md` §2 | `features/<feature>/SPEC.md`, `PLAN.md` | Auth exists |
| Local runbook | §9.1 | `docs/running.md` | Placeholder |

The current auth GREEN implementation lives in `app/services`, `app/repositories`, and `app/models`; these are the domain/infrastructure roles described above. As features are added, code will be reconciled with the `domain/` and `infrastructure/` packages named in `AGENTS.md` §4 without changing behavior.

---

## 12. Evolution & Extensibility

1. **New feature:** start from an SRS FR ID, write `features/<feature>/SPEC.md` and `PLAN.md`, add an ADR if a new decision is needed, then implement backend component, FSD module, entities, tests, and docs (per `AGENTS.md`).
2. **New job type:** register a handler in the worker and add a `background_jobs.type` value; no broker changes (ADR-007).
3. **More workers:** add PostgreSQL worker instances using `SKIP LOCKED`; keep one worker on SQLite (ADR-007, ADR-005).
4. **New dialect:** implement adapter methods, add CI leg, keep forbidden types out of the portable path (ADR-005).
5. **Booking policy changes:** cancellation window, late-submission rules, and refunds are Admin configuration (SRS FR-A-09, FR-S-17); slot uniqueness remains unchanged (ADR-012).
6. **Group classes:** if multiple seats per slot are required, extend the `booking_slots` key with a seat identifier and supersede ADR-012; do not remove the uniqueness guarantee.
7. **Provider replacement:** SMTP, payment, video, and object storage clients sit behind infrastructure adapters, so provider swaps do not affect domain code.
8. **Phased growth:** P2 and P3 features in SRS §11 are added as new components/modules rather than by modifying the core booking and homework loops.

---

## 13. Risks & Trade-offs

| Risk / trade-off | Impact | Mitigation |
| --- | --- | --- |
| Database doubles as queue (ADR-007) | High job volume adds DB load | Index `background_jobs(status, run_at)`, batch claims, monitor queue depth, tune poll interval |
| SQLite single writer (ADR-005, ADR-012) | Limited local/CI concurrency | Keep SQLite for dev/tests only; PostgreSQL CI leg is mandatory; single worker on SQLite |
| No external cache | Read latency under growth | Indexed queries, pagination, avoid N+1 through repositories; add caching only via a future ADR, not Redis |
| Unique-violation control flow (ADR-012) | Slots can 409 under contention | UI handles 409 with alternative suggestions; measure conflict rate |
| No distributed lock | Cannot express multi-seat slots today | Documented in ADR-012; supersede ADR before implementing group classes |
| Native deployment parity | Environment drift without images | Document exact versions in `docs/running.md`; CI mirrors native service setup; systemd units versioned in repo later |
| Worker polling latency | Notification delay | Configurable short poll interval; `run_at` scheduling; metrics on claim latency |
| JWT revocation | Tokens valid until expiry | Short TTL with configurable expiry (ADR-002); revocation/denylist deferred to a future ADR |
| Third-party providers | Outage of email/payment/video | Outbox retries isolate API from SMTP; payment/video failures surfaced as status, not data loss |
| Bilingual drift | Translation inconsistency | Central i18n catalog; Persian terminology review (SRS Q-13); RTL layout tests |

---

## 14. Glossary

| Term | Definition |
| --- | --- |
| C4 model | Context, Container, Component, Code architecture model. Here *container* means a runtime unit, not Docker. |
| ISO/IEC/IEEE 42010 | Standard for architecture description; requires stakeholders, concerns, viewpoints, views, and decisions. |
| Hexagonal architecture | Layering where the domain is central and adapters (API, DB, external services) surround it; dependencies point inward. |
| FSD | Feature-Sliced Design; frontend layering used in §6. |
| Outbox | Pattern where a job row is committed in the same transaction as the business change it follows. |
| Adapter | Infrastructure class implementing a port using a specific technology or dialect; `pg_*` adapters are PostgreSQL-only. |
| Port | Interface defined by the domain and implemented by infrastructure. |
| `UtcDateTime` | Custom SQLAlchemy TypeDecorator normalizing timezone-aware datetimes across SQLite and PostgreSQL (ADR-005). |
| `SKIP LOCKED` | PostgreSQL clause letting multiple workers claim different rows without waiting. |
| `booking_slots` | Table whose unique key prevents double booking (ADR-012). |
| `background_jobs` | Durable outbox table processed by the worker (ADR-007). |
| RBAC | Role-based access control; roles are Student, Instructor, Admin (SRS §3). |
| Actor | Human role interacting with the system (SRS §3.1). |
| Student (زبان­آموز) | Learner enrolled at the institute. |
| Instructor (مدرس) | Institute-approved teacher. |
| Admin (مدیر مؤسسه) | Institute staff member governing the platform. |
| Weak area | Instructor-marked topic needing improvement (SRS §2.3). |
| NFR | Non-functional requirement in SRS §8. |
| FR | Functional requirement in SRS §§4–7. |

---

## 15. ADR Backlog

### 15.1 Existing ADRs

| ADR | Title | Status | Relevance to this SAD |
| --- | --- | --- | --- |
| ADR-001 | Initial Architecture | Accepted | FastAPI + Vue 3 + layered architecture; infrastructure portions superseded by ADR-005/007 |
| ADR-002 | Authentication Strategy | Accepted | JWT + bcrypt; §8.1, §10.2 |
| ADR-005 | Database Portability | Accepted | §7.2, §9, §13 |
| ADR-007 | Background Jobs via Database Outbox | Accepted | §7.4, §8.5, §9.3 |
| ADR-012 | Booking Slot Reservation | Accepted | §7.3, §8.3 |

### 15.2 ADRs still to be created

| Proposed ADR | Topic | Why it is needed | Related sections |
| --- | --- | --- | --- |
| ADR-0003 | Role isolation and permission enforcement | Formalize server-side RBAC boundaries and 401/403 behavior beyond ADR-002 | §10.2, SRS FR-S-03 |
| ADR-0004 | UTC storage and IANA timezone display | Define `UtcDateTime` semantics and learner-local rendering | §7.1, §10.4, ADR-005 |
| ADR-0006 | Repository pattern | Specify ports, unit-of-work, and the domain/infrastructure boundary | §5.1, §7.2, §11 |
| ADR-0008 | Error envelope | Standardize error codes and HTTP mapping | §10.1 |
| ADR-0009 | Frontend Feature-Sliced Design | Freeze import rules, store boundaries, and i18n placement | §6 |
| ADR-0010 | Native process deployment | Record systemd units, reverse proxy choice, and native CI setup | §9 |

No ADR is required for "no Redis / no Docker" as a separate decision: it is a standing constraint from `AGENTS.md`, SRS §3.4/§9, ADR-005, and ADR-007, applied throughout this document.

---

**End of Software Architecture Document v1.1.**
