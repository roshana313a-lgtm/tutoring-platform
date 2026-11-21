# Software Requirements Specification (SRS)

**Project:** Online Tutoring Platform — Educational Institute
**Document type:** Software Requirements Specification
**Language:** English (actor names include their Persian equivalents used by the institute)

---

## 1. Document control

| Field | Value |
| --- | --- |
| Title | Software Requirements Specification — Online Tutoring Platform |
| Version | 1.0 |
| Status | Draft for review |
| Date | 2026-11-21 |
| Owner | Product / Engineering |
| Prepared by | AI agent acting under `AGENTS.md` |
| Reviewers | Institute management, academic coordinator, engineering lead |
| Approved by | Pending |
| Related documents | `AGENTS.md`, `Task-List.md`, `docs/adr/ADR-001-initial-architecture.md`, `docs/adr/ADR-002-auth-strategy.md`, `features/auth/SPEC.md` |

### 1.1 Change history

| Version | Date | Change | Author |
| --- | --- | --- | --- |
| 1.0 | 2026-11-21 | Initial SRS covering all three actors, shared requirements, NFRs, and phased roadmap | AI agent |

### 1.2 References

- `AGENTS.md` — repository-wide engineering rules, technology stack, and component layout.
- `Task-List.md` — authoritative feature list and current implementation status.
- `features/auth/SPEC.md` — detailed first-feature specification for registration, login, and roles.
- `docs/adr/ADR-001-initial-architecture.md` — FastAPI + Vue 3 + PostgreSQL and layered architecture decision.
- `docs/adr/ADR-002-auth-strategy.md` — JWT access tokens and bcrypt password hashing decision.

---

## 2. Introduction

### 2.1 Purpose

This SRS defines the functional and non-functional requirements for an **online tutoring platform owned and operated by an educational institute**. The platform supports the institute's teaching activity end to end: publishing instructor expertise, matching learners to instructors, scheduling and running live classes, assigning and grading homework, evaluating performance, and tracking each learner's progress and weak areas. It is an **institute-operated learning system with administrative governance**, not a generic marketplace for booking arbitrary services.

The document is the basis for per-feature `SPEC.md` and `PLAN.md` files under `features/`, for test design, and for acceptance review by institute stakeholders.

### 2.2 Scope

**In scope (initial product):**

- Role-based accounts for Student (زبان­آموز), Instructor (مدرس), and Admin (مدیر مؤسسه).
- Instructor profiles with expertise areas, resume, and teaching history.
- Instructor discovery, comparison, rating, and reviews.
- Class booking, instructor class calendar, and online class sessions.
- Homework assignment, submission, grading, and feedback.
- Performance evaluation, learning-progress tracking, and weak-area marking.
- Admin governance: instructor approval, user management, subject/category management, service-quality monitoring, analytics, configuration, and moderation.
- Bilingual user interface (English and Persian) with RTL support for Persian.

**Out of scope (for now):**

- Native mobile applications and native desktop clients.
- Multi-tenant organizations or external marketplace onboarding.
- Calendar synchronization with Google Calendar or Outlook.
- Automated proctoring, AI-generated grading, and certificate issuance.
- Third-party tutor payouts marketplace or public tutor self-signup without institute approval.

### 2.3 Definitions and acronyms

| Term | Definition |
| --- | --- |
| Student (زبان­آموز) | A learner enrolled at the institute who takes online tutoring classes. |
| Instructor (مدرس) | A teacher engaged by the institute whose profile and availability are published on the platform. |
| Admin (مدیر مؤسسه) | Institute staff member responsible for governance, approvals, configuration, and analytics. |
| Expertise area | A subject or skill tag (for example, "IELTS Writing" or "English Grammar") maintained by Admin and assigned to Instructors. |
| Class session | A scheduled, time-bounded live tutoring meeting between an Instructor and one or more Students. |
| Homework | An assignment created by an Instructor for a class or individual Student, with a deadline, instructions, and attachments. |
| Submission | A Student's submitted work for a homework item, graded by the Instructor. |
| Weak area | A competency or topic explicitly marked by an Instructor as needing improvement for a Student. |
| Learning progress | A time-series view of a Student's scores, evaluations, and completed topics. |
| Service quality | Aggregate indicators such as review scores, complaint counts, class completion, and response times used by Admin. |
| SRS | Software Requirements Specification. |
| NFR | Non-functional requirement. |
| RBAC | Role-based access control. |
| RTL | Right-to-left layout used for Persian text. |

