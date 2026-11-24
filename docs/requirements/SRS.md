# Software Requirements Specification (SRS)
## Online Tutoring Platform — Educational Institute

**Document type:** Software Requirements Specification  
**Version:** 1.1  
**Status:** Draft for stakeholder review  
**Date:** 2026-11-24  
**Owner:** Product / Engineering  
**Prepared by:** Project team  
**Reviewers:** Institute management, academic coordinator, engineering lead  
**Approved by:** Pending  
**Supersedes:** SRS v1.0 dated 2026-11-21

---

## 1. Document control

### 1.1 Change history

| Version | Date | Change | Author |
|---|---|---|---|
| 1.0 | 2026-11-21 | Initial SRS covering actors, functional requirements, NFRs, and roadmap | Project team |
| 1.1 | 2026-11-24 | Clarified dashboards, booking and class lifecycle, attendance, homework lifecycle, complaints, authorization, file security, NFR verification, phase consistency, and open decisions | Project team |

### 1.2 References

- `AGENTS.md` — repository-wide engineering rules, technology stack, and component layout.
- `Task-List.md` — feature list and implementation status.
- `features/auth/SPEC.md` — registration, login, and roles.
- `docs/adr/ADR-001-initial-architecture.md` — architecture decision.
- `docs/adr/ADR-002-auth-strategy.md` — authentication strategy.

### 1.3 Document conventions

- **Shall** indicates a mandatory, testable requirement.
- **Should** indicates a recommended requirement that may be deferred with an explicit reason.
- **May** indicates an optional capability.
- `[MVP]`, `[P2]`, and `[P3]` identify delivery priority, not implementation order within a phase.
- Requirements are subject to stakeholder approval. Unresolved policy choices are recorded in Section 15 and must not be silently assumed during implementation.
- Existing requirement identifiers from v1.0 are retained where their meaning remains applicable. New requirements use new identifiers.

---

## 2. Introduction

### 2.1 Purpose

This SRS defines the functional and non-functional requirements for an **online tutoring platform owned and operated by an educational institute**. The platform supports the institute's teaching workflow: instructor profile management, instructor discovery, scheduling, online classes, homework, grading, performance evaluation, learner progress, and administrative governance.

This is an institute-operated learning system, not an open marketplace where arbitrary tutors independently sell services. The institute controls instructor approval, platform policies, and moderation.

This document is the baseline for feature-level `SPEC.md` and `PLAN.md` documents, test design, implementation review, and stakeholder acceptance.

### 2.2 Scope

**In scope**

- Accounts and role-based access for Student (زبانآموز), Instructor (مدرس), and Admin (مدیر مؤسسه).
- Instructor profiles, expertise, resumes, and teaching history.
- Instructor discovery, filtering, comparison, ratings, and reviews.
- Instructor availability, booking, class scheduling, and online session access.
- Class status and attendance records.
- Homework creation, submission, grading, and feedback.
- Student evaluations, learning progress, and weak areas.
- Admin dashboards, account governance, instructor approval, taxonomy management, complaints, moderation, and operational reporting.
- English and Persian interface support, including Persian RTL layout.
- Secure file handling for resumes, homework attachments, and submissions.

**Out of scope for the current product**

- Native mobile applications and native desktop clients.
- Multi-tenant organizations.
- Google Calendar or Outlook synchronization.
- Automated proctoring, AI-generated grading, and certificate issuance.
- Third-party tutor payout marketplace.
- Public instructor discovery before institute approval.

### 2.3 Definitions

| Term | Definition |
|---|---|
| Student | A learner enrolled at the institute. |
| Instructor | A teacher engaged by the institute and subject to institute approval. |
| Admin | Institute staff member responsible for governance, approvals, configuration, and oversight. |
| Expertise area | A subject or skill maintained by Admin and assigned to Instructors. |
| Course | A defined learning offering or subject/course context. Its exact relationship to individual bookings must be confirmed by the institute. |
| Booking | A Student's reservation request for a time slot with an Instructor. |
| Class session | A scheduled, time-bounded live teaching event. It may be associated with one or more Students only if the institute approves group classes. |
| Enrollment | A Student's participation relationship with a Course or group offering, if such offerings are supported. |
| Availability slot | A time interval an Instructor publishes as potentially bookable. |
| Time-off | An Instructor-defined interval during which they are unavailable. |
| Homework | An assignment created by an Instructor for one or more eligible Students. |
| Submission | A Student's response to a Homework item. |
| Evaluation | An Instructor's structured assessment of a Student's performance. |
| Weak area | A topic or competency explicitly identified as needing improvement. |
| Complaint | A concern submitted by a Student or Instructor about a class, user, content, or platform operation. |
| Audit event | A traceable record of a security-sensitive or business-significant action. |
| RBAC | Role-based access control. |
| IDOR | Insecure direct object reference; unauthorized access to another user's object by manipulating an identifier. |
| RTL | Right-to-left layout used for Persian text. |

---

## 3. Overall description

### 3.1 Product perspective

The platform is the institute's system of record for its online teaching workflow. PostgreSQL stores core business and pedagogical data. External providers may deliver email, payment, video conferencing, and object storage, but the platform remains responsible for authorization, scheduling, and academic records.

### 3.2 Actors

**Student (زبانآموز):** Manages their profile, discovers and compares approved instructors, books eligible classes, joins their own sessions, accesses homework, submits work, views grades and evaluations, tracks progress, and submits eligible reviews or complaints.

**Instructor (مدرس):** Maintains a professional profile, submits it for approval, manages availability, views assigned bookings, conducts sessions, records attendance where permitted, assigns homework, grades submissions, evaluates Students, and tracks the progress of Students assigned to them.

**Admin (مدیر مؤسسه):** Manages users and instructors, approves instructor applications, manages subject taxonomy and policies, monitors bookings and classes, handles complaints and moderation, and views operational reports.

**External systems:** SMTP provider, payment gateway, video-conference provider, object storage, and database infrastructure. External systems do not receive platform user roles.

### 3.3 Dashboards and landing pages

The system shall provide role-appropriate landing dashboards after successful authentication.

