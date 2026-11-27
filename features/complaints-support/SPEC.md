# Complaints / Support System

Students and instructors need a sanctioned way to reach the institute admin.
Today the only support entry point is a `mailto:` footer link, which leaves no
record and no way for the admin to track who is waiting on a reply. This feature
adds a support ticket: any signed-in user opens one, the admin triages it
through `open → in_progress → resolved`.

## Actors

| Role | Capability |
| --- | --- |
| Student | Submit a complaint, see the confirmation |
| Instructor | Submit a complaint, see the confirmation |
| Admin | List every complaint with its submitter, move it to `in_progress` or `resolved` |

## API

### `POST /api/v1/complaints` — any authenticated user

Request:

```json
{ "subject": "کلاس لغو شد", "description": "مدرس بدون اطلاع کلاس را لغو کرد." }
```

- Subject: 1–200 characters after trimming.
- Description: 1–2000 characters after trimming.
- `user_id` always comes from the token, never from the body.

`201 Created`:

```json
{
  "id": "0f5c…",
  "user_id": "9a12…",
  "subject": "کلاس لغو شد",
  "description": "مدرس بدون اطلاع کلاس را لغو کرد.",
  "status": "open",
  "created_at": "2026-11-27T09:12:44.120000Z"
}
```

Errors: `401 INVALID_TOKEN`, `422 VALIDATION_ERROR` (empty/whitespace-only,
over-long, or missing fields).

### `GET /api/v1/admin/complaints` — admin only

Returns every ticket newest first, each with the submitter:

```json
[
  {
    "id": "0f5c…",
    "user_id": "9a12…",
    "subject": "کلاس لغو شد",
    "description": "…",
    "status": "open",
    "created_at": "2026-11-27T09:12:44.120000Z",
    "user_name": "علی احمدی",
    "user_email": "ali@example.com"
  }
]
```

`user_name` is the profile full name, falling back to the email local-part.
Errors: `401 INVALID_TOKEN`, `403 FORBIDDEN` for students and instructors.

### `PATCH /api/v1/admin/complaints/{id}/status` — admin only

```json
{ "status": "in_progress" }
```

- Allowed values: `in_progress`, `resolved`. `open` is the initial state only, so
  it is rejected with `422 VALIDATION_ERROR`, as is any unknown value.
- Returns the updated ticket (`200`).
- `404 COMPLAINT_NOT_FOUND` for an unknown id, `403 FORBIDDEN` for non-admins.

### `GET /api/v1/dashboard/admin/stats`

Gains `open_complaints`, the number of tickets still in `open`, so the admin
dashboard card is a real count rather than a placeholder.

## Data

`complaints`:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID | primary key |
| `user_id` | UUID | FK `users.id`, `ON DELETE CASCADE`, indexed |
| `subject` | String(200) | not null |
| `description` | Text | not null |
| `status` | String(20) | not null, default `open` |
| `created_at` | DateTime(tz) | not null, default now |

Migration: `backend/alembic/versions/0005_add_complaints.py`.

## Frontend

- `/dashboard/support` (`SupportPage.vue`) — subject + description form, client
  validation, character counter, success and failure banners. Linked from the
  student and instructor sidebars as «پشتیبانی» with a life-buoy icon.
- `/dashboard/admin/complaints` (`ComplaintsPage.vue`) — table of subject,
  submitter (name + email), status badge, date, and the two workflow buttons
  («در حال بررسی», «حل شد»). The button for a transition a ticket no longer
  needs is not rendered. Linked from the admin sidebar as
  «شکایات و پشتیبانی» with a message icon.
- Admin dashboard: a fourth stat card «شکایات باز» pointing at the queue.

All copy exists in both `fa` and `en`.

## Acceptance criteria

1. A student and an instructor can each open a ticket; the response echoes the
   trimmed text and `status: "open"`.
2. Anonymous submission is rejected with `401`, invalid payloads with `422`.
3. Only an admin can list tickets or change a status; everyone else gets `403`.
4. The admin list carries the submitter's name and email, newest first.
5. Status moves only to `in_progress` or `resolved`; unknown ids return `404`.
6. The admin dashboard's «شکایات باز» count matches the database and drops as
   tickets are resolved.
7. Students and instructors see «پشتیبانی» in the sidebar; the admin sees
   «شکایات و پشتیبانی», and both routes render their pages.
8. The full test suites, lint and production build stay green.