---

## 3. Overall description

### 3.1 Actors

**Student (زبان­آموز).** Enrolled learner. Can discover and compare instructors, view teaching credentials, book and join classes, receive and submit homework, view grades, evaluations, progress over time, and weak areas, and rate completed classes.

**Instructor (مدرس).** Approved teacher. Maintains a professional profile with expertise, resume, and teaching history, manages a class calendar, runs online sessions, assigns and grades homework, records performance evaluations, tracks learning progress, and marks weak areas.

**Admin (مدیر مؤسسه).** Institute operator. Manages instructors and students, approves new instructors, maintains the subject/category taxonomy, monitors service quality and platform analytics, configures SMTP/payment/policies, and moderates content.

**External systems** (not actors with logins): SMTP provider, payment gateway, video-conference provider, object storage, and PostgreSQL infrastructure.

### 3.2 Permissions matrix

Legend: **C** = create, **R** = read, **U** = update, **D** = delete, **A** = approve, **M** = moderate, **—** = no access.

| Capability | Student | Instructor | Admin |
| --- | --- | --- | --- |
| Own account profile | R, U | R, U | R, U |
| Register as Student / Instructor | C (self) | C (self, pending approval) | C (staff-created accounts) |
| Instructor approval | — | — | A |
| Instructor expertise, resume, teaching history | R | C, R, U | R, U, M |
| Instructor discovery and comparison | R | R | R |
| Ratings and reviews | C after completed class | R | M |
| Class calendar / availability | R | C, R, U | R |
| Booking a class | C | — | C on behalf of a Student |
| Joining an online session | C (own bookings) | C (own classes) | R (observe/audit) |
| Homework | R, C (submission) | C, R, U (assign/grade) | R, M |
| Grades and feedback | R (own) | C, R, U | R |
| Performance evaluation | R (own) | C, R, U | R |
| Learning progress and weak areas | R (own) | C, R, U | R (aggregate) |
| Subject/category taxonomy | R | R | C, R, U, D |
| Platform configuration (SMTP, payment, policies) | — | — | R, U |
| Service quality monitoring | — | R (own metrics) | R (platform-wide) |
| Platform-wide analytics | — | — | R |
| Moderation | — | — | M |
| Audit log | — | — | R |

### 3.3 System context

```text
                 +---------------------+
                 |  Student (زبان­آموز) |
                 +----------+----------+
                            | discovery, booking, homework, sessions
                            v
+----------------+     +---------------------+     +-------------------+
|  Admin         |---->|  Tutoring Platform  |<---->|  Instructor       |
| (مدیر مؤسسه)   | governance + approval | (مدرس) |
+----------------+     +----+--------+------+     +-------------------+
                            |        |
              +-------------+        +--------------+
              v                                    v
     PostgreSQL 16 (system of record + job queue)   External providers
     (data, background_jobs)                        (SMTP, payment, video, storage)
```

The platform is the single system of record for the institute's online teaching workflow. External providers supply delivery capabilities (email, payments, video, file storage) but do not own pedagogical data.

### 3.4 Assumptions

1. The institute, not individual instructors, owns instructor accounts and approves them before publication.
2. Learners have email addresses and can access a web browser on a desktop or laptop for the MVP; mobile-web is supported responsively but native apps are not.
3. Classes are conducted through an embedded third-party video provider; the platform manages scheduling, joining links, and attendance records, not media transport.
4. Payment for classes is available from phase P2; MVP bookings are recorded without charging.
5. All monetary values and institute policy parameters are configurable by Admin.
6. English and Persian are the supported UI locales at launch; other languages may be added later without schema changes.
7. Grades use a configurable numeric scale with optional written feedback.
8. Instructor availability is expressed in the institute's configured timezone, with learner-local display.
9. No Docker or containers are used in development, CI, or production. Local development uses SQLite by default; staging and production use PostgreSQL 16.