- **Student dashboard [MVP]:** Upcoming bookings, recent/pending homework, latest grades or feedback, notifications, and shortcuts to instructor discovery and personal learning records.
- **Instructor dashboard [MVP]:** Today's and upcoming classes, pending booking requests or confirmations as applicable, homework awaiting grading, profile approval state, and availability shortcuts.
- **Admin dashboard [MVP]:** Pending instructor applications, user/account alerts, upcoming or recently changed bookings, and operational summaries needed for daily institute administration.
- Detailed charts, revenue analytics, response-time trends, and configurable dashboard widgets may be delivered in P2/P3.

The dashboard shall show only information the authenticated role is authorized to access. Empty states shall explain when no relevant records exist. A dashboard is a summary and shall not replace the detailed pages and workflows for managing the underlying records.

### 3.4 Permissions matrix

Legend: C=create, R=read, U=update, D=delete, A=approve, M=moderate. Permissions are always limited by ownership, assignment, and object-level authorization.

| Capability | Student | Instructor | Admin |
|---|---|---|---|
| Own profile | R, U | R, U | R, U |
| Self-registration | C as Student | C as pending Instructor | — |
| Instructor approval | — | — | A |
| Public approved instructor profile | R | R, U own profile | R, U, M |
| Instructor availability | R | C, R, U own | R |
| Booking | C own | R assigned bookings | R, manage on behalf where policy permits |
| Session access | C/join own eligible session | C/join assigned session | R for oversight; no implicit teaching access |
| Attendance | R own | C, U for assigned session | R, correct with audit |
| Homework | R assigned, C submission | C, R, U for assigned Students | R, M where necessary |
| Grades/evaluations | R own | C, R, U for assigned Students | R; correction only through controlled audited action |
| Reviews | C after eligible completed session; R public | R own eligible reviews | M |
| Complaints | C own, R own status | C own, R involved status | R, assign, resolve |
| User management | — | — | C/R/U/suspend subject to policy |
| Taxonomy and platform policies | R | R | C/R/U/D |
| Platform analytics | — | Own limited metrics | R |
| Audit log | — | — | R, restricted |
| Configuration/secrets | — | — | Authorized configuration access; secrets masked |

Admin access to private academic records, session links, submissions, or sensitive personal data shall be limited to legitimate operational needs and recorded where appropriate. Admin status does not imply unrestricted access to every private object.

### 3.5 Assumptions and constraints

1. The institute owns and governs instructor accounts and approves instructors before public discovery.
2. The platform is a web application. Mobile-web must be responsive; native applications are not included.
3. The selected video provider performs media transport. The platform manages session scheduling and access links and stores the platform's own attendance/status records.
4. Payment is planned for P2. MVP bookings may be recorded without payment.
5. Currency, prices, and institute policies must be configurable once the relevant feature is implemented.
6. English and Persian are launch locales.
7. The grading scale must be configurable or explicitly agreed by the academic coordinator before grading is implemented.
8. The institute timezone must be configured. Stored timestamps shall use an unambiguous timezone-aware representation; displayed times shall be localized.
9. The repository's existing technology and development constraints in `AGENTS.md` and accepted ADRs remain authoritative. This SRS does not independently authorize changing the stack or introducing Docker.
10. SQLite may be used locally only if supported by the repository architecture and tests; PostgreSQL 16 is the production system of record. Database-specific behavior must be tested against PostgreSQL in CI where relevant.

### 3.6 External dependencies

| Dependency | Purpose | Required decision |
|---|---|---|
| PostgreSQL 16 | Persistent system of record | Existing architecture |
| FastAPI, SQLAlchemy async | API and persistence | Existing architecture |
| Vue 3, TypeScript, Vite, Pinia | Web UI | Existing architecture |
| JWT and bcrypt | Authentication and password storage | Existing ADR |
| SMTP provider | Verification, recovery, notifications | Provider and sender domain |
| Payment gateway | Payments and refunds | Gateway, currency, refund rules |
| Video provider | Live classes, possible captions/recordings | Provider and integration capabilities |
| Object storage | Resumes, homework files, submissions, optional recordings | Provider, access model, retention |

---

## 4. Shared functional requirements (FR-S)

| ID | Requirement | Phase |
|---|---|---|
| FR-S-01 | The system shall support Student and Instructor self-registration. Instructor accounts shall remain pending until approved. Admin accounts shall be created by authorized institute staff. | MVP |
| FR-S-02 | The system shall authenticate users using email and password and issue a signed JWT access token containing the minimum required identity and authorization claims. | MVP |
| FR-S-03 | The system shall enforce role-based authorization on every protected API operation. Missing or invalid authentication shall return 401; authenticated but unauthorized access shall return 403 or a non-disclosing 404 according to the API security policy. | MVP |
| FR-S-04 | `GET /api/v1/auth/me` shall return the authenticated user's safe profile and shall never expose password hashes, secrets, or token material. | MVP |
| FR-S-05 | Users shall view and update permitted fields of their own profile. Fields controlled by the institute shall not be user-editable. | MVP |
| FR-S-06 | Passwords shall be hashed using the algorithm and parameters accepted in ADR-002. Plaintext passwords shall never be stored or logged. | MVP |
| FR-S-07 | Login failures for unknown email and incorrect password shall use a generic response that does not disclose account existence. | MVP |
| FR-S-08 | The system shall support authorized upload and download of resumes, homework attachments, and submissions, with server-side type, size, ownership, and access validation. | MVP |
| FR-S-09 | The system shall create in-app notifications for relevant booking, class, homework, grading, and approval events. | MVP |
| FR-S-10 | The system shall send transactional email through the configured SMTP provider for enabled email events. | P2 |
| FR-S-11 | The system shall support self-service password reset using a single-use, expiring reset token delivered through a verified channel. | P2 |
| FR-S-12 | The system shall verify an Instructor's email before the profile becomes publicly discoverable. The exact dependency of approval and verification shall be consistently enforced. | MVP |
| FR-S-13 | The system shall record immutable audit events for administrative actions, moderation, approval decisions, attendance corrections, and grade changes. | P2 |
| FR-S-14 | The UI shall support English and Persian, including RTL layout and localized dates and numbers. | MVP |
| FR-S-15 | The API shall validate input and return a consistent structured validation response for invalid payloads. | MVP |
| FR-S-16 | The system shall expose a health/readiness endpoint without disclosing secrets or sensitive infrastructure details. | MVP |
| FR-S-17 | The system shall support configurable policies for booking horizon, booking lead time, cancellation/rescheduling, late homework, and related rules. Policies shall be validated server-side. | P2 |
| FR-S-18 | The system shall apply institute-approved retention, archival, and deletion rules to personal data and uploaded content. | P3 |
| FR-S-19 | The system shall provide role-specific dashboards with authorized summaries and links to the relevant workflows. | MVP |
| FR-S-20 | The system shall enforce object-level authorization so a user cannot access or modify another user's bookings, sessions, homework, submissions, grades, evaluations, files, or complaints by changing an identifier. | MVP |
| FR-S-21 | The system shall maintain a consistent event/notification history for important state changes and shall avoid duplicate user-visible notifications when an operation is retried. | P2 |
| FR-S-22 | The system shall provide a consistent server-side date/time policy using timezone-aware timestamps and the institute timezone for scheduling rules. | MVP |

