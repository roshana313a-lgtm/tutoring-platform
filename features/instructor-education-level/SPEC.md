# SPEC — Instructor Education Level Dropdown

## Problem

Instructors can already store `education_level`, and the value is displayed on their
public profile, but the profile form has no control for it. The field could only be
set through the API, so newly registered instructors always show an empty education
level on their profile card.

## Goal

An instructor can pick their education level on the profile page and the value is
persisted by the same save action as the rest of the teaching details.

## Requirements

1. **Placement** — inside the instructor-only section of `ProfilePage.vue`, alongside
   the hourly rate, teaching languages and resume summary. Not shown to students or
   admins.
2. **Control** — a `<select>` bound to a `education_level` field of the vee-validate
   form, marked `data-test="education-level"`.
3. **Options** — «دیپلم», «کارشناسی», «کارشناسی ارشد», «دکتری». The stored value is the
   Persian identifier already used by the API and by existing instructor records; the
   label is translated (`profile.educationOptions.*`). An empty placeholder option
   keeps the rendered selection honest when nothing is stored yet.
4. **Prefill** — the select shows `auth.user.education_level` when present.
5. **Payload** — `PUT /api/v1/auth/profile` receives `education_level` together with
   `hourly_rate`, `teaching_languages` and `short_summary` for instructor accounts.

## Backend

No change is required. `ProfileUpdateRequest.education_level` is a common field
(`str | None`, `max_length=64`) applied through `UserRepository.update`, so every
role may send it. This feature adds explicit instructor contract tests instead of
changing the endpoint.

## Out of scope

- Restricting the stored value to the four options on the backend (existing records
  and admin tooling can hold other text).
- Showing the education level anywhere other than the instructor profile page (that
  already exists).