### 3.5 Dependencies

| Dependency | Purpose | Requirement source |
| --- | --- | --- |
| PostgreSQL 16 | System of record for users, profiles, bookings, homework, grades, evaluations | `AGENTS.md`, ADR-001 |
| PostgreSQL 16 background_jobs table | Durable background job queue (emails, reminders) | ADR-0007, SAD v1.1 |
| FastAPI + SQLAlchemy async backend | HTTP API and persistence | ADR-001 |
| Vue 3 + TypeScript frontend | Web UI | ADR-001 |
| JWT + bcrypt | Authentication and password storage | ADR-002, `features/auth/SPEC.md` |
| SMTP provider | Verification, notification, and recovery emails | FR-A-07 |
| Payment gateway | Class payments and refunds | FR-B-16, FR-A-08 |
| Video-conference provider | Live online class sessions | FR-B-06, FR-P-05 |
| Object storage | Resumes, homework attachments, submissions | FR-S-08 |

---

## 4. Shared requirements (FR-S-*)

Common requirements applying to all actors.

| ID | Requirement | Phase |
| --- | --- | --- |
| FR-S-01 | The system shall support registration with email, password, and role, restricted to Student and Instructor self-registration; Admin accounts are created by institute staff. See `features/auth/SPEC.md`. | [MVP] |
| FR-S-02 | The system shall authenticate users by email and password and issue a signed JWT access token carrying user id and role. | [MVP] |
| FR-S-03 | The system shall enforce role-based access control on every protected endpoint and return 401 for missing/invalid tokens and 403 for insufficient role. | [MVP] |
| FR-S-04 | The system shall expose `GET /api/v1/auth/me` returning the authenticated user's safe profile, never the password hash. | [MVP] |
| FR-S-05 | The system shall allow each user to view and update their own basic profile (name, preferred locale, timezone, contact email). | [MVP] |
| FR-S-06 | The system shall hash passwords with bcrypt and never store or return plaintext or hashed passwords in API responses. | [MVP] |
| FR-S-07 | The system shall return a generic 401 response for both unknown email and wrong password at login. | [MVP] |
| FR-S-08 | The system shall provide file upload/download for resumes, homework attachments, and submissions with type and size validation. | [MVP] |
| FR-S-09 | The system shall deliver in-app notifications for booking, homework, grading, and approval events. | [MVP] |
| FR-S-10 | The system shall send transactional email through the Admin-configured SMTP provider. | [P2] |
| FR-S-11 | The system shall support self-service password reset through a signed, expiring email link. | [P2] |
| FR-S-12 | The system shall require email verification before an Instructor profile becomes publicly discoverable. | [P2] |
| FR-S-13 | The system shall maintain an immutable audit log of administrative and pedagogical changes (who, what, when, before/after). | [P2] |
| FR-S-14 | The system shall provide a locale switch between English and Persian, including RTL layout and localized dates, numbers, and currencies. | [MVP] |
| FR-S-15 | The system shall validate all request payloads and return structured 422 errors for invalid input. | [MVP] |
| FR-S-16 | The system shall expose a health endpoint (`GET /health`) for readiness checks. | [MVP] |
| FR-S-17 | The system shall support configurable business policies (booking window, cancellation deadline, late-submission rule) read from Admin configuration. | [P2] |
| FR-S-18 | The system shall apply data-retention and deletion rules for personal data in accordance with institute policy. | [P3] |

---

## 5. Student (زبان­آموز) — journeys and features

### 5.1 User journey

A learner registers as a Student, completes a profile, and lands on an instructor discovery page. They filter instructors by expertise area (for example, IELTS Writing), rating, review count, and availability, then compare two or three profiles side by side. On an instructor profile they read the resume, teaching history, expertise areas, and learner reviews before choosing one. They book a class from the instructor's published calendar and receive a confirmation plus a joining link. Before the class they receive an assigned homework item, submit their work by the deadline, and attend the live session. After the session the instructor records an evaluation, marks weak areas (for example, "conditional sentences"), and publishes a grade with feedback. The learner returns to a personal progress view showing scores and completed topics over time, sees the marked weak areas, and rates the instructor. In later phases the learner can pay for classes, message the instructor, and follow a recommended practice path for weak areas.

