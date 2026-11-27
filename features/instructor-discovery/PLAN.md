# Plan — instructor discovery

## 1. Tests first

- `backend/tests/unit/test_instructor_discovery.py`
  - only approved + active instructors are listed, `average_rating` is null
  - search by name and by teaching language, no-match returns `[]`
  - `max_price` filter, `max_price=-1` is a 422
  - search and price combine
  - detail returns the full profile
  - detail hides pending instructors, students and unknown ids (404)
  - both endpoints require authentication (401)
- `backend/tests/unit/test_instructors_list.py` — expected key set gains
  `average_rating`.
- `frontend/tests/unit/instructor.discovery.test.ts`
  - card content: name, language chips, rate, summary, avatar initial,
    profile link
  - search and max-price filters reach the API query string
  - empty state, sidebar link target, legacy path redirect
  - detail page renders the profile and the «رزرو کلاس» placeholder, and shows
    an error when the instructor is not discoverable

## 2. Backend

- `app/schemas/dashboard.py`: `InstructorListItem.average_rating` and the new
  `InstructorProfileOut`.
- `app/repositories/user_repository.py`: `list_approved_instructors(search,
  max_price)` and `get_approved_instructor(id)`.
- `app/api/v1/instructors.py`: query parameters plus `GET /{instructor_id}`.

## 3. Frontend

- `features/instructors/api/instructors.ts`: query builder and `fetchInstructor`.
- `InstructorDiscoveryPage.vue`, `InstructorDetailPage.vue`.
- Router: `dashboard-student-discover`, `dashboard-student-discover-detail`, and
  the legacy `instructor-search` redirect.
- Sidebar and student dashboard links; `instructors.*` locale blocks (fa/en).

## 4. Verify

- `cd backend && python -m pytest -q`
- `cd backend && python -m ruff check app tests alembic seed_admin.py`
- `cd frontend && bun run vitest run`
- `cd frontend && bun x vite build`

Then commit on `feature/instructor-discovery`, merge into `main` and push.
