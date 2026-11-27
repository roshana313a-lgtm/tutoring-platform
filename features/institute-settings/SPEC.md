# Institute Settings (Language Institute / LMS Standards)

The admin settings page carried product-agnostic keys (`platform_name`,
`platform_description`, `min_withdrawal_amount`). A language institute thinks in
class lengths, cancellation windows and its own commission, so the settings
contract now mirrors those categories.

## Actors

| Role | Capability |
| --- | --- |
| Admin | Read and update every institute setting, switch maintenance mode on/off |
| Student / Instructor | Use the API while maintenance mode is off; receive `503` while it is on |

## Settings contract

`GET /api/v1/admin/settings` and `PUT /api/v1/admin/settings` (admin only,
partial update, merged response) share one payload:

### Academic (آموزشی)

| Key | Type | Validation | Default |
| --- | --- | --- | --- |
| `institute_name` | string | 1–120 chars, trimmed | `مؤسسه آموزش آنلاین` |
| `support_email` | email | valid email address | `support@institute.com` |
| `default_class_duration` | int | 1–1440 minutes | `60` |
| `min_cancellation_hours` | int | 0–720 hours | `24` |

### Financial (مالی)

| Key | Type | Validation | Default |
| --- | --- | --- | --- |
| `default_hourly_rate` | int | 0 … 1e9 | `250000` |
| `currency` | string | 1–16 chars, trimmed | `تومان` |
| `commission_rate` | int | 0–100 percent | `10` |

### System (سیستمی)

| Key | Type | Validation | Default |
| --- | --- | --- | --- |
| `enable_email_notifications` | bool | strict boolean | `true` |
| `maintenance_mode` | bool | strict boolean | `false` |

- Unknown keys are rejected (`extra="forbid"`), so the page can never write the
  admin's own `email` or `role`; that belongs to the profile page.
- Values live as strings in the existing `platform_settings` table. Migration
  `0007_institute_settings` renames `platform_name` to `institute_name` keeping
  the stored value, seeds the three new numeric keys, and deletes the retired
  `platform_description` / `min_withdrawal_amount` rows.
- Reading tolerates missing or garbled rows by falling back to the defaults.

## Maintenance mode

`MaintenanceModeMiddleware` guards every `/api/...` request:

1. `/health` and `POST /api/v1/auth/login` always pass, so an admin can sign in
   and switch the mode off.
2. Requests with a verified `admin` role token always pass.
3. Otherwise, when the stored flag is true, the answer is `503` with code
   `MAINTENANCE_MODE` and the message
   «سامانه موقتاً در حال به‌روزرسانی است. لطفاً بعداً مراجعه کنید.».
4. If the flag cannot be read, the middleware fails open.

## UI

`/dashboard/admin/settings` has three tabs:

- «آموزشی»: institute name, support email, class duration (minutes), free
  cancellation window (hours).
- «مالی»: default hourly rate, currency, institute commission (%).
- «سیستم»: email-notification and maintenance-mode switches, with a warning
  banner while maintenance is on, plus the note that the admin's email/role is
  edited on the profile page.
- One «ذخیره تغییرات» button saves all nine fields in a single `PUT` and reports
  the outcome in a dismissible toast; the failing tab is selected automatically
  when client-side validation rejects a value.

## Out of scope

- Editing the signed-in admin's email, password or role from this page.
- Per-instructor commission overrides or tax handling.
- Scheduling maintenance windows.
