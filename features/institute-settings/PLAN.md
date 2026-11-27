# PLAN — Institute Settings

## Steps

1. **Tests first**
   - `backend/tests/unit/test_admin_settings.py`: nine-key defaults, LMS
     standard defaults, full and partial updates, string storage of booleans and
     ints, out-of-range durations/cancellation/commission, forbidden identity
     keys, role restrictions.
   - `backend/tests/unit/test_maintenance_mode.py`: pass-through when off, `503`
     for authenticated and anonymous non-admins, writes blocked, admin bypass,
     admin login + switch-off recovery, `/health` exemption, message wording.
   - `frontend/tests/unit/admin.settings.test.ts`: academic tab on load, tab
     switching, toggle state and maintenance warning, single-shot `PUT` of nine
     fields, success/error toasts, dismissal, commission/name validation, and no
     admin identity inputs. The duplicated settings block was removed from
     `admin.panel.test.ts`.
2. **Backend**
   - `app/schemas/admin.py`: the nine fields with ranges, `extra="forbid"`,
     `str_strip_whitespace`, `StrictBool` switches.
   - `app/services/platform_settings.py`: new defaults and tolerant parsing.
   - `app/core/maintenance.py`: message now starts with «سامانه».
   - `alembic/versions/0007_institute_settings.py`: rename `platform_name`,
     seed `default_class_duration` / `min_cancellation_hours` /
     `commission_rate`, delete retired keys; reversible.
3. **Frontend**
   - `features/admin/api/settings.ts`: full `PlatformSettings` type.
   - `features/admin/pages/AdminSettingsPage.vue`: academic/financial/system
     tabs (`role="tab"`), paired numeric fields, accessible switches, security
     note, single save button, dismissible toast.
   - `locales/{fa,en}.json`: tab labels, institute labels and hints, maintenance
     warning, security note, and the new validation messages.
4. **Checks**: `pytest -q`, `ruff check`, `alembic upgrade head`, `vitest run`,
   `vite build`.

## Decisions

- **Rename, don't duplicate.** `platform_name` becomes `institute_name` in place
  so existing installations keep the configured name; the migration also drops
  the two settings this product no longer has.
- **Integers for duration, window and commission.** Minutes, hours and whole
  percent keep validation and display unambiguous; no float rounding.
- **Bounded ranges.** 1–1440 minutes, 0–720 hours and 0–100 percent reject
  nonsense before it reaches the database.
- **`StrictBool`.** Loose bools accept `"yes"`, which is a dangerous way to
  receive `maintenance_mode`.
- **Canonical boolean strings.** `str(True)` is `"True"`; storing lowercase keeps
  rows readable and the tolerant parser correct.
- **JWT role for the admin bypass.** The token is signed, so the role claim is
  trustworthy without a second user lookup per request.
- **Login and `/health` stay open** so an admin can unlock the platform and
  monitoring still works.
- **Fail open on read errors** so a settings-table problem cannot become a
  platform-wide outage.

## Dependencies & Rationale

No new dependencies. Pydantic `StrictBool`, Starlette's `BaseHTTPMiddleware`,
existing Lucide icons and the shared `http` client cover the feature.
