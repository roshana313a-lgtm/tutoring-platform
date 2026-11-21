# AGENTS.md

> **Read this file before doing anything in this repository.**
> This document is the single source of truth for how software is designed, built,
> tested, and documented in this project. Any human or AI agent contributing to this
> repository MUST comply with the rules defined here.

---

## 1. Purpose

This repository hosts an **online tutoring platform** for an educational institute.
The project follows **strict software engineering discipline**: spec-driven development,
TDD, architecture decision records, and living documentation.

Every contribution — human or AI-generated — is expected to be **reproducible,
auditable, testable, and documented**.

---

## 2. Product Scope (High Level)

The system supports three roles: **Student**, **Instructor**, and **Admin**.

Initial capabilities (each will become its own SPEC/PLAN feature):

1. User authentication & role-based access (Student / Instructor / Admin)
2. Instructor profile: expertise, resume, teaching history, rating & reviews
3. Instructor discovery & comparison (by expertise, rating, reviews)
4. Class booking & scheduling
5. Online class sessions
6. Payments
7. Assignments (submit & grade)
8. Performance evaluation & learning progress tracking
9. Admin dashboard: manage instructors, users, service quality, and analytics

**Non-goals (for now):** mobile apps, native desktop, third-party marketplace,
multi-tenant organizations, calendar sync with Google/Outlook.

---

## 3. Technology Stack

### Backend
- **Python 3.12+**
- **FastAPI** (async), **Uvicorn**
- **SQLAlchemy 2.0 (async)** + **Alembic** for migrations
- **PostgreSQL 16**
- **Redis 7** (cache + queue)
- **ARQ** (or Celery) for background jobs (emails, notifications)
- **Pydantic v2** for schemas & settings
- **pytest**, **pytest-asyncio**, **httpx.AsyncClient**, **testcontainers**, **freezegun**
- **ruff**, **mypy (strict)**, **pre-commit**

### Frontend
- **Vue 3** (Composition API, `<script setup>`)
- **TypeScript** (strict)
- **Vite**
- **Pinia** (state), **Vue Router**
- **TailwindCSS** + **shadcn-vue**-style primitives
- **zod** + **vee-validate** (forms)
- **Vitest** + **@vue/test-utils** (unit), **Playwright** (E2E)
- **ESLint** + **Prettier**

### Infra / Ops
- **Docker** + **docker-compose** (local dev)
- **GitHub Actions** (CI: lint, type-check, test, build)
- **Conventional Commits** + **Changesets** (for versioning later)

> **Every new dependency requires justification** in the current feature's `PLAN.md`
> under a "Dependencies & Rationale" section.

---

## 4. Repository Layout

```text
E:\ES
├── AGENTS.md
├── Task-List.md
├── README.md
├── docs/
│   ├── adr/                  # Architecture Decision Records
│   └── running.md            # local dev / test / deploy commands
├── backend/
│   ├── app/
│   │   ├── api/v1/           # FastAPI routers
│   │   ├── core/             # config, security, errors
│   │   ├── domain/           # entities, value objects, policies
│   │   ├── infrastructure/   # SQLAlchemy models, repos, Redis, jobs
│   │   ├── schemas/          # Pydantic v2 DTOs
│   │   └── main.py
│   ├── tests/                # unit / integration / e2e
│   ├── alembic/              # migrations
│   ├── pyproject.toml
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/       # shadcn-vue-style primitives
│   │   ├── views/
│   │   ├── stores/           # Pinia
│   │   ├── router/
│   │   ├── schemas/          # zod
│   │   └── api/              # generated/typed HTTP client
│   ├── tests/
│   ├── e2e/                  # Playwright
│   ├── package.json
│   └── Dockerfile
├── features/
│   └── <feature>/            # SPEC.md + PLAN.md per feature
├── docker-compose.yml
└── .github/workflows/ci.yml
```
