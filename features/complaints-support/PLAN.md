# Complaints / Support System — Plan

## Slice 1 — Backend contract (tests first)

`backend/tests/unit/test_complaints.py` written before any implementation (all
20 cases failed first run):

- student and instructor submission, trimmed output, `status: "open"`;
- anonymous `401`;
- eight invalid payloads (blank, whitespace-only, over-long subject and
  description, missing field) → `422 VALIDATION_ERROR`;
- admin list ordering and submitter name/email (full name, email fallback);
- student/instructor `403` on list and on status update, anonymous `401`;
- `open → in_progress → resolved` workflow;
- `open`/`closed`/missing status → `422`;
- unknown complaint id → `404 COMPLAINT_NOT_FOUND`;
- dashboard `open_complaints` counts open tickets and drops after a resolve.

## Slice 2 — Backend implementation

| Layer | File | Decision |
| --- | --- | --- |
| Model | `app/models/complaint.py` | `created_at` uses a Python `datetime.now(UTC)` default **and** a `server_default`; the app-side default keeps sub-second precision so newest-first ordering is stable when two tickets share a second (SQLite's `now()` truncates). |
| Schemas | `app/schemas/complaint.py` | `ComplaintCreate` trims before validating length so `"   "` is rejected rather than stored. `ComplaintStatusUpdate.status` is a `Literal`, so anything outside the workflow fails at the schema boundary with the standard `422` envelope. |
| Repository | `app/repositories/complaint_repository.py` | `list_with_users()` joins `users` in one query; `count_open()` feeds the dashboard. |
| Router | `app/api/v1/complaints.py` | `POST /complaints` behind `get_current_user`; `user_id` from the token. |
| Admin routes | `app/api/v1/admin.py` | `GET /complaints`, `PATCH /complaints/{id}/status` behind `require_role("admin")`; `404` uses the `{"code","message"}` envelope. |
| Dashboard | `app/api/v1/dashboard.py`, `app/schemas/dashboard.py` | `AdminDashboardStats.open_complaints` added; existing exact-dict assertion in `test_dashboard_stats.py` updated to include it. |
| Migration | `alembic/versions/0005_add_complaints.py` | `upgrade()` guards on `has_table("complaints")` like 0004; `downgrade()` drops the index and table. Applied with `alembic upgrade head`. |

Checks: `python -m pytest -q` → 106 passed; `python -m ruff check app tests alembic seed_admin.py` → clean.

## Slice 3 — Frontend

- `features/support/api/complaints.ts` — typed client plus the two length limits
  shared with the form (`200` subject, `2000` description).
- `features/support/pages/SupportPage.vue` — `/dashboard/support`. Local
  validation (no request on an empty form), trims before posting, success banner
  and field reset on `201`, separate failure banner.
- `features/admin/pages/ComplaintsPage.vue` — `/dashboard/admin/complaints`.
  Status badges (`open` amber, `in_progress` blue, `resolved` green), a
  description preview, date via `formatDate(…, locale)`, and only the buttons the
  current status still allows. Status updates replace the row in place from the
  `PATCH` response, so no refetch is needed.
- `DashboardLayout.vue` — `nav.support` item for students and instructors,
  `nav.complaints` for admins. The old `mailto:` footer link is removed because
  the in-app form now replaces it.
- `AdminDashboard.vue` — fourth stat card «شکایات باز» from `open_complaints`,
  linking to the queue. `AdminStats` gained the field.
- `router/index.ts` — `dashboard-support`, `dashboard-admin-complaints`, both
  with `meta.title` keys so the topbar heading is translated.

Checks: `bun run vitest run` → 115 passed; `bun x vite build` → succeeds.

## Tests touched

| File | Change |
| --- | --- |
| `tests/unit/support.complaints.test.ts` | New: form submit/validation/failure, admin list + badges, allowed transitions, workflow, load failure, sidebar entries per role, dashboard card href + count. |
| `tests/unit/dashboard.sidebar.test.ts` | Expected labels gain «پشتیبانی» / «شکایات و پشتیبانی». |
| `tests/unit/i18n.test.ts` | English sidebar expectation gains `Complaints & support`. |
| `tests/unit/dashboard.realdata.test.ts` | Admin stats stub gains `open_complaints`; four stat values expected. |
| `tests/unit/admin.command-center.test.ts`, `instructor.approval.test.ts` | Stats stubs extended with `open_complaints`. |
| `backend/tests/unit/test_dashboard_stats.py` | Exact payload gains `open_complaints: 0`. |

## Dependencies & Rationale

**No new dependencies.** The API, migration and UI use FastAPI/SQLAlchemy/Pydantic
and Vue/Router/lucide-vue-next pieces that the project already ships; the admin
table and the form reuse the existing panel/banner styles rather than adding a
component library.

## Open decisions

- No replies/threads yet: the ticket records the complaint and the admin's
  status, but there is no message history. A `complaint_messages` table is the
  natural next slice if a conversation is needed.
- No visibility for the submitter beyond the confirmation banner; a "my tickets"
  list would need a `GET /complaints/mine` endpoint.
- Status changes are not attributed to an admin and are not audit-logged; the
  audit log is still an open item from the admin command-center work.