### 5.2 Feature list

| ID | Requirement | Phase |
| --- | --- | --- |
| FR-B-01 | A Student shall search and filter instructors by expertise area, rating, review count, language, and availability. | [MVP] |
| FR-B-02 | A Student shall compare at least two instructors side by side on expertise, rating, reviews, teaching history, and availability. | [MVP] |
| FR-B-03 | A Student shall view an instructor's full profile: expertise areas, resume, teaching history, rating, and reviews. | [MVP] |
| FR-B-04 | A Student shall view an instructor's class calendar with available slots in the learner's local timezone. | [MVP] |
| FR-B-05 | A Student shall book an available class slot and receive a confirmation with session details. | [MVP] |
| FR-B-06 | A Student shall join an online class session from the platform at the scheduled time. | [MVP] |
| FR-B-07 | A Student shall view homework assigned to them, including instructions, deadline, and attachments. | [MVP] |
| FR-B-08 | A Student shall submit homework as text and/or file upload before the deadline and receive a submission receipt. | [MVP] |
| FR-B-09 | A Student shall view grades and written feedback for their submissions. | [MVP] |
| FR-B-10 | A Student shall cancel or reschedule a booking within the Admin-configured policy window. | [P2] |
| FR-B-11 | A Student shall view personal progress over time: scores, completed topics, evaluations, and trend charts. | [P2] |
| FR-B-12 | A Student shall view weak areas marked by instructors, with the related evaluation notes. | [P2] |
| FR-B-13 | A Student shall view consolidated performance evaluation reports from instructors. | [P2] |
| FR-B-14 | A Student shall rate and review an instructor after a completed class, with moderation applied before publication. | [P2] |
| FR-B-15 | A Student shall pay for booked classes through the configured payment gateway and view payment history. | [P2] |
| FR-B-16 | A Student shall download class materials and session recordings when the instructor publishes them. | [P2] |
| FR-B-17 | A Student shall message an instructor about class or homework matters. | [P2] |
| FR-B-18 | A Student shall shortlist favorite instructors and receive availability alerts for them. | [P3] |
| FR-B-19 | A Student shall join a waitlist for a fully booked slot and be notified when a place opens. | [P3] |
| FR-B-20 | A Student shall receive recommended practice activities targeted at their weak areas. | [P3] |

---

## 6. Instructor (مدرس) — journeys and features

### 6.1 User journey

A teacher self-registers as an Instructor and submits expertise areas, a resume, and teaching history. Admin reviews and approves the profile; only then is the instructor discoverable. The instructor publishes availability on a class calendar. When a Student books a slot, the instructor sees the booking and prepares the session. In the session they teach through the embedded video provider. Afterwards they assign homework to the individual or class, grade submitted work with feedback, and record a performance evaluation that includes a score, completed topics, and explicitly marked weak areas. Over time the instructor opens a Student's progress view to see whether the marked weak areas improve, adjusting subsequent teaching. The instructor can view their own rating and reviews, while Admin monitors the same data for service quality.

### 6.2 Feature list