---

## 5. Student requirements (FR-B)

### 5.1 Student journey

A Student registers, completes their profile, and opens the Student dashboard. They discover approved instructors, filter and compare profiles, inspect expertise and reviews, and select an available time. The system validates the slot and creates a booking. The Student can see the booking's current status and, when eligible, join the related session. The Student views assigned homework, submits work, receives grading and feedback, and views evaluations and progress. After an eligible completed session, the Student may submit a review. The Student may also submit a complaint about an eligible issue and track its status.

### 5.2 Requirements

| ID | Requirement | Phase |
|---|---|---|
| FR-B-01 | A Student shall search and filter publicly discoverable approved Instructors by expertise, rating, review count, language, and availability. | MVP |
| FR-B-02 | A Student shall compare at least two Instructors side by side using consistent profile fields. | MVP |
| FR-B-03 | A Student shall view an approved Instructor's public profile, expertise, resume summary, teaching history, rating, and published reviews. Private contact details and private files shall not be exposed. | MVP |
| FR-B-04 | A Student shall view bookable availability in the Student's selected display timezone, with the institute timezone used for policy enforcement. | MVP |
| FR-B-05 | A Student shall request/book an eligible available slot and receive a result showing the booking status and relevant details. The server shall revalidate availability at booking time. | MVP |
| FR-B-06 | A Student shall join only a session associated with their own eligible booking/enrollment and only within the configured join window. | MVP |
| FR-B-07 | A Student shall view homework assigned to them, including instructions, deadline, attachments, and current status. | MVP |
| FR-B-08 | A Student shall submit homework as text and/or authorized file upload before the applicable deadline, subject to the configured late-submission policy, and receive a receipt. | MVP |
| FR-B-09 | A Student shall view their own grades, feedback, and grading status. | MVP |
| FR-B-10 | A Student shall cancel or request rescheduling of an eligible booking according to the configured policy and shall see the outcome. | P2 |
| FR-B-11 | A Student shall view personal progress over time, including available scores, completed topics, and evaluations. | P2 |
| FR-B-12 | A Student shall view weak areas marked for them, including the related topic and explanatory note. | P2 |
| FR-B-13 | A Student shall view consolidated performance evaluations created for them. | P2 |
| FR-B-14 | A Student shall submit one review for an eligible completed session, subject to the review policy and moderation state. | P2 |
| FR-B-15 | A Student shall pay for eligible bookings through the configured payment gateway and view payment status/history. | P2 |
| FR-B-16 | A Student shall access class materials and recordings only when they have been published for that Student and the provider/storage integration supports access. | P2 |
| FR-B-17 | A Student shall message an Instructor only where an authorized class or homework relationship permits communication. | P2 |
| FR-B-18 | A Student shall save favorite Instructors and manage availability alerts. | P3 |
| FR-B-19 | A Student shall join a waitlist for an eligible fully booked offering if waitlists are enabled. | P3 |
| FR-B-20 | A Student shall view recommended practice activities associated with their weak areas when such content exists. | P3 |
| FR-B-21 | A Student shall view their booking and class history, including dates, Instructor, status, and permitted outcome details. | MVP |
| FR-B-22 | A Student shall view attendance status recorded for their own class sessions and may submit a correction request if the record is disputed. | P2 |
| FR-B-23 | A Student shall create a complaint about an eligible class, user, content item, or platform issue and view its status and permitted responses. | P2 |

---

## 6. Instructor requirements (FR-P)

### 6.1 Instructor journey

An Instructor registers and submits profile information and required credentials. The Instructor sees whether the application is pending, approved, or rejected. After approval and required verification, the Instructor manages availability and time-off, views bookings, and conducts assigned sessions. The Instructor records attendance, creates homework, reviews submissions, grades work, and records evaluations and weak areas for Students they are authorized to teach.

### 6.2 Requirements

