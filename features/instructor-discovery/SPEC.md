# Instructor discovery (student search & profile view)

## Goal

Let a language learner find an approved instructor and read the instructor's
profile before booking a class. Discovery is the first student-facing read of
instructor data; booking comes in a later feature.

## Backend

`GET /api/v1/instructors` (authenticated: students, instructors and admins)

- Returns only accounts with `role = "instructor"`, `is_approved = true` and
  `is_active = true`. Pending, rejected and suspended instructors never appear.
- Optional `search` (max 100 chars): case-insensitive substring match on the
  full name **or** any teaching language.
- Optional `max_price` (>= 0): keeps instructors whose `hourly_rate` is at or
  below the cap. An instructor without a rate (`0`, shown as «نرخ توافقی`) still
  matches.
- Ordered by full name, then email.
- Item payload: `id`, `full_name`, `email`, `short_summary`, `teaching_languages`,
  `hourly_rate`, `education_level`, `avatar_url`, `average_rating`.

`GET /api/v1/instructors/{id}` (authenticated)

- Full profile of one approved, active instructor: `id`, `full_name`,
  `avatar_url`, `short_summary`, `bio`, `teaching_languages`, `hourly_rate`,
  `average_rating`, `years_of_experience`, `education_level`.
- An unapproved, suspended or non-instructor id, and an unknown id, all return
  `404 NOT_FOUND` so the endpoint never leaks who exists.

### Ratings

There is no reviews table yet, so `average_rating` is always `null`. The field is
part of the contract now so the UI can render «بدون امتیاز» and later switch to
real numbers without an API change.

### Why the search term is matched in Python

`teaching_languages` is a JSON column (ADR-005 portability). SQLAlchemy stores
its text form with escaped non-ASCII, so a portable SQL `LIKE` never matches a
Persian language name. The repository filters by price in SQL and matches the
name/language over that short result set in Python, which stays dialect-neutral.

## Frontend

- `/dashboard/student/discover` — discovery page: search field, maximum-price
  filter, «جستجو»/«پاک کردن» actions, and a responsive card grid. Each card
  shows the avatar (or the name's first letter), full name, teaching-language
  chips, the hourly rate as «۵۰۰,۰۰۰ تومان / ساعت» («نرخ توافقی» when unset), the
  short summary clamped to three lines, and a «مشاهده پروفایل» link.
- `/dashboard/student/discover/:id` — profile page with rating, experience,
  education, languages, bio, and a disabled «رزرو کلاس» placeholder for the next
  feature.
- The student sidebar item «جستجوی مدرس» and the student dashboard links point at
  the discovery page. `/dashboard/instructor-search` redirects there, so older
  links keep working.
- Loading, empty, error and not-found states are all translated (fa/en).

## Out of scope

Booking, reviews, pagination and per-language filters.