| ID | Requirement | Phase |
| --- | --- | --- |
| FR-P-01 | An Instructor shall create and maintain a profile with expertise areas, bio, languages, and teaching focus. | [MVP] |
| FR-P-02 | An Instructor shall upload a resume and record teaching history (institutions, courses, years, student levels). | [MVP] |
| FR-P-03 | An Instructor shall submit the profile for Admin approval and remain undiscoverable until approved. | [MVP] |
| FR-P-04 | An Instructor shall manage a class calendar by publishing recurring availability and blocking unavailable slots. | [MVP] |
| FR-P-05 | An Instructor shall view bookings for their classes and see enrolled Students. | [MVP] |
| FR-P-06 | An Instructor shall conduct an online class session and start it from the scheduled booking. | [MVP] |
| FR-P-07 | An Instructor shall assign homework to a class or individual Student with instructions, deadline, and attachments. | [MVP] |
| FR-P-08 | An Instructor shall grade Student submissions with a numeric score and written feedback. | [MVP] |
| FR-P-09 | An Instructor shall record a performance evaluation for a Student after a class, including score and completed topics. | [MVP] |
| FR-P-10 | An Instructor shall mark weak areas for a Student and attach an explanatory note. | [MVP] |
| FR-P-11 | An Instructor shall view the learning progress of an assigned Student over time, including the effect of previously marked weak areas. | [P2] |
| FR-P-12 | An Instructor shall view their own rating, review count, and review text. | [P2] |
| FR-P-13 | An Instructor shall add or update teaching-history entries automatically referenced when a class is completed. | [P2] |
| FR-P-14 | An Instructor shall publish class materials and session recordings to enrolled Students. | [P2] |
| FR-P-15 | An Instructor shall respond to Students about homework or classes through platform messaging. | [P2] |
| FR-P-16 | An Instructor shall define one-time availability exceptions and time-off periods. | [P2] |
| FR-P-17 | An Instructor shall reuse homework templates and grade with a rubric. | [P3] |
| FR-P-18 | An Instructor shall export grades and evaluation records for institute reporting. | [P3] |
| FR-P-19 | An Instructor shall request correction of an inaccurate review through moderation. | [P3] |

---

## 7. Admin (مدیر مؤسسه) — journeys and features

### 7.1 User journey

An institute manager signs in with the Admin role and opens a dashboard. New instructor applications are first in the queue: the manager checks submitted expertise, resume, and teaching history, then approves or rejects with a reason. Only approved instructors appear in student discovery. The manager maintains the subject and expertise taxonomy so discovery filters stay accurate. On a daily basis the manager monitors service quality — review trends, unresolved complaints, cancelled classes, and grading timeliness — and reviews platform-wide analytics such as active learners, class volume, and completion rates. When a profile or review is reported, the manager moderates it. The manager configures platform parameters: SMTP for notifications, payment gateway credentials, and booking/cancellation/grading policies. The manager also manages Student and Instructor accounts (including suspension), audits sensitive changes, and exports reports for institute planning.

### 7.2 Feature list

| ID | Requirement | Phase |
| --- | --- | --- |
| FR-A-01 | Admin shall view, edit, suspend, and reinstate Student accounts. | [MVP] |
| FR-A-02 | Admin shall view, edit, suspend, and reinstate Instructor accounts. | [MVP] |
| FR-A-03 | Admin shall approve or reject Instructor applications with a recorded reason; rejected or pending instructors are not discoverable. | [MVP] |
| FR-A-04 | Admin shall create and manage the subject/category/expertise taxonomy used in profiles and discovery. | [MVP] |
| FR-A-05 | Admin shall view all instructor profiles, resumes, and teaching-history records for verification. | [MVP] |
| FR-A-06 | Admin shall create Admin accounts and assign roles for institute staff. | [P2] |
| FR-A-07 | Admin shall configure SMTP settings (host, port, credentials, sender) and send a test email. | [P2] |
| FR-A-08 | Admin shall configure payment-gateway credentials, currency, and enabled payment methods. | [P2] |
| FR-A-09 | Admin shall configure platform policies for booking window, cancellation deadline, late submissions, and refunds. | [P2] |
| FR-A-10 | Admin shall monitor service quality through review scores, complaint counts, cancellation rates, and instructor response times. | [P2] |
| FR-A-11 | Admin shall view platform-wide analytics: active Students, active Instructors, bookings, completed classes, revenue, and progress metrics. | [P2] |
| FR-A-12 | Admin shall moderate instructor profiles, reviews, homework content, and submitted files, including hide/remove actions with a reason. | [P2] |
| FR-A-13 | Admin shall configure notification templates for email and in-app events. | [P2] |
| FR-A-14 | Admin shall monitor system health indicators (API availability, queue depth, job failures). | [P2] |
| FR-A-15 | Admin shall view the audit log and filter it by actor, action, entity, and date range. | [P3] |
| FR-A-16 | Admin shall export platform reports and analytics to CSV for institute planning. | [P3] |
| FR-A-17 | Admin shall define custom roles and fine-grained permission sets beyond the three default roles. | [P3] |
| FR-A-18 | Admin shall manage data-retention and deletion schedules for personal data. | [P3] |

---

