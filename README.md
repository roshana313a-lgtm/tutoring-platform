# Online Tutoring Platform

An online tutoring platform for an educational institute, supporting students, instructors, and admins.

## Creating the first admin

Public registration only creates students and instructors, so the initial admin account is seeded
by a script. From the `backend` directory, with the schema already migrated:

```bash
cd backend
python -m alembic upgrade head
python seed_admin.py
```

The script creates `admin@institute.com` (password `Admin@1234`, role `admin`, full name
`System Administrator`) and prints the result. It is idempotent: if an admin already exists it
changes nothing, so it is safe to re-run. Change the password after the first login.
