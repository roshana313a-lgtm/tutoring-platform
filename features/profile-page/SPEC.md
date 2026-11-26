# SPEC: Role-Specific Profile Page (Feature 2c)

## Goal

Give every authenticated user a dedicated profile page at `/profile` where they can edit the
information their role owns: common identity details for everyone, learning details for
students, and teaching-catalogue details for instructors.

## Scope

### In scope

- A single page `ProfilePage.vue` routed at `/profile`, rendered inside the dashboard layout.
- A sidebar entry «پروفایل من» for student, instructor, and admin.
- Role-aware form:
  - **Common (all roles):** full name, phone number, avatar upload with preview.
  - **Student:** «سطح زبان» (`current_level`), «هدف یادگیری» (`learning_goal`).
  - **Instructor:** «قیمت هر ساعت» (`hourly_rate`), «زبان‌های تدریس» (`teaching_languages`),
    «خلاصه رزومه» (`short_summary`, max 200 characters).
  - **Admin:** common fields only.
- Backend columns: `date_of_birth`, `education_level`, `avatar_url`, `short_summary`,
  `hourly_rate`, `teaching_languages`, `current_level`, `learning_goal`.
- `PUT /api/v1/auth/profile` rejects fields owned by another role with `422 VALIDATION_ERROR`.
- `POST /api/v1/uploads/avatar` stores an image and returns its public URL.

### Out of scope

- Cropping, resizing, or moderation of uploaded images.
- Profile visibility rules and instructor discovery (Feature 3).
- Avatar deletion or garbage collection of replaced files.
- Admin editing other users' profiles.

## Field ownership matrix

| Field | student | instructor | admin |
| --- | --- | --- | --- |
| `full_name`, `phone_number`, `avatar_url`, `timezone`, `date_of_birth`, `education_level` | ✓ | ✓ | ✓ |
| `current_level`, `learning_goal` | ✓ | ✗ | ✗ |
| `bio`, `years_of_experience`, `short_summary`, `hourly_rate`, `teaching_languages` | ✗ | ✓ | ✗ |

## API contract

`PUT /api/v1/auth/profile` — partial update, bearer token required.

- `200` with the updated user; response never contains `hashed_password`.
- `422 VALIDATION_ERROR` when a field is not owned by the caller's role, when a value violates
  its constraints (`short_summary` > 200 chars, negative `hourly_rate`, malformed
  `date_of_birth`), or when an unknown field is supplied.
- `401 INVALID_TOKEN` without a valid token.

`POST /api/v1/uploads/avatar` — `multipart/form-data` field `file`, bearer token required.

- `201` with `{"avatar_url": "/media/avatars/<uuid>.<ext>"}`.
- `422 VALIDATION_ERROR` for non-image content types, empty files, or files over 2 MB.
- `401 INVALID_TOKEN` without a valid token.

## Acceptance criteria

1. `/profile` renders for student, instructor, and admin, and only shows the fields that role owns.
2. Selecting an image previews it locally, uploads it, and stores the returned URL on save.
3. Saving sends only the fields the role owns; the API rejects anything else with 422.
4. `alembic upgrade head` adds the new columns on an existing database and `downgrade` removes them.
5. Backend role-validation and frontend conditional-rendering tests pass.