## 8. Non-functional requirements (NFR-*)

| ID | Category | Requirement |
| --- | --- | --- |
| NFR-01 | Performance | Read endpoints (profile, progress, homework lists) shall respond within 300 ms at p95 under normal load. |
| NFR-02 | Performance | Instructor search and comparison shall respond within 800 ms at p95 for 10,000 instructor records. |
| NFR-03 | Performance | File upload and download shall stream without loading whole files into application memory. |
| NFR-04 | Security | All traffic shall use TLS in production; credentials, tokens, and payment configuration shall never appear in logs or API responses. |
| NFR-05 | Security | Passwords shall be bcrypt-hashed and access tokens JWT-signed with a configurable secret and expiry (ADR-002). |
| NFR-06 | Security | RBAC shall be enforced server-side on every protected endpoint; client-side hiding is not access control. |
| NFR-07 | Security | Uploaded files shall be type-checked, size-limited, stored outside the web root, and served through authorized endpoints. |
| NFR-08 | Security | Login and registration endpoints shall be rate-limited to slow credential-stuffing and abuse. |
| NFR-09 | Scalability | The API shall be stateless so it can scale horizontally; background jobs and queue state shall live in PostgreSQL via the outbox pattern. |
| NFR-10 | Scalability | Database access shall use async SQLAlchemy with connection pooling and indexed lookups on email, role, expertise, and booking time. |
| NFR-11 | Availability | The platform shall target 99.5% monthly availability excluding scheduled maintenance and third-party video outages. |
| NFR-12 | Accessibility | The web UI shall meet WCAG 2.1 Level AA: keyboard navigation, visible focus, sufficient contrast, labels, and error announcements. |
| NFR-13 | Accessibility | Live captions or transcripts shall be available when supported by the selected video provider; the UI shall surface the control. |
| NFR-14 | i18n | The UI shall support English (LTR) and Persian (RTL) with a locale switch, localized dates/numbers/currency, and no hardcoded user-facing strings. |
| NFR-15 | i18n | User-generated content (names, reviews, feedback) shall be stored as UTF-8 and displayed without layout breakage in either locale. |
| NFR-16 | Maintainability | Every feature shall have `SPEC.md` and `PLAN.md`; changes shall be TDD-driven with lint, type-check, and test in CI. |
| NFR-17 | Auditability | Administrative approvals, moderation actions, and grade changes shall be attributable to an actor and timestamp. |
| NFR-18 | Testability | Integration tests shall run against ephemeral databases; CI shall not depend on developer-local services. |
| NFR-19 | Observability | Structured logs and metrics shall cover request latency, error rate, background-job failures, and queue depth. |
| NFR-20 | Backup | PostgreSQL data shall have daily backups with a tested restore procedure owned by the institute. |

---

## 9. Constraints

1. **Technology:** Python 3.12+, FastAPI async, SQLAlchemy 2.0 async, Alembic, PostgreSQL 16, Vue 3, TypeScript strict, Vite, Pinia, Vitest, Playwright (`AGENTS.md`).
2. **Architecture:** Layered backend Router → Service → Repository → Model; domain layer must not import web or persistence frameworks (ADR-001).
3. **Delivery:** Web application only; no native mobile or desktop clients in this phase.
4. **Tenancy:** Single institute tenant; no multi-organization support.
5. **Integrations:** No Google/Outlook calendar sync; video, SMTP, and payment are external providers selected by the institute.
6. **Governance:** Instructors cannot be publicly visible before Admin approval; the institute owns account and content moderation.
7. **Dependencies:** Every new dependency must be justified in the active feature's `PLAN.md` under "Dependencies & Rationale".
8. **Quality gate:** No feature is complete until its tests, lint, type-check, and documentation are updated.
9. **Resources:** Institute-provided SMTP, payment, video, and storage accounts are prerequisites for P2 features.
10. **Localization:** English and Persian are the only launch locales.

---

## 10. Feature catalog with phase tags

### 10.1 Shared