| ID | Requirement | Phase |
|---|---|---|
| FR-P-01 | An Instructor shall create and maintain a profile with permitted expertise, bio, languages, and teaching focus. | MVP |
| FR-P-02 | An Instructor shall upload a resume and record teaching-history entries. | MVP |
| FR-P-03 | An Instructor shall submit their profile for Admin approval and see the application state and any rejection reason. Pending or rejected profiles shall not be publicly discoverable. | MVP |
| FR-P-04 | An Instructor shall publish and manage availability slots. The system shall prevent publication of invalid or overlapping slots. | MVP |
| FR-P-05 | An Instructor shall view bookings and sessions assigned to them, including Student information necessary for teaching. | MVP |
| FR-P-06 | An Instructor shall start/join an assigned online session through the configured video integration, subject to the session access window. | MVP |
| FR-P-07 | An Instructor shall create homework for authorized Students or a supported class/enrollment, with instructions, deadline, and optional attachments. | MVP |
| FR-P-08 | An Instructor shall grade submissions with a score within the configured grading scale and written feedback. | MVP |
| FR-P-09 | An Instructor shall record a performance evaluation for a Student after an eligible class, including permitted score and completed topics. | MVP |
| FR-P-10 | An Instructor shall mark weak areas for a Student they are authorized to teach and attach an explanatory note. | MVP |
| FR-P-11 | An Instructor shall view progress for Students assigned to them, limited to relevant educational records. | P2 |
| FR-P-12 | An Instructor shall view their own published rating and reviews, subject to moderation and privacy rules. | P2 |
| FR-P-13 | The system may update teaching-history summaries from completed sessions; any automatically generated entry shall be distinguishable and correctable through an authorized workflow. | P2 |
| FR-P-14 | An Instructor shall publish materials and supported recordings to eligible Students. | P2 |
| FR-P-15 | An Instructor shall message Students where an authorized class/homework relationship permits communication. | P2 |
| FR-P-16 | An Instructor shall create one-time availability exceptions and time-off periods. Existing bookings affected by a change shall not be silently deleted; the system shall invoke the approved conflict-resolution workflow. | P2 |
| FR-P-17 | An Instructor shall reuse homework templates and grading rubrics. | P3 |
| FR-P-18 | An Instructor shall export permitted grade and evaluation records for institute reporting, subject to access and privacy rules. | P3 |
| FR-P-19 | An Instructor shall request review correction or moderation through a recorded process. | P3 |
| FR-P-20 | An Instructor shall record attendance for each assigned session using the institute-approved attendance method and shall not alter records for sessions they are not assigned to. | MVP |
| FR-P-21 | An Instructor shall view class history and session states for their own assigned sessions. | MVP |
| FR-P-22 | An Instructor shall view homework lifecycle states and identify submissions awaiting grading, graded submissions, and overdue/missing work. | MVP |
| FR-P-23 | An Instructor shall create and track a complaint or operational issue related to an assigned class where the institute enables this workflow. | P2 |

---

## 7. Admin requirements (FR-A)

### 7.1 Admin journey

An Admin opens the Admin dashboard and reviews pending instructor applications and operational alerts. The Admin approves or rejects applications with a reason, manages users and taxonomy, monitors bookings and sessions, handles complaints and moderation, and reviews service-quality indicators. Sensitive changes are attributable to the responsible Admin.

### 7.2 Requirements

| ID | Requirement | Phase |
|---|---|---|
| FR-A-01 | Admin shall view, edit permitted fields, suspend, and reinstate Student accounts. | MVP |
| FR-A-02 | Admin shall view, edit permitted fields, suspend, and reinstate Instructor accounts. | MVP |
| FR-A-03 | Admin shall approve or reject Instructor applications with a recorded reason and timestamp. | MVP |
| FR-A-04 | Admin shall create and manage the subject/category/expertise taxonomy. | MVP |
| FR-A-05 | Admin shall review Instructor profiles, resumes, and teaching-history records for verification. | MVP |
| FR-A-06 | Admin shall create Admin accounts and assign only approved staff roles/permissions. | P2 |
| FR-A-07 | Admin shall configure SMTP settings and send a test email. Secrets shall be masked and never returned in plaintext after saving. | P2 |
| FR-A-08 | Admin shall configure payment provider settings, currency, and enabled payment methods. Secrets shall be masked. | P2 |
| FR-A-09 | Admin shall configure approved policies for booking, cancellation, late submission, and refunds. | P2 |
| FR-A-10 | Admin shall monitor service quality using defined indicators, including review scores, complaint counts/status, cancellations, class completion, and response times where data exists. | P2 |
| FR-A-11 | Admin shall view platform analytics, including active Students/Instructors, bookings, completed sessions, and payment/revenue metrics when payments are enabled. | P2 |
| FR-A-12 | Admin shall moderate profiles, reviews, homework content, and reported files using documented actions and reasons. | P2 |
| FR-A-13 | Admin shall configure enabled notification templates for email and in-app events. | P2 |
| FR-A-14 | Admin shall view system-health indicators such as API health, queue depth, and job failures without access to secrets. | P2 |
| FR-A-15 | Admin shall search and filter audit events by actor, action, entity, and date range, subject to permission. | P2 |
| FR-A-16 | Admin shall export authorized platform reports to CSV. | P3 |
| FR-A-17 | Admin may define custom roles and fine-grained permission sets only if the institute approves the additional complexity. | P3 |
| FR-A-18 | Admin shall manage retention schedules and deletion requests according to approved institute policy. | P3 |
| FR-A-19 | Admin shall view and manage booking/session records for operational support, with sensitive actions logged. | MVP |
| FR-A-20 | Admin shall manage complaints through status changes, assignment, internal notes, and resolution records. | P2 |
| FR-A-21 | Admin shall correct an attendance record only through an authorized correction action that records the previous value, new value, actor, timestamp, and reason. | P2 |
| FR-A-22 | Admin shall view an operational history of booking and session state changes. | P2 |

---

## 8. Business rules and lifecycle definitions

### 8.1 Booking lifecycle

The following lifecycle is the baseline model. Exact payment-related transitions depend on the payment decision in Section 15.

| State | Meaning |
|---|---|
| `pending` | Booking request has been created but is awaiting any required confirmation or payment. |
| `confirmed` | Booking is accepted and the slot is reserved. |
| `cancelled_by_student` | Student cancelled according to policy. |
| `cancelled_by_instructor` | Instructor cancellation was recorded. |
| `cancelled_by_admin` | Admin cancelled for an operational reason. |
| `reschedule_requested` | A reschedule request is awaiting a decision. |
| `rescheduled` | The booking was moved; the resulting booking/time reference is retained. |
| `completed` | The associated class session was completed and finalized. |
| `no_show_student` | Student absence was recorded under institute policy. |
| `no_show_instructor` | Instructor absence was recorded under institute policy. |
| `rejected` | The booking request was rejected where approval is required. |

