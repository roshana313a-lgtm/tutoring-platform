# ADR-002: Authentication Strategy

## Status

Accepted

## Context

Feature 1 requires registration for Student and Instructor accounts, login with email and password, a JWT access token, and role-based access control. Passwords must never be stored or returned in plaintext. Roles currently supported are Student, Instructor, and Admin. The API must return 409 for duplicate registration emails and 401 for bad credentials.

We need a stateless authentication mechanism suitable for a FastAPI backend consumed by a Vue 3 SPA, plus a password hashing approach that is safe by default and inexpensive to verify.

## Decision

We will use:

- **bcrypt** via `passlib[bcrypt]` for password hashing and verification. `passlib` gives a stable API and handles salt generation and hash upgrades; bcrypt is deliberately slow to resist brute-force attacks.
- **PyJWT (`pyjwt`)** for issuing and verifying JWT access tokens. The token will carry the user `sub` (user id) and `role` claims and be signed with HS256 using a secret from settings.
- **Role-based access** enforced by a FastAPI dependency that decodes the token, loads the current user, and checks the required role. The router layer owns HTTP error mapping (401/403), while the domain layer owns role policy.
- **Email as a unique identifier** for registration and login, stored normalized (lowercased) and enforced with a database unique constraint.

Registration returns the created user without `hashed_password`; login returns an access token plus the safe user payload.

## Consequences

### Positive

- Stateless tokens need no server-side session store, which fits the async API and scales horizontally.
- Bcrypt salts and hashes passwords safely without custom cryptography code.
- Embedding `role` in the token makes authorization checks fast; the database remains the source of truth when the user is loaded.
- PyJWT and passlib are widely used, well documented, and straightforward to test with frozen time.

### Negative

- JWT access tokens cannot be revoked individually before expiry without additional infrastructure (token denylist or short TTL plus refresh tokens).
- Bcrypt has a 72-byte input limit and is CPU-intensive; password length must be bounded and login endpoints rate-limited in a later feature.
- A leaked signing secret compromises all tokens, so secret management must be handled carefully in deployment.

### Alternatives considered

- **Server-side sessions with Redis:** simpler revocation, but adds state and cookie/CSRF handling for a SPA.
- **Opaque tokens:** simpler revocation, but requires a lookup on every request.
- **Argon2:** strong hashing alternative; bcrypt chosen for ecosystem maturity and passlib support.
