# PLAN — Admin Settings Page

## Steps

1. **Tests first**
   - `backend/tests/unit/test_admin_settings.py`: extend the contract to the
     eight settings, strict boolean handling, string storage of booleans, and
     rejection of `email`/`role`/unknown keys.
   - `backend/tests/unit/test_maintenance_mode.py`: pass-through when off, `503`
     for authenticated and anonymous non-admins, admin bypass, admin login and
     switch-off recovery, `/health` exemption.
   - `frontend/tests/unit/admin.settings.test.ts`: tab rendering and switching,
     toggle states and maintenance warning, one-shot `PUT` with every field,
     success/error toasts, dismiss, client-side validation, and the absence of
     admin email/role inputs.
2. **Backend**
   - `app/schemas/admin.py`: add the new fields, `extra="forbid"`,
     `str_strip_whitespace`, `StrictBool` for the two switches.
   - `app/services/platform_settings.py`: extend `DEFAULT_SETTINGS`, tolerant
     int/bool parsing, `to_stored_value` (booleans stored as `true`/`false`),
     `is_maintenance_mode`.
   - `app/api/v1/admin.py`: serialize updates through `to_stored_value`.
   - `app/core/maintenance.py`: `MaintenanceModeMiddleware`, reading the flag
     through the app's session provider (respects `dependency_overrides`), with
     a fail-open guard.
   - `app/main.py`: register the middleware before CORS so CORS stays outermost;
     map `503` to `SERVICE_UNAVAILABLE`.
   - `alembic/versions/0006_expand_platform_settings.py`: seed the five new keys;
     `downgrade()` removes them.
3. **Frontend**
   - `features/admin/api/settings.ts`: full `PlatformSettings` type; `PUT` sends
     the whole object.
   - `features/admin/pages/AdminSettingsPage.vue`: tab list (`role="tab"`),
     per-tab panels (`v-if`), accessible switches, security note, single save
     button, dismissible toast (`role="status"`/`role="alert"`).
   - `locales/fa.json`, `locales/en.json`: tab labels, new field labels, hints,
     maintenance warning, security note, and the three new validation messages.
4. **Checks**: `python -m pytest -q`, `ruff check`, `alembic upgrade head`,
   `vitest run`, `vite build`.

## Decisions

- **Key-value table kept.** Settings are heterogeneous scalars; adding columns
  would force a schema change per setting. The `value` column is already 1024
  chars, so the 1000-char description fits without a migration on the table.
- **`StrictBool`.** Pydantic's loose bool accepts `"yes"`/`"no"`, which is a
  dangerous way to receive `maintenance_mode`; strict mode only takes real JSON
  booleans (the frontend sends booleans).
- **Canonical boolean strings.** `str(True)` is `"True"`; storing lowercase
  keeps rows readable and the tolerant parser correct.
- **JWT role for the bypass.** The token is signed, so the role claim is
  trustworthy without a second user lookup on every request; a demoted admin's
  token already grants admin access until it expires anyway.
- **Login and `/health` stay open.** Otherwise nobody can sign in to turn
  maintenance off, and monitoring cannot see the service.
- **Fail open on read errors.** A settings-table problem must not turn into a
  platform-wide outage.
- **Toast instead of banners.** The page keeps its state between tabs, so a
  transient toast avoids pushing the form around after each save.

## Dependencies & Rationale

No new dependencies. Pydantic `StrictBool`, Starlette's
`BaseHTTPMiddleware`, existing Lucide icons and the shared `http` client cover
the feature.
