# Admin Settings Page (Professional, Categorized)

The admin settings page only exposed three flat fields (platform name, default
hourly rate, support email). Running the institute needs more knobs: a public
description, the money unit, a payout floor, notification preferences and a
maintenance switch. This feature expands the settings contract and rebuilds the
page as three categories, and makes maintenance mode actually gate the API.

## Actors

| Role | Capability |
| --- | --- |
| Admin | Read and update every platform setting, switch maintenance mode on/off |
| Student / Instructor | Keep using the API while maintenance mode is off; receive `503` while it is on |

## Settings contract

`GET /api/v1/admin/settings` (admin) and `PUT /api/v1/admin/settings` (admin,
partial update, merged response) share one payload:

| Key | Type | Validation | Default |
| --- | --- | --- | --- |
| `platform_name` | string | 1–120 chars, trimmed | `مؤسسه آموزش آنلاین` |
| `support_email` | email | valid email address | `support@institute.com` |
| `platform_description` | string | ≤ 1000 chars, trimmed | `""` |
| `default_hourly_rate` | int | 0 … 1e9 | `250000` |
| `currency` | string | 1–16 chars, trimmed | `تومان` |
| `min_withdrawal_amount` | int | 0 … 1e9 | `0` |
| `enable_email_notifications` | bool | strict boolean | `true` |
| `maintenance_mode` | bool | strict boolean | `false` |

- Unknown keys are rejected (`extra="forbid"`), so the page can never write the
  admin's own `email` or `role`; that stays on the profile page.
- Values live in the existing `platform_settings` key-value table as strings
  (`true`/`false` for booleans), so no column change was needed; migration
  `0006_expand_platform_settings` seeds the five new keys.
- Reading tolerates missing or garbled rows by falling back to the defaults.

## Maintenance mode

`MaintenanceModeMiddleware` runs on every `/api/...` request:

1. `/health` and `POST /api/v1/auth/login` always pass, so an admin can sign in
   and switch the mode off again.
2. Requests whose Bearer token has the verified `admin` role always pass.
3. Otherwise, if the stored `maintenance_mode` flag is true, the request is
   answered with `503` and code `MAINTENANCE_MODE`, message
   «سیستم موقتاً در حال به‌روزرسانی است. لطفاً بعداً مراجعه کنید.».
4. If the flag cannot be read (database hiccup) the middleware fails open.

## UI

`/dashboard/admin/settings` becomes a tabbed page:

- «عمومی»: platform name, support email, description textarea.
- «مالی»: default hourly rate, currency, minimum withdrawal.
- «سیستم»: email-notification and maintenance-mode switches, with a warning
  banner while maintenance is on, plus a note that the admin's email/role is
  edited on the profile page.
- One «ذخیره تغییرات» button saves every field in a single `PUT` and reports the
  outcome in a dismissible toast (success or error).
- Validation runs client-side first; the failing tab is selected automatically.

## Out of scope

- Editing the signed-in admin's email, password or role from this page.
- Scheduling maintenance windows, or a separate admin-only maintenance banner
  for other admins.
- Per-user notification preferences (this is the platform-wide default).
