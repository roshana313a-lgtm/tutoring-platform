# PLAN: User Authentication & Role-Based Access

## Layers touched

| Layer | Files (planned) | Responsibility |
| --- | --- | --- |
| Router | `backend/app/api/v1/auth.py` | Register/login/me endpoints, status codes, error mapping |
| Schemas | `backend/app/schemas/auth.py`, `backend/app/schemas/user.py` | Pydantic request/response DTOs; never expose `hashed_password` |
| Domain | `backend/app/domain/user.py`, `backend/app/domain/auth.py` | User entity, role enum, password/token policies, role checks |
| Infrastructure | `backend/app/infrastructure/models/user.py`, `backend/app/infrastructure/repositories/user.py`, `backend/app/infrastructure/security.py` | SQLAlchemy model, user repository, bcrypt + JWT implementation |
| Core | `backend/app/core/config.py`, `backend/app/core/security.py` | Settings (JWT secret, TTL), auth dependencies |
| Database | `backend/alembic/versions/…` | `users` table migration |
| Tests | `backend/tests/unit/test_auth.py`, `backend/tests/integration/test_auth_api.py` | RED-first tests for behavior and API contract |

Dependency direction stays inward: Router → Domain → Infrastructure → Model. Routers do not import SQLAlchemy directly.

## Data model: `users`

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | UUID (PK) | Generated on insert |
| `email` | String(255) | Unique, not null, normalized to lowercase |
| `hashed_password` | String | Not null, bcrypt hash, never serialized |
| `role` | Enum(`student`, `instructor`, `admin`) | Not null |
| `created_at` | Timestamptz | Not null, server default `now()` |

## Dependencies & Rationale

| Dependency | Rationale |
| --- | --- |
| `passlib[bcrypt]` | Password hashing API with salt handling and bcrypt's deliberate slowness; bcrypt is the chosen hashing algorithm in ADR-002. |
| `pyjwt` | Encode/decode and validate HS256 JWT access tokens carrying `sub` and `role`. |
| `pydantic-settings` | Typed settings for JWT secret and token TTL loaded from environment variables. |
| `sqlalchemy[asyncio]` + `asyncpg` | Async ORM and PostgreSQL driver for the users table and repository. |
| `alembic` | Versioned schema migration that creates the `users` table. |
| `pytest`, `pytest-asyncio`, `httpx` | TDD loop: isolated unit tests and async API tests via `ASGITransport`. |
| `email-validator` | Required by Pydantic v2 `EmailStr` for real email validation in request/response schemas. |
| `aiosqlite` (dev only) | In-memory SQLite async driver used in test fixtures, so tests need no PostgreSQL/Docker service. |
| `bcrypt<4.1` (pin) | passlib 1.7.4 reads `bcrypt.__about__`, removed in bcrypt 4.1+; pinning to 4.0.1 keeps `CryptContext(schemes=["bcrypt"])` working. Revisit when passlib ships a compatible release or migrate to another hashing backend. |
| `types-passlib` (dev only) | Type stubs for passlib so strict `mypy` can check `app/core/security.py` without an import-untyped error. |
| `axios` (frontend) | HTTP client for the typed auth API module; provides request configuration and reliable status/error inspection for the shared `http.ts` wrapper. |
| `zod` (frontend) | Runtime schema validation for login/register form values, shared between vee-validate and typed form contracts. |
| `vee-validate` (frontend) | Form state, validation orchestration, and field-level error display for the Login and Register pages. |
| `@vee-validate/zod` (frontend) | Official adapter connecting zod schemas to vee-validate without duplicating validation rules. |
| `@vitejs/plugin-vue` (frontend dev only) | Required by Vite to compile Vue 3 single-file components (`<script setup>` + templates). |
| `vue-tsc` (frontend dev only) | Type-checks Vue SFCs and TypeScript together, which plain `tsc` cannot do; used by `npm run type-check` and `npm run build`. |
| `happy-dom` (frontend dev only) | Provides the DOM APIs Vitest needs to mount Vue SFCs with `@vue/test-utils`; required to verify `BaseBanner` variant rendering and the dismiss interaction. |

No other new dependencies are introduced by this feature.

## Ordered TDD cycle sequence

Each cycle is RED → GREEN → REFACTOR. Write the test first; do not add production code before the test fails for the expected reason.

1. **Registration contract (Student):** `POST /api/v1/auth/register` returns `201` with `email` and `role`, no `hashed_password`. *(This is the failing test created for this step.)*
2. **Registration contract (Instructor):** same endpoint returns `role: "instructor"`.
3. **Duplicate email:** second registration with the same email (different case) returns `409`.
4. **Input validation:** malformed email, unsupported role, and short password return `422`.
5. **Password hashing:** stored password is a bcrypt hash and never equals the plaintext.
6. **Login success:** correct credentials return `access_token`, `token_type`, and the safe user payload.
7. **Login failure:** wrong password and unknown email both return `401` with the same message.
8. **Token contents:** access token carries `sub` and `role`, signs with HS256, and expires per settings.
9. **Current user:** `GET /api/v1/auth/me` with a valid token returns the matching user payload.
10. **Token rejection:** missing, malformed, expired, and wrongly signed tokens return `401`.
11. **Role policy:** role-protected endpoint rejects insufficient roles with `403`.
12. **Migration:** Alembic revision creates the `users` table with the unique constraint on `email`.
13. **Documentation:** update `docs/running.md` with auth-specific test and migration commands.