| ID | Feature | Phase |
| --- | --- | --- |
| FR-S-01 | Registration and roles | [MVP] |
| FR-S-02 | Email/password login with JWT | [MVP] |
| FR-S-03 | Role-based access control | [MVP] |
| FR-S-04 | Current-user endpoint | [MVP] |
| FR-S-05 | Own profile management | [MVP] |
| FR-S-06 | Bcrypt password storage | [MVP] |
| FR-S-07 | Generic bad-credentials response | [MVP] |
| FR-S-08 | File upload/download | [MVP] |
| FR-S-09 | In-app notifications | [MVP] |
| FR-S-10 | Transactional SMTP email | [P2] |
| FR-S-11 | Password reset | [P2] |
| FR-S-12 | Email verification | [P2] |
| FR-S-13 | Audit log | [P2] |
| FR-S-14 | English/Persian locale switch and RTL | [MVP] |
| FR-S-15 | Structured validation errors | [MVP] |
| FR-S-16 | Health endpoint | [MVP] |
| FR-S-17 | Configurable business policies | [P2] |
| FR-S-18 | Data retention and deletion | [P3] |

### 10.2 Student (زبان­آموز)

| ID | Feature | Phase |
| --- | --- | --- |
| FR-B-01 | Instructor search and filters | [MVP] |
| FR-B-02 | Instructor comparison | [MVP] |
| FR-B-03 | Instructor profile, resume, history, reviews | [MVP] |
| FR-B-04 | Instructor class calendar | [MVP] |
| FR-B-05 | Book a class | [MVP] |
| FR-B-06 | Join online session | [MVP] |
| FR-B-07 | View homework | [MVP] |
| FR-B-08 | Submit homework | [MVP] |
| FR-B-09 | View grades and feedback | [MVP] |
| FR-B-10 | Cancel/reschedule booking | [P2] |
| FR-B-11 | Personal progress over time | [P2] |
| FR-B-12 | View weak areas | [P2] |
| FR-B-13 | Performance evaluation reports | [P2] |
| FR-B-14 | Rate and review instructor | [P2] |
| FR-B-15 | Payments and payment history | [P2] |
| FR-B-16 | Class materials and recordings | [P2] |
| FR-B-17 | Messaging instructor | [P2] |
| FR-B-18 | Favorites and availability alerts | [P3] |
| FR-B-19 | Waitlist | [P3] |
| FR-B-20 | Recommended practice for weak areas | [P3] |

### 10.3 Instructor (مدرس)

| ID | Feature | Phase |
| --- | --- | --- |
| FR-P-01 | Profile with expertise areas | [MVP] |
| FR-P-02 | Resume and teaching history | [MVP] |
| FR-P-03 | Submit for Admin approval | [MVP] |
| FR-P-04 | Class calendar and availability | [MVP] |
| FR-P-05 | View bookings | [MVP] |
| FR-P-06 | Conduct online session | [MVP] |
| FR-P-07 | Assign homework | [MVP] |
| FR-P-08 | Grade submissions | [MVP] |
| FR-P-09 | Record performance evaluation | [MVP] |
| FR-P-10 | Mark weak areas | [MVP] |
| FR-P-11 | Track learning progress | [P2] |
| FR-P-12 | View own rating and reviews | [P2] |
| FR-P-13 | Teaching history updates | [P2] |
| FR-P-14 | Materials and recordings | [P2] |
| FR-P-15 | Messaging Students | [P2] |
| FR-P-16 | Availability exceptions | [P2] |
| FR-P-17 | Homework templates and rubrics | [P3] |
| FR-P-18 | Export grades/evaluations | [P3] |
| FR-P-19 | Dispute a review | [P3] |

### 10.4 Admin (مدیر مؤسسه)

| ID | Feature | Phase |
| --- | --- | --- |
| FR-A-01 | Manage Students | [MVP] |
| FR-A-02 | Manage Instructors | [MVP] |
| FR-A-03 | Approve/reject instructors | [MVP] |
| FR-A-04 | Manage subjects/categories | [MVP] |
| FR-A-05 | Verify profiles and credentials | [MVP] |
| FR-A-06 | Manage Admin accounts and roles | [P2] |
| FR-A-07 | SMTP configuration | [P2] |
| FR-A-08 | Payment configuration | [P2] |
| FR-A-09 | Policy configuration | [P2] |
| FR-A-10 | Service-quality monitoring | [P2] |
| FR-A-11 | Platform-wide analytics | [P2] |
| FR-A-12 | Moderation | [P2] |
| FR-A-13 | Notification templates | [P2] |
| FR-A-14 | System-health monitoring | [P2] |
| FR-A-15 | Audit log viewer | [P3] |
| FR-A-16 | Report export | [P3] |
| FR-A-17 | Custom roles and permissions | [P3] |
| FR-A-18 | Retention configuration | [P3] |