Rules:
1. A booking shall have a valid Student, Instructor, start time, end time, timezone context, and status.
2. End time shall be later than start time.
3. A booking shall not overlap another confirmed booking for the same Instructor unless an explicitly approved group-class model allows it.
4. The server, not the browser, shall make the final availability decision.
5. A cancelled or rejected booking shall not continue to reserve availability.
6. State changes shall follow allowed transitions; arbitrary status updates shall be rejected.
7. The system shall retain booking history needed for audit and reporting.
8. Payment-required bookings shall not become confirmed until the payment rule is satisfied. The exact payment flow remains subject to Q-02.
9. Cancellation, rescheduling, no-show, and refund consequences shall follow approved policies; unresolved policy values shall not be invented in implementation.

### 8.2 Class session lifecycle

| State | Meaning |
|---|---|
| `scheduled` | Session exists and is planned. |
| `ready` | Session is within the pre-start window and access can be prepared. |
| `in_progress` | Session has started. |
| `completed` | Session was completed and finalized. |
| `cancelled` | Session was cancelled. |
| `no_show` | The session did not take place due to attendance failure, with the responsible party recorded where policy permits. |
| `interrupted` | Session began but could not be completed due to a technical or operational issue. |

Rules:
1. A session shall be associated with its booking or approved enrollment/class offering.
2. Only authorized participants shall receive or use the join link.
3. Join links shall not be exposed through public instructor profiles or unauthenticated endpoints.
4. The system shall enforce a configurable join window. The exact duration is an open policy decision.
5. Session completion shall not automatically imply that homework is graded or an evaluation is published.
6. An interrupted session shall have a reason or operational note and shall follow an institute-defined resolution process.
7. Admin shall be able to inspect session state for support; observation shall not grant implicit permission to join as a participant.

### 8.3 Attendance

1. Attendance shall be recorded per participant and per session.
2. Supported values shall include at least `present`, `absent`, `late`, and `excused`.
3. Attendance shall be recorded by the Instructor or by an approved integration. Automated provider attendance is not assumed until the provider is selected.
4. Corrections shall preserve the previous value, new value, actor, timestamp, and reason.
5. Students shall see their own attendance records; Instructors shall see records for their assigned sessions; Admin access shall be audited.
6. No-show classification and its financial consequences remain subject to institute policy.

### 8.4 Availability and concurrency

1. Availability slots and time-off intervals shall be validated on the server.
2. The system shall prevent overlapping confirmed bookings for the same Instructor unless group sessions are explicitly enabled.
3. Concurrent requests for the same slot shall not create duplicate confirmed bookings.
4. The implementation shall use database-level constraints, transactions, locking, or an equivalent concurrency-safe mechanism. Frontend checks alone are insufficient.
5. Booking creation shall be atomic: either the booking and reservation are committed together, or neither is.
6. Timezone conversion shall not change the actual instant represented by a stored booking.
7. Daylight-saving transitions, if applicable to the configured timezone, shall be handled using a timezone-aware library and tested.

### 8.5 Homework lifecycle

| State | Meaning |
|---|---|
| `draft` | Instructor is preparing the homework; Students cannot see it. |
| `published` | Homework is available to assigned Students. |
| `submitted` | Student has submitted work. |
| `late_submitted` | Submission was accepted after the deadline under the configured rule. |
| `graded` | Instructor has published a grade and feedback. |
| `returned_for_revision` | Instructor has requested a permitted revision. |
| `overdue` | Deadline passed without an accepted submission. |
| `closed` | Homework is no longer accepting submissions. |

Rules:
1. Only assigned Students shall access a homework item.
2. Submission ownership shall be checked on every read, update, and download.
3. The system shall preserve submission timestamps and prior submission versions when resubmission is supported.
4. A grade shall be within the configured grading scale.
5. Grade changes after publication shall be audited.
6. Late submission, resubmission, and revision rules require institute approval; see Q-08.
7. A Student shall not modify a submission after the allowed submission window unless policy permits it.

### 8.6 Reviews

1. A Student may review only an eligible completed session and only within the institute-defined review window.
2. The system shall prevent duplicate reviews for the same eligible session unless an approved edit policy permits updates.
3. Review states shall include at least `pending_moderation`, `published`, `rejected`, and `hidden`.
4. The moderation policy shall be applied consistently to display, ratings, and analytics.
5. The institute must decide whether all reviews require moderation or only reported/flagged reviews. Until Q-09 is resolved, implementation shall not silently choose a policy.

### 8.7 Complaints

1. A complaint shall have a creator, category, description, creation time, and status.
2. Complaint statuses shall include `open`, `under_review`, `awaiting_response`, `resolved`, and `closed`.
3. Only the creator and authorized Admin staff shall see the complaint by default. An Instructor may see a complaint only when the institute determines that they are an involved party and the disclosed information is necessary.
4. Admin actions, status changes, assignment, resolution, and internal notes shall be attributable and timestamped.
5. Internal Admin notes shall never be exposed to Students or Instructors.
6. Complaint counts and response-time metrics shall be based on defined status and timestamp rules.
7. Emergency or legal escalation procedures are outside the current system unless separately specified.

### 8.8 Course, booking, session, and enrollment distinction

These concepts shall not be treated as interchangeable:
- A **Course** describes a learning offering or subject context.
- A **Booking** reserves a specific time with an Instructor.
- A **Class session** is the actual scheduled teaching event.
- An **Enrollment** associates a Student with a Course or group offering where applicable.

The institute must decide whether MVP supports only one-to-one sessions or also group sessions, and whether a Course/Enrollment entity is required at launch. Until Q-10 is resolved, the data model and UI shall not assume group capacity, group pricing, or group enrollment rules. The implementation team shall document the chosen MVP scope in an ADR or approved feature specification before building the booking/session model.

---

## 9. Non-functional requirements (NFR)

