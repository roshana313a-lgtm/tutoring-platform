# ADR-012: Booking Slot Reservation

## Status

Accepted

## Date

2026-11-21

## Deciders

Engineering lead, product owner, academic coordinator, institute IT administrator.

## Related

- ADR-005 (database portability) — the reservation table must behave identically on SQLite and PostgreSQL 16.
- ADR-007 (background jobs via DB outbox) — confirmation/reminder jobs are enqueued only after a successful reservation.
- `docs/requirements/SRS.md` FR-B-04, FR-B-05, FR-B-10, FR-P-04, FR-A-09 — class calendar, booking, cancellation, and policy configuration.

## Context

A Student books a slot from an Instructor's published class calendar. Two Students may try to reserve the same slot at the same moment, and a booking must never be double-sold. Redis is not available, so a distributed lock is not an option. The solution must work on SQLite in local development and unit tests and on PostgreSQL 16 in staging and production, with the same observable behavior.

Application-level "check then insert" logic is unsafe because a concurrent request can pass the check before either row is committed. Time-limited locks introduce expiry races and lost-lock failure modes that are hard to reason about and test.

## Decision

Booking slot reservation uses a dedicated `booking_slots` table with a unique constraint:

```text
UNIQUE (class_session_id, start_at)
```

No distributed lock, no Redis, no TTL.

Implementation rules:

1. **Atomic insert.** Reserving a slot is a single `INSERT` into `booking_slots`. A successful insert means the slot is held.
2. **Conflict mapping.** A unique-constraint violation means the slot is already taken; the API translates it to `HTTP 409 Conflict` with a clear message. There is no pre-check that authorizes a write.
3. **Cancellation releases in the same transaction.** Cancelling a booking deletes its `booking_slots` row and updates the booking status in one transaction, so the slot cannot remain blocked after cancellation or be released when cancellation fails.
4. **Dialect equivalence.** The mechanism is identical on SQLite (single-writer serialization) and PostgreSQL 16 (MVCC with unique-index enforcement). No dialect-specific locking code is needed.
5. **No TTLs or locks.** There is no reservation expiry, lease renewal, or lock owner to lose. A reservation is released only by an explicit cancellation or by a state transition defined in the booking policy.
6. **Outbox integration.** Confirmation and reminder jobs (ADR-007) are inserted in the same transaction as the slot row, so a confirmed booking always has its notifications queued.

## Consequences

### Positive

- Double-booking is prevented by a database constraint rather than application discipline.
- The same code path and semantics work on both supported dialects.
- No external lock service, TTL tuning, or lock-recovery logic is required.
- `HTTP 409` is deterministic and easy to test.
- Cancellation cannot leak a held slot because release is transactional.

### Negative

- The unique constraint encodes one reservation per `(class_session_id, start_at)`; group classes with multiple seats require a different design (for example, a `seat_no` column added to the key) and an ADR update.
- Unique violations are an expected control-flow path and must be caught precisely, not logged as unexpected 500 errors.
- High contention produces failed inserts rather than queued waiting; the UI must handle 409 by offering alternatives.

### Neutral

- Slot duration and overlap rules remain a policy concern in the service layer; the constraint protects the exact key written.
- The reservation row is small and can be indexed further for calendar reads without changing the conflict rule.
- Absence of TTL means abandoned bookings need an explicit policy-driven release job when that feature is introduced.

## Alternatives Considered

- **Redis distributed lock:** rejected because Redis is disallowed by current architecture decisions and locks can be lost or expire mid-booking.
- **Application-level check-then-insert:** rejected as race-prone; it cannot guarantee uniqueness under concurrency.
- **Optimistic version column on the class session:** rejected because it does not naturally express one-slot-per-time and would still need a conflict rule.
- **`SERIALIZABLE` transactions for all bookings:** rejected because it is heavier than a unique constraint and behaves differently on SQLite.
- **TTL-based tentative reservations:** rejected due to expiry races, cleanup complexity, and the need for lock renewal.