---

## 11. Phase roadmap

### Phase MVP — core teaching loop

Goal: an institute-approved instructor can publish availability, a Student can discover and book, a class can be held, homework can be submitted and graded, and an evaluation with weak areas can be recorded.

- Shared: FR-S-01 … FR-S-09, FR-S-14 … FR-S-16.
- Student: FR-B-01 … FR-B-09.
- Instructor: FR-P-01 … FR-P-10.
- Admin: FR-A-01 … FR-A-05.
- NFR focus: NFR-01, NFR-02, NFR-04 … NFR-08, NFR-12, NFR-14, NFR-16.

### Phase P2 — measurement, payments, and governance

Goal: close the feedback loop with progress analytics, add money and notifications, and give Admin operational control.

- Shared: FR-S-10 … FR-S-13, FR-S-17.
- Student: FR-B-10 … FR-B-17.
- Instructor: FR-P-11 … FR-P-16.
- Admin: FR-A-06 … FR-A-14.
- NFR focus: NFR-09 … NFR-11, NFR-13, NFR-17 … NFR-20.

### Phase P3 — depth and automation

Goal: advanced personalization, fine-grained administration, and data portability.

- Shared: FR-S-18.
- Student: FR-B-18 … FR-B-20.
- Instructor: FR-P-17 … FR-P-19.
- Admin: FR-A-15 … FR-A-18.
- NFR focus: continued accessibility and localization refinement, advanced analytics.

---

## 12. Open questions

| # | Question | Owner | Affects |
| --- | --- | --- | --- |
| Q-01 | Which video-conference provider will the institute use, and does it support captions and recordings? | Institute management | FR-B-06, FR-P-06, FR-B-16, NFR-13 |
| Q-02 | Which payment gateway, currency, and refund policy apply? | Finance / Admin | FR-B-15, FR-A-08, FR-A-09 |
| Q-03 | Which SMTP provider and sender domain will be used? | IT | FR-S-10, FR-A-07 |
| Q-04 | What is the exact list of subjects/expertise areas at launch? | Academic coordinator | FR-A-04, FR-B-01 |
| Q-05 | What are the instructor approval criteria (certificates, interview, sample lesson)? | Academic coordinator | FR-A-03, FR-P-03 |
| Q-06 | What grading scale and rubric format should be used? | Academic coordinator | FR-P-08, FR-B-09, FR-P-17 |
| Q-07 | Who defines and maintains the weak-area taxonomy per course? | Academic coordinator | FR-P-10, FR-B-12, FR-B-20 |
| Q-08 | Are reviews published immediately or after moderation? | Institute management | FR-B-14, FR-A-12, FR-P-12 |
| Q-09 | What is the maximum booking horizon and cancellation window? | Institute management | FR-S-17, FR-B-10, FR-A-09 |
| Q-10 | Can one class include multiple Students, and what are the group-size limits? | Academic coordinator | FR-B-05, FR-P-05, FR-P-07 |
| Q-11 | Is course content limited to language training, or also other subjects? | Institute management | Scope, FR-A-04 |
| Q-12 | What data-retention period applies to submissions, grades, and audit logs? | Legal / IT | FR-S-18, FR-A-18 |
| Q-13 | Who owns Persian translation review and terminology consistency? | Institute management | FR-S-14, NFR-14 |
| Q-14 | Are session recordings stored by the video provider or the platform? | IT | FR-B-16, NFR-07 |
| Q-15 | What availability timezone should be the institute default? | Institute management | FR-B-04, FR-P-04 |

---

**End of SRS v1.0.** Each requirement in this document is intended to be refined into a per-feature `SPEC.md` and implementation `PLAN.md` before work begins, per `AGENTS.md`.