| ID | Category | Requirement and verification |
|---|---|---|
| NFR-01 | Performance | Under the agreed normal-load profile, profile, homework-list, and progress read endpoints shall meet p95 latency of 300 ms, excluding external-provider latency. The test environment and dataset shall be documented. |
| NFR-02 | Performance | Instructor search shall meet p95 latency of 800 ms with at least 10,000 instructor records and a documented representative query mix. |
| NFR-03 | Performance | File uploads/downloads shall stream or use bounded-memory transfer; tests shall verify that application memory does not scale linearly with the full file size. |
| NFR-04 | Security | Production traffic shall use TLS. Credentials, access tokens, reset tokens, payment secrets, and private file contents shall not appear in logs or error responses. |
| NFR-05 | Security | Password hashing and JWT signing/expiry shall follow ADR-002. Secrets shall be supplied through approved secret configuration, not committed to source control. |
| NFR-06 | Security | Authorization shall be enforced server-side for every protected operation and every object. Tests shall cover cross-user and cross-role access attempts. |
| NFR-07 | Security | Uploaded files shall be size/type validated, stored outside the public web root or in private object storage, and served only after authorization. Original filenames shall not be trusted as storage paths. |
| NFR-08 | Security | Authentication and sensitive endpoints shall have rate limits and abuse controls appropriate to the threat model. |
| NFR-09 | Scalability | The API shall remain stateless where practical. Durable background jobs shall use the repository-approved queue/outbox design. |
| NFR-10 | Scalability | Database access shall use async SQLAlchemy and appropriate indexes for identity, ownership, expertise, and scheduling queries. Query performance shall be measured for key workflows. |
| NFR-11 | Availability | The service target shall be 99.5% monthly availability, excluding planned maintenance and explicitly excluded third-party outages. Monitoring and measurement boundaries shall be documented. |
| NFR-12 | Accessibility | The UI shall target WCAG 2.1 Level AA, including keyboard operation, visible focus, accessible labels, contrast, and announced validation errors. |
| NFR-13 | Accessibility | Captions/transcripts shall be surfaced when supported by the selected video provider. The platform shall not claim caption support before provider selection and verification. |
| NFR-14 | Localization | English LTR and Persian RTL shall be supported. User-facing strings shall use the localization system; dates, numbers, and currencies shall be localized. |
| NFR-15 | Localization | UTF-8 user content shall display correctly in both locales without clipping or directional corruption. |
| NFR-16 | Maintainability | Each implemented feature shall have an approved `SPEC.md` and `PLAN.md`. Changes shall follow TDD and repository lint, type-check, and test requirements. |
| NFR-17 | Auditability | Approval, moderation, grade changes, attendance corrections, and other defined sensitive actions shall record actor, timestamp, entity, action, and relevant before/after values without storing secrets. |
| NFR-18 | Testability | CI shall run automated tests without depending on developer-local services. Database behavior critical to correctness shall be tested against PostgreSQL. |
| NFR-19 | Observability | Structured logs and metrics shall cover request latency, error rate, authentication failures, background-job failures, and queue depth. Logs shall avoid sensitive personal data and secrets. |
| NFR-20 | Backup and recovery | PostgreSQL backups shall run at an institute-approved frequency. Restore procedures shall be documented and tested; recovery-point and recovery-time objectives require stakeholder approval. |
| NFR-21 | Privacy | The system shall collect and expose only personal data needed for defined workflows. Private profile fields, grades, submissions, and complaints shall be restricted by role and relationship. |
| NFR-22 | Reliability | Booking creation, payment callbacks, notification dispatch, and other retryable operations shall be idempotent or protected against duplicate effects. |
| NFR-23 | Compatibility | The web UI shall support the agreed current versions of major desktop and mobile browsers. The exact browser support matrix shall be documented before release. |
| NFR-24 | Responsive design | Core Student, Instructor, and Admin workflows shall remain usable at desktop, tablet, and mobile-web viewport sizes. |
| NFR-25 | Error handling | User-facing errors shall be understandable and shall not reveal stack traces, database details, secrets, or internal implementation data. |

---

## 10. Security and privacy requirements

### 10.1 Authentication and tokens

- Access tokens shall have a configured expiry.
- Token refresh, revocation, logout semantics, and session invalidation shall be documented in the authentication feature specification.
- Password reset tokens shall be single-use, expiring, and stored in a non-recoverable or otherwise securely verifiable form.
- Authentication responses shall not reveal whether an email address exists.

### 10.2 Authorization and IDOR prevention

- Every service operation shall verify both role and object relationship/ownership.
- Student A shall not access Student B's booking, session, homework, submission, grade, evaluation, attendance, file, or complaint by changing an ID.
- An Instructor shall access only Students and sessions assigned to that Instructor, except for explicitly authorized Admin workflows.
- Frontend route guards and hidden controls are usability measures, not security boundaries.
- Tests shall include unauthorized read, create, update, delete, download, and state-transition attempts.

### 10.3 File security

- Files shall be stored using generated storage keys, not user-supplied paths.
- The system shall validate allowed file types and size on the server.
- Downloads shall require authorization at the time of download; possession of a predictable URL shall not grant access.
- Public profile documents, if any, shall be explicitly designated public and shall not expose private resume attachments by default.
- Malware scanning may be added if supported by institute infrastructure; it is not assumed to exist in MVP.

### 10.4 Sensitive configuration and logging

- SMTP, payment, JWT, and storage credentials shall be masked in Admin UI and excluded from API responses and logs.
- Secrets shall not be committed to the repository.
- Logs shall avoid passwords, tokens, payment credentials, private file contents, and unnecessary personal data.
- Administrative access to sensitive records and all sensitive changes shall follow the audit policy.

### 10.5 Web application protections

The implementation shall apply framework-appropriate protections against injection, XSS, CSRF where applicable to the chosen authentication transport, unsafe redirects, and insecure CORS configuration. Security headers and cookie attributes shall be configured for production. The feature-level specifications shall state the concrete implementation and tests.

---

## 11. Constraints

1. **Technology:** Python 3.12+, FastAPI async, SQLAlchemy 2.0 async, Alembic, PostgreSQL 16, Vue 3, TypeScript strict, Vite, Pinia, Vitest, and Playwright, subject to `AGENTS.md`.
2. **Architecture:** Layered backend Router → Service → Repository → Model. Domain logic shall not depend on web or persistence frameworks, consistent with the accepted ADR.
3. **Delivery:** Web application only; no native mobile or desktop clients in this scope.
4. **Tenancy:** Single institute.
5. **Integrations:** Video, SMTP, payment, and object-storage providers must be selected by the institute.
6. **Governance:** Instructors shall not be publicly visible before required approval and verification.
7. **Dependencies:** New dependencies must be justified in the active feature's `PLAN.md`.
8. **Quality gate:** A feature is not complete until tests, lint, type-check, documentation, and acceptance criteria are satisfied.
9. **External resources:** Institute accounts and credentials are prerequisites for provider-dependent features.
10. **Localization:** English and Persian are the launch locales.
11. **No silent policy assumptions:** Unresolved questions in Section 15 must be decided or explicitly deferred before the affected feature is implemented.

