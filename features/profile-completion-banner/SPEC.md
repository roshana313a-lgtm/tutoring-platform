# SPEC — Profile Completion Onboarding Banner

## Problem

A user who registers and signs in without filling in their full name or phone
number sees a normal dashboard with no reminder that their profile is missing
required onboarding data.

## Goal

Every role dashboard (student, instructor, admin) tells the user their profile is
incomplete and links them straight to the profile page.

## Requirements

1. **Where** — at the top of the dashboard content, above the stat cards, on
   `StudentDashboard.vue`, `InstructorDashboard.vue` and `AdminDashboard.vue`.
2. **Condition** — the banner is visible while `full_name` is empty/blank **or**
   `phone_number` is empty/blank.
3. **Content** — a yellow alert reading
   «پروفایل شما تکمیل نیست. لطفاً برای استفاده کامل از امکانات، اطلاعات خود را وارد کنید.»
4. **Action** — a «تکمیل پروفایل» link that navigates to `/profile`.
5. **Reactivity** — the banner disappears immediately after the profile is saved,
   without a page reload (it reads `useAuthStore().user`, which `updateProfile`
   replaces).
6. **i18n** — Persian and English copy live in the locale files, not the markup.

## Out of scope

- Blocking dashboard access until the profile is complete.
- Validating which fields the profile API requires.
- Backend changes; the banner is derived from the existing `GET /api/v1/auth/me`
  payload.
