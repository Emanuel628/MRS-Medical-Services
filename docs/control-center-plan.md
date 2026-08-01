# Control Center Plan

This plan defines the software areas needed for M.R.S. Medical Services to manage the website, appointment flow, payments, and sensitive patient visit records from one admin area.

## Current Foundation

- Admin authentication exists for the Control Center.
- Appointment requests are stored in Postgres.
- Stripe checkout can be started from appointment requests.
- Appointment date and time-window reservations are stored separately to prevent double booking.
- Cancellation and confirmation workflows exist through email links.

## Immediate Control Center Pages

### Dashboard

- Daily appointment count.
- New appointment requests waiting for review.
- Upcoming confirmed visits.
- Payment issues or unpaid on-site visits.
- Quick links for schedule, requests, and settings.

### Appointment Requests

- Scheduler/contact details.
- Patient name when different from the scheduler.
- Relationship to patient.
- Minor patient and guardian authorization status.
- Full service address.
- Requested date and time window.
- Preferred lab.
- Prescription/order ready status.
- Group size.
- Specialty kit count.
- Payment method, payment status, Stripe checkout session, and quoted total.
- Internal notes and submitted appointment notes.

### Schedule

- Calendar view by day/week.
- Confirmed visits.
- Held/reserved checkout slots.
- Manual blocked time.
- Manual appointment creation.
- Reschedule and cancellation actions.

### Payments

- Stripe checkout status.
- Stripe transaction/session ID.
- On-site Square payment status.
- Refund/cancellation tracking.
- Exportable payment history for bookkeeping.

### Patients And Visits

- Searchable visit history by name, phone, email, date, and ZIP code.
- Visit detail page with all intake fields.
- Internal-only notes.
- Download/export for operational records.

### Website Settings

- Service area text and ZIP coverage rules.
- Pricing rules.
- Available time windows.
- Lab options.
- Contact information.
- Footer links and legal page text.

### Admin Users And Security

- Admin user management.
- Password reset.
- Session history.
- Audit log for viewing, editing, cancelling, and exporting records.
- Role separation for owner/admin/staff access.

## Data Wiring Added

Appointment submissions should now store the following fields as structured database columns instead of only inside the message notes:

- Scheduler name, phone, and email.
- Patient name.
- Appointment-for value.
- Relationship to patient.
- Minor patient flag.
- Guardian authorization flag.
- Street address, address details, town, state, and ZIP code.
- Preferred lab.
- Prescription/order ready flag.
- Group patient count.
- Specialty kit flag and kit count.
- Quoted total.
- Payment method and payment status.
- Stripe checkout session ID when created.

## Remaining Build Work

- Add editable request detail pages instead of only list cards.
- Add status workflow controls for new, scheduled, completed, cancelled, and refunded visits.
- Add payment reconciliation for Square on-site payments.
- Add staff/user roles and audit logging before storing larger volumes of confidential records.
- Add encrypted document upload support only if prescriptions, lab orders, or insurance cards will be stored.