---

## 12. Feature catalog and phase allocation

This catalog is a summary of the detailed requirements above. The detailed requirement table is authoritative if a summary label is abbreviated.

### 12.1 Shared

| ID | Feature | Phase |
|---|---|---|
| FR-S-01 to FR-S-09 | Registration, login, RBAC, current user, profile, password security, file access, in-app notifications | MVP |
| FR-S-10 to FR-S-11 | SMTP email and password reset | P2 |
| FR-S-12 | Instructor email verification before public discovery | MVP |
| FR-S-13 | Audit events | P2 |
| FR-S-14 to FR-S-16 | Localization, validation, health endpoint | MVP |
| FR-S-17 | Configurable business policies | P2 |
| FR-S-18 | Retention and deletion | P3 |
| FR-S-19 to FR-S-20 | Role dashboards and object-level authorization | MVP |
| FR-S-21 | Notification/event deduplication | P2 |
| FR-S-22 | Timezone-aware scheduling | MVP |

### 12.2 Student

| ID | Feature | Phase |
|---|---|---|
| FR-B-01 to FR-B-09 | Instructor discovery, comparison, profiles, calendar, booking, session access, homework, submission, grades | MVP |
| FR-B-10 to FR-B-17 | Cancellation/reschedule, progress, weak areas, evaluations, reviews, payments, materials, messaging | P2 |
| FR-B-18 to FR-B-20 | Favorites, waitlist, recommended practice | P3 |
| FR-B-21 | Booking and class history | MVP |
| FR-B-22 to FR-B-23 | Attendance visibility and complaints | P2 |

### 12.3 Instructor

| ID | Feature | Phase |
|---|---|---|
| FR-P-01 to FR-P-10 | Profile, credentials, approval, availability, bookings, sessions, homework, grading, evaluations, weak areas | MVP |
| FR-P-11 to FR-P-16 | Progress, reviews, teaching history, materials, messaging, availability exceptions | P2 |
| FR-P-17 to FR-P-19 | Templates, exports, review correction requests | P3 |
| FR-P-20 to FR-P-22 | Attendance, class history, homework status visibility | MVP |
| FR-P-23 | Instructor complaint/issue workflow | P2 |

### 12.4 Admin

| ID | Feature | Phase |
|---|---|---|
| FR-A-01 to FR-A-05 | User management, instructor approval, taxonomy, credential review | MVP |
| FR-A-06 to FR-A-14 | Staff roles, SMTP/payment/policy configuration, service quality, analytics, moderation, notifications, health | P2 |
| FR-A-15 | Audit log viewer | P2 |
| FR-A-16 to FR-A-18 | Report export, custom roles, retention management | P3 |
| FR-A-19 | Booking/session oversight | MVP |
| FR-A-20 to FR-A-22 | Complaint management, attendance correction, booking/session history | P2 |

---

## 13. Phase roadmap

### MVP — core institute teaching workflow

**Goal:** An approved Instructor can publish availability; a Student can discover and book; the class can be conducted and its state/history recorded; homework can be submitted and graded; and the institute can administer core accounts and operations.

MVP includes:
- Authentication, role enforcement, safe profiles, and Instructor approval/verification.
- Student, Instructor, and Admin dashboards with basic operational summaries.
- Instructor discovery, profile, comparison, availability, booking, and booking/class history.
- A concurrency-safe booking workflow and basic class-session lifecycle.
- Authorized session joining through the selected integration, subject to provider availability.
- Basic attendance recording.
- Homework creation, publication, submission, grading, and feedback.
- Basic evaluations and weak-area recording.
- Admin user management, taxonomy management, instructor review, and booking/session oversight.
- Secure file access, object-level authorization, timezone-aware scheduling, and core localization.

### P2 — operational completeness and insight

**Goal:** Add operational workflows and institute oversight around the core teaching loop.

P2 includes:
- Cancellation/rescheduling policies and exceptions.
- Progress analytics and consolidated reports.
- Reviews and moderation.
- Payments and refunds after gateway and policy decisions.
- Email, password reset, notification templates, and messaging.
- Complaint creation and management.
- Audit log viewing and sensitive corrections.
- Advanced service-quality metrics and system-health dashboard.
- Materials and recordings where provider/storage support is confirmed.

### P3 — advanced capabilities

**Goal:** Add convenience, automation, and data portability after core workflows are stable.

P3 includes:
- Favorites, alerts, waitlists, and recommended practice.
- Homework templates and rubrics.
- Exports and advanced reporting.
- Custom roles if justified.
- Advanced retention automation and personalization.

A phase change requires updating the detailed requirement, feature catalog, roadmap, and affected acceptance tests together.

---

## 14. Acceptance and verification principles

1. Every functional requirement shall be mapped to one or more acceptance scenarios in its feature `SPEC.md`.
2. Acceptance scenarios shall include the successful path, validation failures, permission failures, and relevant state-transition failures.
3. For role-protected data, tests shall include a user attempting to access another user's object.
4. Booking tests shall include two concurrent requests competing for the same unavailable capacity/slot and prove that duplicate reservations cannot be committed.
5. Timezone tests shall verify that the same booking instant is represented consistently in the institute timezone and Student display timezone.
6. Lifecycle tests shall verify allowed and disallowed transitions for bookings, sessions, homework, reviews, and complaints.
7. File tests shall verify unauthorized upload, read, and download attempts, invalid type/size, and non-public storage behavior.
8. Audit tests shall verify actor, timestamp, entity, action, and before/after values for sensitive changes.
9. UI tests shall cover role dashboards, responsive layouts, keyboard navigation, RTL rendering, and accessible validation errors.
10. Performance tests shall state dataset size, concurrency, hardware/environment, and measurement boundaries.
11. External-provider tests shall use mocks/sandboxes and shall verify failure, timeout, retry, and duplicate-callback behavior where applicable.
12. No requirement is considered accepted solely because its UI control exists; server-side behavior and tests must demonstrate the requirement.

