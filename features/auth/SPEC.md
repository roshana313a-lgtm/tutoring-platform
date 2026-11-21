# SPEC: User Authentication & Role-Based Access

## Goal

Allow users to register as a Student or Instructor, log in with email and password, receive a JWT access token, and access endpoints according to their role.

## Scope

### In scope

- Registration for **Student** and **Instructor** roles.
- Login with **email + password**.
- JWT **access token** issued on successful registration and login.
- **Role-based access** for protected endpoints.
- Retrieval of the currently authenticated user.

### Out of scope

- Admin account creation through public registration.
- Password reset, email verification, refresh tokens, and logout/denylist.
- Social login and multi-factor authentication.

## Endpoints

### Response shapes

`POST /api/v1/auth/register` and `POST /api/v1/auth/login` return `AuthResponse`:

```json
{
  "user": {
    "id": "11111111-1111-4111-8111-111111111111",
    "email": "student@example.com",
    "role": "student",
    "created_at": "2026-11-21T10:00:00Z"
  },
  "access_token": "<jwt>",
  "token_type": "bearer"
}
```

`user` is a `UserResponse` and never contains `hashed_password`. `GET /api/v1/auth/me` returns that same `UserResponse` object directly (not wrapped in `AuthResponse`).

All errors use the standard envelope defined in `docs/architecture/SAD.md` §10.1:

```json
{ "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid email or password", "details": {} } }
```

### `POST /api/v1/auth/register`

Request body: `email`, `password`, `role` (`student` | `instructor`).

Success: `201 Created` with `AuthResponse` — the created `user` (`id`, `email`, `role`, `created_at`) plus `access_token` and `token_type: "bearer"`. `hashed_password` must never be returned.

Errors:
- `409 Conflict` with code `EMAIL_EXISTS` when the email is already registered.
- `422 Unprocessable Entity` with code `VALIDATION_ERROR` for invalid input (bad email format, unsupported role, short password).

### `POST /api/v1/auth/login`

Request body: `email`, `password`.

Success: `200 OK` with `AuthResponse` — `user`, `access_token`, and `token_type: "bearer"`.

Errors:
- `401 Unauthorized` with code `INVALID_CREDENTIALS` and message `Invalid email or password` when the email does not exist or the password is wrong. Both cases are identical per FR-S-07.
- `422 Unprocessable Entity` with code `VALIDATION_ERROR` for an invalid request body.

### `GET /api/v1/auth/me`

Authentication: `Authorization: Bearer <access_token>`.

Success: `200 OK` with the `UserResponse` of the token's subject. The dependency reads `Authorization: Bearer <access_token>`, decodes the HS256 JWT, and loads the user from the repository (`ADR-002`).

Errors:
- `401 Unauthorized` with code `INVALID_TOKEN` when the token is missing, malformed, expired, has an invalid signature, or references an unknown user.
- `403 Forbidden` with code `FORBIDDEN` when the user's role is not allowed by an endpoint guarded by `require_role(*roles)`.

## Acceptance criteria

1. A Student can register and receives `201` `AuthResponse` with `user.email`, `user.role`, a non-empty `access_token`, and no `hashed_password`.
2. An Instructor can register and receives `201` with `user.role: "instructor"` and no `hashed_password`.
3. A duplicate email (case-insensitive) returns `409` with code `EMAIL_EXISTS` and does not create a second user.
4. A registered user can log in with correct credentials and receives `200` `AuthResponse` containing a JWT access token and the safe user payload.
5. Login with a wrong password or unknown email returns `401` with code `INVALID_CREDENTIALS` and the identical generic message.
6. `GET /api/v1/auth/me` with a valid token returns `200` with the corresponding `UserResponse`.
7. `GET /api/v1/auth/me` without a token or with a malformed token returns `401` with code `INVALID_TOKEN`.
8. A valid token with an insufficient role for a role-protected endpoint returns `403` with code `FORBIDDEN`.
9. Passwords are stored only as bcrypt hashes; tokens are HS256 JWTs carrying `sub`, `role`, and `exp`.

## Error cases

| Case | Status | Code | Notes |
| --- | --- | --- | --- |
| Duplicate email on registration | 409 | `EMAIL_EXISTS` | Email compared case-insensitively |
| Bad credentials on login | 401 | `INVALID_CREDENTIALS` | Identical response for unknown email and wrong password |
| Missing/invalid/expired token | 401 | `INVALID_TOKEN` | Checked by `get_current_user` |
| Insufficient role | 403 | `FORBIDDEN` | Enforced by `require_role(*roles)` |
| Invalid request body | 422 | `VALIDATION_ERROR` | Pydantic validation |