### 14.1 Minimum booking acceptance scenarios

- Given an available slot, when an eligible Student books it, then one booking is created and the slot is reserved.
- Given a slot already reserved, when another Student attempts to book it, then the second request is rejected with a clear response and no duplicate confirmed booking is created.
- Given two simultaneous booking requests for the same exclusive slot, when both reach the server concurrently, then at most one can reserve the slot.
- Given a Student who does not own a booking, when they request its details or join link, then access is denied without disclosing protected data.
- Given a cancelled booking, when availability is recalculated, then the slot is treated according to the cancellation policy and cannot remain accidentally locked.
- Given a booking in a different display timezone, when the Student views it, then the displayed local time represents the same instant.

### 14.2 Minimum homework acceptance scenarios

- Given published homework assigned to a Student, when that Student opens it, then the instructions and deadline are visible.
- Given a Student who is not assigned, when they request the homework or its attachment, then access is denied.
- Given a valid submission within the allowed window, when it is submitted, then a receipt and timestamp are stored.
- Given an expired deadline, when a Student submits, then the configured late-submission rule is applied.
- Given a graded submission, when the Student views it, then only that Student's grade and feedback are returned.
- Given a published grade that is changed, then the change is audited.

---

## 15. Open questions and decisions required

These questions remain unresolved unless the institute records an approved answer. Affected implementation work must not invent answers.

| # | Question | Owner | Affects |
|---|---|---|---|
| Q-01 | Which video-conference provider will be used? Does it support captions, attendance webhooks, recording, and secure participant links? | Institute management / IT | FR-B-06, FR-P-06, FR-B-16, FR-P-20, NFR-13 |
| Q-02 | Which payment gateway, currency, payment timing, refund policy, and failed-payment behavior apply? | Finance / Admin | FR-B-15, FR-A-08, FR-A-09 |
| Q-03 | Which SMTP provider and sender domain will be used? | IT | FR-S-10, FR-S-11, FR-A-07 |
| Q-04 | What is the approved list and hierarchy of subjects/expertise areas at launch? | Academic coordinator | FR-A-04, FR-B-01 |
| Q-05 | What are the Instructor approval criteria and required evidence? | Academic coordinator | FR-A-03, FR-P-03 |
| Q-06 | What grading scale, precision, and rubric rules apply? | Academic coordinator | FR-P-08, FR-B-09 |
| Q-07 | Who defines and maintains the weak-area taxonomy? | Academic coordinator | FR-P-10, FR-B-12, FR-B-20 |
| Q-08 | What are the late submission, resubmission, revision, and homework closure rules? | Academic coordinator | FR-B-08, FR-P-07, FR-P-08 |
| Q-09 | Are all reviews moderated before publication, or only reported/flagged reviews? What is the review-edit window? | Institute management | FR-B-14, FR-A-12, FR-P-12 |
| Q-10 | Does MVP support only one-to-one sessions or group classes too? If group classes are supported, what are capacity, enrollment, pricing, and cancellation rules? | Institute management / Academic coordinator | FR-B-05, FR-P-05, FR-P-07, booking/session data model |
| Q-11 | Is the institute offering language courses only or other subjects as well? | Institute management | Scope, FR-A-04 |
| Q-12 | What retention periods apply to accounts, submissions, grades, complaints, audit events, and recordings? | Legal / IT | FR-S-18, FR-A-18, NFR-20 |
| Q-13 | Who reviews Persian translations and approves terminology? | Institute management | FR-S-14, NFR-14 |
| Q-14 | Are recordings stored by the video provider or copied to platform storage? Who may access and delete them? | IT / Institute management | FR-B-16, FR-P-14, NFR-07 |
| Q-15 | What is the institute's default timezone? Are Students allowed to choose a display timezone? | Institute management | FR-B-04, FR-P-04, FR-S-22 |
| Q-16 | What is the booking horizon, minimum lead time, slot duration, buffer time, and join window? | Institute management | FR-B-04, FR-B-05, FR-P-04, FR-S-17 |
| Q-17 | What are the cancellation/rescheduling deadlines and consequences for Student, Instructor, and Admin cancellations? | Institute management | FR-B-10, FR-P-16, FR-A-09 |
| Q-18 | How is attendance determined: Instructor marking, provider webhook, or both? What evidence resolves disputes? | Academic coordinator / IT | FR-P-20, FR-B-22, FR-A-21 |
| Q-19 | What is the complaint response target, escalation path, and visibility policy for involved parties? | Institute management | FR-B-23, FR-P-23, FR-A-20 |
| Q-20 | What workload, concurrency, browser support, recovery-point objective, and recovery-time objective are expected? | Engineering / IT | NFR-01, NFR-02, NFR-11, NFR-20, NFR-23 |

---

## 16. Consistency rules for future changes

1. When a requirement is added, changed, or removed, update its detailed section, feature catalog, roadmap, and acceptance scenarios.
2. A feature shall not appear in a phase catalog if its detailed requirement has a different phase tag.
3. Any Admin metric must have a defined source, calculation, and time window. A metric shall not be listed as available if the workflow producing its data does not exist.
4. Any external integration requirement must identify provider-dependent assumptions and failure behavior.
5. Any role permission must be enforced server-side and covered by positive and negative tests.
6. Any stateful entity must define its allowed states and transitions before implementation.
7. Any policy-dependent feature must reference an approved policy or remain blocked pending the relevant open question.
8. Changes to the technology stack or architecture require an approved ADR; this SRS alone does not authorize them.
9. Feature-level specifications must not weaken the security, privacy, or authorization requirements in this SRS.
10. If a requirement is deferred, its phase tag and roadmap must be updated together.

---

**End of SRS v1.1 — Draft for stakeholder review.**

This document defines requirements, not implementation details. Each approved requirement shall be refined into a feature-level `SPEC.md`, implementation `PLAN.md`, and automated acceptance tests in accordance with `AGENTS.md` and the accepted ADRs.
