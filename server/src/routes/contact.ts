import { Router, type Request } from 'express';
import { Resend } from 'resend';
import type Stripe from 'stripe';
import { calculateIntakeVisitPrice, calculateVisitPrice } from '../config/pricing.js';
import { pool } from '../config/database.js';
import { getStripeClient, getStripeCurrency, getStripeWebhookSecret } from '../config/stripe.js';
import { validateContactSubmission } from '../validation/intake.js';

const router = Router();

type ContactRequest = {
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
  patientName?: string;
  appointmentFor?: string;
  relationshipToPatient?: string;
  patientIsMinor?: boolean;
  guardianAuthorization?: boolean;
  requestType?: string;
  serviceArea?: string;
  zipCode?: string;
  preferredDate?: string;
  preferredTimeWindow?: string;
  hasKit?: boolean;
  streetAddress?: string;
  addressDetails?: string;
  town?: string;
  state?: string;
  preferredLab?: string;
  prescriptionReady?: boolean;
  notes?: string;
  oneWayTravelMinutes?: number;
  isStatOrRush?: boolean;
  isWeekendOrHoliday?: boolean;
  patientCount?: number;
  kitCount?: number;
  additionalPatientFeeCents?: number;
  paymentMethod?: string;
  insuranceProvider?: string;
  insuranceMemberId?: string;
  insuranceGroupNumber?: string;
  policyholderName?: string;
  termsAccepted?: boolean;
};

type SavedContactRequest = {
  id: string;
  cancelToken: string | null;
  patientConfirmToken: string | null;
  mrsmsDecisionToken: string | null;
  quotedPriceCents: number | null;
};

type CancellationRow = {
  id?: string;
  fullName: string;
  email: string | null;
  phone: string;
  preferredDate: string | Date | null;
  preferredTimeWindow: string | null;
  status: string;
  cancelToken?: string | null;
  patientConfirmToken?: string | null;
  patientConfirmedAt?: string | Date | null;
  reminderTwoDaySentAt?: string | Date | null;
  reminderOneDaySentAt?: string | Date | null;
  autoCancelledAt?: string | Date | null;
  mrsmsDecisionToken?: string | null;
};

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const contactToEmail = process.env.CONTACT_TO_EMAIL || 'dirving.mrsms@gmail.com';
const contactFromEmail = process.env.CONTACT_FROM_EMAIL || 'M.R.S. Medical Services <onboarding@resend.dev>';
let databaseReady = false;
const appointmentConfirmationNote =
  'Appointment requests must be confirmed by M.R.S. Medical Services. Requests that are not confirmed will be canceled. Appointments must be canceled at least 24 hours in advance.';
const kitScheduleNote = 'Specialty kit collections must be scheduled before 10 AM.';
const reminderIntervalMs = 60 * 60 * 1000;
const checkoutReservationMinutes = 30;
const decisionTokenValidityMs = 21 * 24 * 60 * 60 * 1000;
let remindersStarted = false;

function cleanField(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanOptionalNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL);
}

export async function ensureDatabase() {
  if (databaseReady || !hasDatabaseUrl()) return;

  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS contact_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name TEXT NOT NULL,
      email TEXT,
      phone TEXT NOT NULL,
      zip_code VARCHAR(10),
      message TEXT,
      patient_name TEXT,
      appointment_for TEXT,
      relationship_to_patient TEXT,
      patient_is_minor BOOLEAN,
      guardian_authorization BOOLEAN,
      street_address TEXT,
      address_details TEXT,
      town TEXT,
      state TEXT,
      preferred_lab TEXT,
      prescription_ready BOOLEAN,
      has_kit BOOLEAN,
      patient_count INTEGER,
      kit_count INTEGER,
      status VARCHAR(30) NOT NULL DEFAULT 'new',
      request_type VARCHAR(30) NOT NULL DEFAULT 'contact',
      service_area TEXT,
      preferred_date DATE,
      preferred_time_window TEXT,
      cancel_token UUID UNIQUE DEFAULT gen_random_uuid(),
      patient_confirm_token UUID UNIQUE DEFAULT gen_random_uuid(),
      patient_confirmed_at TIMESTAMPTZ,
      mrsms_confirmed_at TIMESTAMPTZ,
      mrsms_decision_token UUID UNIQUE DEFAULT gen_random_uuid(),
      reminder_two_day_sent_at TIMESTAMPTZ,
      reminder_one_day_sent_at TIMESTAMPTZ,
      unconfirmed_notice_sent_at TIMESTAMPTZ,
      auto_cancelled_at TIMESTAMPTZ,
      canceled_at TIMESTAMPTZ,
      cancellation_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS request_type VARCHAR(30) NOT NULL DEFAULT \'contact\'');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS service_area TEXT');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS preferred_date DATE');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS preferred_time_window TEXT');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS patient_name TEXT');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS appointment_for TEXT');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS relationship_to_patient TEXT');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS patient_is_minor BOOLEAN');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS guardian_authorization BOOLEAN');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS street_address TEXT');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS address_details TEXT');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS town TEXT');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS state TEXT');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS preferred_lab TEXT');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS prescription_ready BOOLEAN');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS has_kit BOOLEAN');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS patient_count INTEGER');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS kit_count INTEGER');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS cancel_token UUID');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS patient_confirm_token UUID');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS patient_confirmed_at TIMESTAMPTZ');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS mrsms_confirmed_at TIMESTAMPTZ');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS mrsms_decision_token UUID');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS reminder_two_day_sent_at TIMESTAMPTZ');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS reminder_one_day_sent_at TIMESTAMPTZ');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS unconfirmed_notice_sent_at TIMESTAMPTZ');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS auto_cancelled_at TIMESTAMPTZ');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS cancellation_reason TEXT');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS quoted_price_cents INTEGER');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS pricing_quote JSONB');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS payment_method TEXT');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS payment_status TEXT');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS insurance_details JSONB');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS decision_token_expires_at TIMESTAMPTZ');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS decision_token_used_at TIMESTAMPTZ');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS payment_review_status TEXT');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS refund_amount_cents INTEGER');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT');
  await pool.query('UPDATE contact_requests SET cancel_token = gen_random_uuid() WHERE cancel_token IS NULL');
  await pool.query('UPDATE contact_requests SET patient_confirm_token = gen_random_uuid() WHERE patient_confirm_token IS NULL');
  await pool.query('UPDATE contact_requests SET mrsms_decision_token = gen_random_uuid() WHERE mrsms_decision_token IS NULL');
  await pool.query('CREATE INDEX IF NOT EXISTS contact_requests_created_at_idx ON contact_requests (created_at DESC)');
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS contact_requests_cancel_token_idx ON contact_requests (cancel_token)');
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS contact_requests_patient_confirm_token_idx ON contact_requests (patient_confirm_token)');
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS contact_requests_mrsms_decision_token_idx ON contact_requests (mrsms_decision_token)');
  await pool.query('CREATE INDEX IF NOT EXISTS contact_requests_preferred_date_idx ON contact_requests (preferred_date)');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS appointment_slot_reservations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      contact_request_id UUID NOT NULL REFERENCES contact_requests(id) ON DELETE CASCADE,
      stripe_checkout_session_id TEXT,
      preferred_date DATE NOT NULL,
      preferred_time_window TEXT NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'reserved',
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS appointment_slot_reservations_date_idx ON appointment_slot_reservations (preferred_date)');
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS appointment_slot_reservations_active_slot_idx
    ON appointment_slot_reservations (preferred_date, preferred_time_window)
    WHERE status IN ('reserved', 'held', 'confirmed')
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stripe_webhook_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      contact_request_id UUID,
      stripe_checkout_session_id TEXT,
      status VARCHAR(30) NOT NULL DEFAULT 'processed',
      last_error TEXT,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query('ALTER TABLE stripe_webhook_events ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT \'processed\'');
  await pool.query('ALTER TABLE stripe_webhook_events ADD COLUMN IF NOT EXISTS last_error TEXT');
  databaseReady = true;
}

function cleanRequestType(value: string) {
  return value === 'intake' || value === 'manual_intake' ? value : 'contact';
}

function cleanPaymentMethod(value: string) {
  return value === 'card' || value === 'insurance' || value === 'pay_at_site' ? value : 'card';
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getSiteOrigin(request: Request) {
  const configuredOrigin = cleanField(process.env.SITE_ORIGIN || process.env.CLIENT_ORIGIN);
  if (configuredOrigin) return configuredOrigin.replace(/\/$/, '');

  if (process.env.NODE_ENV === 'production') {
    throw new Error('SITE_ORIGIN is not configured.');
  }

  const requestOrigin = cleanField(request.get('origin'));
  if (requestOrigin) return requestOrigin.replace(/\/$/, '');

  return `${request.protocol}://${request.get('host')}`.replace(/\/$/, '');
}

function getDateKey(value: string | Date | null) {
  if (!value) return '';

  const raw = value instanceof Date ? value.toISOString() : value;
  const dateOnly = raw.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  return dateOnly || raw;
}

function getTimeWindowStartHour(value: string | null) {
  const match = cleanField(value).match(/^(\d+)\s(AM|PM)/);
  if (!match) return 0;

  const hour = Number(match[1]);
  if (match[2] === 'AM') return hour === 12 ? 0 : hour;
  return hour === 12 ? 12 : hour + 12;
}

function getAppointmentDateTime(value: string | Date | null, timeWindow: string | null) {
  const dateKey = getDateKey(value);
  if (!dateKey) return null;

  const hour = getTimeWindowStartHour(timeWindow);
  const appointmentDate = new Date(`${dateKey}T${String(hour).padStart(2, '0')}:00:00-04:00`);
  return Number.isNaN(appointmentDate.getTime()) ? null : appointmentDate;
}

function canCancelOnline(row: CancellationRow) {
  if (row.status === 'cancelled') return false;

  const appointmentDate = getAppointmentDateTime(row.preferredDate, row.preferredTimeWindow);
  if (!appointmentDate) return false;

  const millisecondsRemaining = appointmentDate.getTime() - Date.now();
  return millisecondsRemaining >= 24 * 60 * 60 * 1000;
}

function toCancellationDetails(row: CancellationRow) {
  const canCancel = canCancelOnline(row);

  return {
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    preferredDate: getDateKey(row.preferredDate),
    preferredTimeWindow: row.preferredTimeWindow || 'Not specified',
    status: row.status,
    canCancel,
    message: canCancel
      ? undefined
      : 'This appointment request can no longer be canceled online. Please call M.R.S. Medical Services.',
  };
}

function formatAppointmentDate(value: string | Date | null) {
  const dateKey = getDateKey(value);
  if (!dateKey) return 'Not specified';

  const [year, month, day] = dateKey.split('-').map(Number);
  const date = year && month && day ? new Date(year, month - 1, day) : new Date(dateKey);
  if (Number.isNaN(date.getTime())) return dateKey;

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function getAppointmentLabel(date: string | Date | null, timeWindow: string | null) {
  return `${formatAppointmentDate(date)}${timeWindow ? `, ${timeWindow}` : ''}`;
}

function formatSubmittedAt(value: Date) {
  return value.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderEmailHtml(title: string, paragraphs: string[], actions: Array<{ label: string; url: string }> = []) {
  const actionHtml = actions
    .filter((action) => action.url)
    .map(
      (action) => `
        <p style="margin: 28px 0;">
          <a href="${escapeHtml(action.url)}" style="display:inline-block; padding:14px 20px; background-color:#062948 !important; border:2px solid #062948; color:#ffffff !important; text-decoration:none !important; border-radius:4px; font-weight:700;">
            ${escapeHtml(action.label)}
          </a>
        </p>
      `,
    )
    .join('');

  return `
    <div style="margin:0; padding:0; background:#f5f9fa;">
      <div style="max-width:640px; margin:0 auto; padding:32px 18px; font-family: Arial, Helvetica, sans-serif; color:#173044;">
        <div style="background:#ffffff; border:1px solid #dbe7ea; border-radius:6px; padding:30px;">
          <h1 style="margin:0 0 22px; color:#062948; font-size:30px; line-height:1.12; font-family: Georgia, 'Times New Roman', serif;">
            ${escapeHtml(title)}
          </h1>
          ${paragraphs.map((paragraph) => `<p style="margin:0 0 16px; font-size:16px; line-height:1.55;">${escapeHtml(paragraph)}</p>`).join('')}
          ${actionHtml}
          <p style="margin:28px 0 0; font-size:15px; line-height:1.55;">Thank you,<br>M.R.S. Medical Services</p>
        </div>
      </div>
    </div>
  `;
}

function renderEmailText(title: string, paragraphs: string[], actions: Array<{ label: string; url: string }> = []) {
  return [
    title,
    '',
    ...paragraphs.flatMap((paragraph) => [paragraph, '']),
    ...actions.filter((action) => action.url).flatMap((action) => [action.label, action.url, '']),
    'Thank you,',
    'M.R.S. Medical Services',
  ].join('\n');
}

function renderIntakeNotificationEmail({
  body,
  submittedAt,
  confirmUrl,
  denyUrl,
}: {
  body: ContactRequest;
  submittedAt: string;
  confirmUrl: string;
  denyUrl: string;
}) {
  const appointmentDate = formatAppointmentDate(cleanField(body.preferredDate));
  const appointmentTime = cleanField(body.preferredTimeWindow) || 'Not specified';
  const addressLines = [
    cleanField(body.streetAddress),
    cleanField(body.addressDetails),
    [cleanField(body.town), cleanField(body.state), cleanField(body.zipCode)].filter(Boolean).join(', '),
  ].filter(Boolean);
  const notes = cleanField(body.notes) || 'None';
  const patientCount = cleanOptionalNumber(body.patientCount) || 1;
  const kitCount = body.hasKit ? cleanOptionalNumber(body.kitCount) || 1 : 0;
  const rows = [
    ['Scheduling contact', cleanField(body.name)],
    ['Phone', cleanField(body.phone)],
    ['Email', cleanField(body.email) || 'Not provided'],
    ['Group appointment', patientCount > 1 ? 'Yes' : 'No'],
    ['Number of people', String(patientCount)],
    ['Preferred lab', cleanField(body.preferredLab) || 'Not specified'],
    ['Prescription/order ready', body.prescriptionReady ? 'Yes' : 'No'],
    ['Specialty kit', body.hasKit ? 'Yes' : 'No'],
    ['Number of specialty kits', body.hasKit ? String(kitCount) : 'Not applicable'],
    ['Submitted', submittedAt],
  ];
  const actionText = [
    confirmUrl ? `Confirm appointment: ${confirmUrl}` : '',
    denyUrl ? `Deny appointment: ${denyUrl}` : '',
  ].filter(Boolean).join('\n');

  const html = `
    <div style="margin:0; padding:0; background:#f5f9fa;">
      <div style="max-width:680px; margin:0 auto; padding:34px 18px; font-family:Arial, Helvetica, sans-serif; color:#173044;">
        <div style="background:#ffffff; border:1px solid #dbe7ea; border-radius:8px; overflow:hidden;">
          <div style="padding:28px 30px; background:#062948; color:#ffffff;">
            <p style="margin:0 0 8px; color:#7ed6da; font-size:13px; font-weight:700; letter-spacing:.06em; text-transform:uppercase;">New appointment request</p>
            <h1 style="margin:0; font-family:Georgia, 'Times New Roman', serif; font-size:31px; line-height:1.12;">${escapeHtml(appointmentDate)}</h1>
            <p style="margin:10px 0 0; font-size:19px; line-height:1.35;">${escapeHtml(appointmentTime)}</p>
          </div>

          <div style="padding:30px;">
            <div style="margin:0 0 26px; padding:20px; border:1px solid #dbe7ea; border-left:5px solid #008c95; background:#f8fcfd;">
              <h2 style="margin:0 0 12px; color:#062948; font-size:18px;">Visit address</h2>
              ${addressLines.length ? addressLines.map((line) => `<p style="margin:0 0 7px; font-size:16px; line-height:1.45;">${escapeHtml(line)}</p>`).join('') : '<p style="margin:0; font-size:16px;">Not provided</p>'}
            </div>

            <div style="margin:0 0 26px;">
              <h2 style="margin:0 0 14px; color:#062948; font-size:18px;">Scheduling contact</h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                ${rows.map(([label, value]) => `
                  <tr>
                    <td style="padding:10px 12px; border-top:1px solid #e6eef0; color:#607383; width:42%; font-size:14px;">${escapeHtml(label)}</td>
                    <td style="padding:10px 12px; border-top:1px solid #e6eef0; color:#173044; font-size:15px; font-weight:700;">${escapeHtml(value || 'Not provided')}</td>
                  </tr>
                `).join('')}
              </table>
            </div>

            <div style="margin:0 0 28px; padding:18px 20px; background:#f8fcfd; border:1px solid #dbe7ea;">
              <h2 style="margin:0 0 10px; color:#062948; font-size:18px;">Notes</h2>
              <p style="margin:0; white-space:pre-wrap; font-size:16px; line-height:1.55;">${escapeHtml(notes)}</p>
            </div>

            <div style="display:block; margin:0 0 10px;">
              ${confirmUrl ? `<a href="${escapeHtml(confirmUrl)}" style="display:inline-block; margin:0 10px 12px 0; padding:13px 18px; background:#062948; color:#ffffff; text-decoration:none; border-radius:4px; font-weight:700;">Confirm appointment</a>` : ''}
              ${denyUrl ? `<a href="${escapeHtml(denyUrl)}" style="display:inline-block; margin:0 0 12px 0; padding:13px 18px; background:#ffffff; color:#b70f1e; text-decoration:none; border:1px solid #b70f1e; border-radius:4px; font-weight:700;">Deny appointment</a>` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const text = [
    'New appointment request',
    '',
    `Appointment date: ${appointmentDate}`,
    `Appointment time: ${appointmentTime}`,
    '',
    'Visit address:',
    ...(addressLines.length ? addressLines : ['Not provided']),
    '',
    ...rows.flatMap(([label, value]) => [`${label}: ${value || 'Not provided'}`]),
    '',
    'Notes:',
    notes,
    '',
    actionText,
  ].join('\n');

  return { html, text };
}

async function sendEmail({
  to,
  replyTo,
  subject,
  title,
  paragraphs,
  actions = [],
}: {
  to: string;
  replyTo?: string;
  subject: string;
  title: string;
  paragraphs: string[];
  actions?: Array<{ label: string; url: string }>;
}) {
  if (!resend) return;

  await resend.emails.send({
    from: contactFromEmail,
    to,
    replyTo: replyTo || contactToEmail,
    subject,
    text: renderEmailText(title, paragraphs, actions),
    html: renderEmailHtml(title, paragraphs, actions),
  });
}

function getConfirmUrl(request: Request, token: string | null | undefined) {
  return token ? `${getSiteOrigin(request)}/confirm?token=${token}` : '';
}

function getCancelUrl(request: Request, token: string | null | undefined) {
  return token ? `${getSiteOrigin(request)}/cancel?token=${token}` : '';
}

function getPaymentStatus(paymentMethod: string, checkoutUrl?: string) {
  if (paymentMethod === 'card') return checkoutUrl ? 'checkout_pending' : 'payment_pending';
  if (paymentMethod === 'insurance') return 'insurance_pending';
  return 'pay_at_site';
}

function isUniqueSlotConflict(error: unknown) {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505';
}

async function expireStaleReservations(queryable: { query: (text: string, params?: unknown[]) => Promise<unknown> }) {
  await queryable.query(`
    UPDATE appointment_slot_reservations
    SET status = 'expired',
      updated_at = NOW()
    WHERE status = 'reserved'
      AND expires_at IS NOT NULL
      AND expires_at <= NOW()
  `);
}

function getInsuranceDetails(body: ContactRequest) {
  return {
    provider: cleanField(body.insuranceProvider),
    memberId: cleanField(body.insuranceMemberId),
    groupNumber: cleanField(body.insuranceGroupNumber),
    policyholderName: cleanField(body.policyholderName),
  };
}

export async function updatePaymentStatus(id: string, paymentStatus: string, checkoutSessionId?: string) {
  await pool.query(
    `UPDATE contact_requests
     SET payment_status = $2,
       stripe_checkout_session_id = COALESCE($3, stripe_checkout_session_id),
       updated_at = NOW()
     WHERE id = $1`,
    [id, paymentStatus, checkoutSessionId || null],
  );
  if (checkoutSessionId) {
    await pool.query(
      `UPDATE appointment_slot_reservations
       SET stripe_checkout_session_id = $2,
         updated_at = NOW()
       WHERE contact_request_id = $1`,
      [id, checkoutSessionId],
    );
  }
}

function formatMoneyFromCents(value: number | null | undefined) {
  if (!value) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value / 100);
}

async function sendIntakeReceivedEmail(
  row: CancellationRow,
  hasKit: boolean,
  payment?: { paid: boolean; amountCents?: number | null; transactionId?: string | null; receiptUrl?: string | null },
) {
  if (!row.email) return;

  const cancelUrl = row.cancelToken ? `${getConfiguredSiteOrigin()}/cancel?token=${row.cancelToken}` : '';
  const appointmentLabel = getAppointmentLabel(row.preferredDate, row.preferredTimeWindow);
  if (payment?.paid) {
    await sendEmail({
      to: row.email,
      subject: 'M.R.S. Medical Services appointment confirmed',
      title: 'Appointment confirmed',
      paragraphs: [
        `Hi ${row.fullName},`,
        `M.R.S. Medical Services has confirmed your appointment for ${appointmentLabel}.`,
        `Receipt: ${formatMoneyFromCents(payment.amountCents) || 'Paid'} by secure card checkout.`,
        `Transaction number: ${payment.transactionId || 'Provided by Stripe checkout'}.`,
        'Please put all pets away for the safety of the techs, and fast for 12 hours if required by the doctor.',
        'Appointments must be canceled at least 24 hours in advance.',
        ...(payment.receiptUrl ? [`Stripe receipt: ${payment.receiptUrl}`] : []),
        ...(hasKit ? [kitScheduleNote] : []),
      ],
      actions: cancelUrl ? [{ label: 'Cancel appointment', url: cancelUrl }] : [],
    });
    return;
  }

  await sendEmail({
    to: row.email,
    subject: 'M.R.S. Medical Services visit request received',
    title: 'Visit request received',
    paragraphs: [
      `Hi ${row.fullName},`,
      `Thank you for requesting an appointment with M.R.S. Medical Services. We received your request for ${appointmentLabel}.`,
      'This is not a confirmed appointment yet. M.R.S. Medical Services will review the request and contact you to confirm the appointment.',
      'Please put all pets away for the safety of the techs, and fast for 12 hours if required by the doctor.',
      'Appointments must be canceled at least 24 hours in advance.',
      ...(cancelUrl ? [`Cancellation link: ${cancelUrl}`] : []),
      ...(hasKit ? [kitScheduleNote] : []),
    ],
    actions: cancelUrl ? [{ label: 'Cancel appointment request', url: cancelUrl }] : [],
  });
}

async function createPatientCheckoutSession(request: Request, savedRequest: SavedContactRequest, body: ContactRequest) {
  const stripe = getStripeClient();
  if (!stripe || !savedRequest.quotedPriceCents) return null;

  const origin = getSiteOrigin(request);
  const expiresAt = Math.floor(Date.now() / 1000) + checkoutReservationMinutes * 60;
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    expires_at: expiresAt,
    success_url: `${origin}/intake?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/intake?payment=cancelled`,
    customer_email: cleanField(body.email),
    client_reference_id: savedRequest.id,
    metadata: {
      contactRequestId: savedRequest.id,
      paymentFor: 'patient_intake',
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: getStripeCurrency(),
          unit_amount: savedRequest.quotedPriceCents,
          product_data: {
            name: 'M.R.S. Medical Services visit',
          },
        },
      },
    ],
  });

  await updatePaymentStatus(savedRequest.id, 'checkout_pending', session.id);
  return session.url;
}

function getSessionPaymentDetails(session: Stripe.Checkout.Session) {
  const paymentIntent = session.payment_intent;
  const paymentIntentId = typeof paymentIntent === 'string' ? paymentIntent : paymentIntent?.id || null;
  const latestCharge = typeof paymentIntent === 'object' && paymentIntent && 'latest_charge' in paymentIntent
    ? paymentIntent.latest_charge
    : null;
  const receiptUrl = typeof latestCharge === 'object' && latestCharge && 'receipt_url' in latestCharge
    ? latestCharge.receipt_url || null
    : null;

  return {
    paymentIntentId,
    receiptUrl,
  };
}

async function confirmPaidCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== 'paid' || !session.client_reference_id) return null;

  // Only sessions created for the patient intake checkout flow are allowed to
  // auto-confirm an appointment. Metadata is set by createPatientCheckoutSession
  // and by the admin billing endpoint when it is invoicing an existing request
  // for its stored quote; ad-hoc admin invoices without that metadata are
  // recorded by Stripe but intentionally do not touch appointment state here.
  if (session.metadata?.paymentFor !== 'patient_intake') return null;
  if (session.metadata?.contactRequestId !== session.client_reference_id) return null;

  const sessionCurrency = (session.currency || '').toLowerCase();
  if (sessionCurrency !== getStripeCurrency()) {
    console.error('Stripe session currency mismatch', session.id, sessionCurrency);
    return null;
  }

  await ensureDatabase();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query<CancellationRow>(
      `UPDATE contact_requests
       SET payment_status = 'paid',
         stripe_checkout_session_id = $2,
         status = 'mrsms_confirmed',
         mrsms_confirmed_at = COALESCE(mrsms_confirmed_at, NOW()),
         cancel_token = COALESCE(cancel_token, gen_random_uuid()),
         updated_at = NOW()
       WHERE id = $1
         AND request_type = 'intake'
         AND canceled_at IS NULL
         AND auto_cancelled_at IS NULL
         AND payment_status IS DISTINCT FROM 'paid'
         AND stripe_checkout_session_id = $2
         AND quoted_price_cents = $3
       RETURNING
         id,
         full_name AS "fullName",
         email,
         phone,
         preferred_date AS "preferredDate",
         preferred_time_window AS "preferredTimeWindow",
         status,
         cancel_token AS "cancelToken"`,
      [session.client_reference_id, session.id, session.amount_total],
    );
    const row = result.rows[0];
    if (!row) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query(
      `UPDATE appointment_slot_reservations
       SET status = 'confirmed',
         stripe_checkout_session_id = $2,
         expires_at = NULL,
         updated_at = NOW()
       WHERE contact_request_id = $1`,
      [session.client_reference_id, session.id],
    );

    await client.query('COMMIT');
    return row;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function expireCheckoutSessionReservation(session: Stripe.Checkout.Session) {
  if (!session.client_reference_id) return;

  await ensureDatabase();
  await pool.query(
    `UPDATE contact_requests
     SET payment_status = CASE WHEN payment_status = 'checkout_pending' THEN 'checkout_expired' ELSE payment_status END,
       updated_at = NOW()
     WHERE id = $1
       AND request_type = 'intake'
       AND payment_status <> 'paid'`,
    [session.client_reference_id],
  );
  await pool.query(
    `UPDATE appointment_slot_reservations
     SET status = 'expired',
       updated_at = NOW()
     WHERE contact_request_id = $1
       AND status = 'reserved'`,
    [session.client_reference_id],
  );
}

async function releasePendingCheckoutReservation(contactRequestId: string) {
  await pool.query(
    `UPDATE appointment_slot_reservations
     SET status = 'expired',
       updated_at = NOW()
     WHERE contact_request_id = $1
       AND status = 'reserved'`,
    [contactRequestId],
  );
}

export async function saveContactRequest(body: ContactRequest): Promise<SavedContactRequest | null> {
  if (!hasDatabaseUrl()) return null;

  await ensureDatabase();

  const name = cleanField(body.name);
  const phone = cleanField(body.phone);
  const email = cleanField(body.email);
  const message = cleanField(body.message);
  const requestType = cleanRequestType(cleanField(body.requestType));
  const serviceArea = cleanField(body.serviceArea) || null;
  const zipCode = cleanField(body.zipCode) || null;
  const preferredDate = cleanField(body.preferredDate) || null;
  const preferredTimeWindow = cleanField(body.preferredTimeWindow) || null;
  const patientName = cleanField(body.patientName) || name;
  const appointmentFor = cleanField(body.appointmentFor) || 'self';
  const relationshipToPatient = cleanField(body.relationshipToPatient) || (appointmentFor === 'self' ? 'Self' : null);
  const streetAddress = cleanField(body.streetAddress) || null;
  const addressDetails = cleanField(body.addressDetails) || null;
  const town = cleanField(body.town) || null;
  const state = cleanField(body.state) || null;
  const preferredLab = cleanField(body.preferredLab) || null;
  const prescriptionReady = typeof body.prescriptionReady === 'boolean' ? body.prescriptionReady : null;
  const hasKit = body.hasKit === true;
  const patientCount = cleanOptionalNumber(body.patientCount) || 1;
  const kitCount = hasKit ? cleanOptionalNumber(body.kitCount) || 1 : 0;
  const paymentMethod = requestType === 'intake' ? cleanPaymentMethod(cleanField(body.paymentMethod)) : null;
  const insuranceDetails = paymentMethod === 'insurance' ? getInsuranceDetails(body) : null;
  const oneWayTravelMinutes = cleanOptionalNumber(body.oneWayTravelMinutes);
  const hasPricingInputs = oneWayTravelMinutes !== undefined ||
    body.isStatOrRush === true ||
    body.isWeekendOrHoliday === true ||
    cleanOptionalNumber(body.patientCount) !== undefined ||
    cleanOptionalNumber(body.kitCount) !== undefined ||
    cleanOptionalNumber(body.additionalPatientFeeCents) !== undefined;
  const priceQuote = requestType === 'intake'
    ? calculateIntakeVisitPrice({
      zipCode,
      appointmentDate: preferredDate,
      timeWindow: preferredTimeWindow,
      patientCount,
      kitCount,
    })
    : hasPricingInputs
    ? calculateVisitPrice({
        oneWayTravelMinutes,
        appointmentDate: preferredDate,
        timeWindow: preferredTimeWindow,
        isStatOrRush: body.isStatOrRush === true,
        isWeekendOrHoliday: body.isWeekendOrHoliday === true,
        patientCount,
        additionalPatientFeeCents: cleanOptionalNumber(body.additionalPatientFeeCents),
        kitCount,
      })
    : null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await expireStaleReservations(client);

    const result = await client.query<SavedContactRequest>(
      `INSERT INTO contact_requests (
        full_name,
        email,
        phone,
        zip_code,
        message,
        patient_name,
        appointment_for,
        relationship_to_patient,
        patient_is_minor,
        guardian_authorization,
        street_address,
        address_details,
        town,
        state,
        preferred_lab,
        prescription_ready,
        has_kit,
        patient_count,
        kit_count,
        request_type,
        service_area,
        preferred_date,
        preferred_time_window,
        quoted_price_cents,
        pricing_quote,
        payment_method,
        payment_status,
        insurance_details,
        decision_token_expires_at
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25,
        $26, $27, $28, $29
      )
      RETURNING
        id,
        cancel_token AS "cancelToken",
        patient_confirm_token AS "patientConfirmToken",
        mrsms_decision_token AS "mrsmsDecisionToken",
        quoted_price_cents AS "quotedPriceCents"`,
      [
        name,
        email || null,
        phone,
        zipCode,
        message || null,
        patientName,
        appointmentFor,
        relationshipToPatient,
        body.patientIsMinor === true,
        body.patientIsMinor === true ? body.guardianAuthorization === true : null,
        streetAddress,
        addressDetails,
        town,
        state,
        preferredLab,
        prescriptionReady,
        hasKit,
        patientCount,
        kitCount,
        requestType,
        serviceArea,
        preferredDate,
        preferredTimeWindow,
        priceQuote?.totalCents ?? null,
        priceQuote ? JSON.stringify(priceQuote) : null,
        paymentMethod,
        paymentMethod ? getPaymentStatus(paymentMethod) : null,
        insuranceDetails ? JSON.stringify(insuranceDetails) : null,
        requestType === 'intake' ? new Date(Date.now() + decisionTokenValidityMs) : null,
      ],
    );

    const saved = result.rows[0] ?? null;
    if (saved && requestType === 'intake' && preferredDate && preferredTimeWindow) {
      const reservationStatus = paymentMethod === 'card' ? 'reserved' : 'held';
      const reservationExpiresAt =
        reservationStatus === 'reserved' ? new Date(Date.now() + checkoutReservationMinutes * 60000) : null;
      await client.query(
        `INSERT INTO appointment_slot_reservations (
          contact_request_id,
          preferred_date,
          preferred_time_window,
          status,
          expires_at
        )
        VALUES ($1, $2, $3, $4, $5)`,
        [saved.id, preferredDate, preferredTimeWindow, reservationStatus, reservationExpiresAt],
      );
    }

    await client.query('COMMIT');
    return saved;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

router.post('/', async (request, response) => {
  const body = request.body as ContactRequest;
  const name = cleanField(body.name);
  const phone = cleanField(body.phone);
  const email = cleanField(body.email);
  const message = cleanField(body.message);
  const requestType = cleanRequestType(cleanField(body.requestType));
  const hasKit = body.hasKit === true;
  const paymentMethod = requestType === 'intake' ? cleanPaymentMethod(cleanField(body.paymentMethod)) : null;

  const validationError = validateContactSubmission(body as Record<string, unknown>);
  if (validationError) {
    response.status(400).json({ message: validationError });
    return;
  }

  if (!resend && !hasDatabaseUrl()) {
    response.status(500).json({ message: 'Contact form is not configured.' });
    return;
  }

  const replyTo = email || contactToEmail;
  const submittedAt = formatSubmittedAt(new Date());

  let savedRequest: SavedContactRequest | null = null;

  try {
    savedRequest = await saveContactRequest(body);
  } catch (error) {
    console.error('Contact request save failed', error);
    response
      .status(isUniqueSlotConflict(error) ? 409 : 500)
      .json({
        message: isUniqueSlotConflict(error)
          ? 'That appointment time was just taken. Please choose another available time.'
          : 'Message could not be saved right now.',
      });
    return;
  }

  let checkoutUrl: string | null = null;
  if (requestType === 'intake' && paymentMethod === 'card') {
    try {
      checkoutUrl = savedRequest ? await createPatientCheckoutSession(request, savedRequest, body) : null;
    } catch (error) {
      console.error('Patient Stripe checkout failed', error);
      if (savedRequest) {
        await releasePendingCheckoutReservation(savedRequest.id).catch((releaseError) => {
          console.error('Checkout reservation release failed', releaseError);
        });
      }
      response.status(500).json({ message: 'Secure checkout could not be started right now.' });
      return;
    }

    if (!checkoutUrl) {
      response.status(503).json({ message: 'Secure checkout is not configured right now. Please choose another payment option or call M.R.S. Medical Services.' });
      return;
    }
  }

  if (!resend) {
    response.json({ message: 'Message saved successfully.', id: savedRequest?.id, checkoutUrl });
    return;
  }

  try {
    if (requestType === 'intake') {
      const decisionToken = savedRequest?.mrsmsDecisionToken;
      const confirmUrl = decisionToken ? `${getSiteOrigin(request)}/appointment-review?token=${decisionToken}&decision=confirm` : '';
      const denyUrl = decisionToken ? `${getSiteOrigin(request)}/appointment-review?token=${decisionToken}&decision=deny` : '';
      const intakeEmail = renderIntakeNotificationEmail({ body, submittedAt, confirmUrl, denyUrl });
      await resend.emails.send({
        from: contactFromEmail,
        to: contactToEmail,
        replyTo,
        subject: `New M.R.S. Medical Services intake request for ${getAppointmentLabel(body.preferredDate || '', body.preferredTimeWindow || '')}`,
        text: intakeEmail.text,
        html: intakeEmail.html,
      });
    } else {
      await sendEmail({
        to: contactToEmail,
        replyTo,
        subject: `New M.R.S. Medical Services message from ${name}`,
        title: 'New website message',
        paragraphs: [
          `Name: ${name}`,
          `Phone: ${phone}`,
          `Email: ${email}`,
          `Submitted: ${submittedAt}`,
          message,
        ],
      });
    }

    if (requestType === 'intake' && paymentMethod !== 'card') {
      await sendIntakeReceivedEmail({
        fullName: name,
        email,
        phone,
        preferredDate: cleanField(body.preferredDate),
        preferredTimeWindow: cleanField(body.preferredTimeWindow),
        status: 'new',
        cancelToken: savedRequest?.cancelToken,
      }, hasKit);
    }

    response.json({ message: 'Message sent successfully.', id: savedRequest?.id, checkoutUrl });
  } catch (error) {
    console.error('Resend contact email failed', error);
    response.json({ message: 'Message saved successfully.', id: savedRequest?.id, checkoutUrl });
  }
});

router.post('/stripe-webhook', async (request, response) => {
  const stripe = getStripeClient();
  const webhookSecret = getStripeWebhookSecret();
  const signature = request.header('stripe-signature');

  if (!stripe || !webhookSecret || !signature) {
    response.status(503).json({ message: 'Stripe webhook is not configured.' });
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(request.body, signature, webhookSecret);
  } catch (error) {
    console.error('Stripe webhook signature verification failed', error);
    response.status(400).json({ message: 'Invalid Stripe signature.' });
    return;
  }

  try {
    await ensureDatabase();
    const eventRecord = await pool.query<{ status: string }>(
      `INSERT INTO stripe_webhook_events (id, event_type, status, last_error)
       VALUES ($1, $2, 'processing', NULL)
       ON CONFLICT (id) DO UPDATE
       SET event_type = EXCLUDED.event_type,
         status = CASE
           WHEN stripe_webhook_events.status = 'processed' THEN stripe_webhook_events.status
           ELSE 'processing'
         END,
         last_error = CASE
           WHEN stripe_webhook_events.status = 'processed' THEN stripe_webhook_events.last_error
           ELSE NULL
         END
       RETURNING status`,
      [event.id, event.type],
    );
    if (eventRecord.rows[0]?.status === 'processed') {
      response.json({ received: true, duplicate: true });
      return;
    }

    if (event.type === 'checkout.session.completed') {
      const eventSession = event.data.object as Stripe.Checkout.Session;
      const session = await stripe.checkout.sessions.retrieve(eventSession.id, {
        expand: ['payment_intent.latest_charge'],
      });
      const row = await confirmPaidCheckoutSession(session);
      if (row && resend) {
        const { paymentIntentId, receiptUrl } = getSessionPaymentDetails(session);
        await sendIntakeReceivedEmail(row, false, {
          paid: true,
          amountCents: session.amount_total,
          transactionId: paymentIntentId || session.id,
          receiptUrl,
        });
      }
      await pool.query(
        `UPDATE stripe_webhook_events
         SET contact_request_id = $2,
           stripe_checkout_session_id = $3
         WHERE id = $1`,
        [event.id, session.client_reference_id || null, session.id],
      );
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      await expireCheckoutSessionReservation(session);
      await pool.query(
        `UPDATE stripe_webhook_events
         SET contact_request_id = $2,
           stripe_checkout_session_id = $3
         WHERE id = $1`,
        [event.id, session.client_reference_id || null, session.id],
      );
    }

    if (event.type.startsWith('charge.refund') || event.type.startsWith('refund.')) {
      console.info('Stripe refund webhook received before refund workflow is enabled', event.type);
    }

    await pool.query(
      `UPDATE stripe_webhook_events
       SET status = 'processed',
         last_error = NULL,
         processed_at = NOW()
       WHERE id = $1`,
      [event.id],
    );

    response.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook processing failed', error);
    await pool.query(
      `UPDATE stripe_webhook_events
       SET status = 'failed',
         last_error = $2
       WHERE id = $1`,
      [event.id, error instanceof Error ? error.message.slice(0, 500) : 'Unknown webhook processing error'],
    ).catch((updateError) => console.error('Stripe webhook failure state could not be saved', updateError));
    response.status(500).json({ message: 'Stripe webhook could not be processed.' });
  }
});

router.post('/payment-success', async (request, response) => {
  const sessionId = cleanField(request.body?.sessionId);
  if (!sessionId) {
    response.status(400).json({ message: 'Checkout session is required.' });
    return;
  }

  const stripe = getStripeClient();
  if (!stripe || !hasDatabaseUrl()) {
    response.status(503).json({ message: 'Payment confirmation is not configured.' });
    return;
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent.latest_charge'],
    });
    if (session.payment_status !== 'paid' || !session.client_reference_id) {
      response.status(409).json({ message: 'Payment has not been completed yet.' });
      return;
    }

    const row = await confirmPaidCheckoutSession(session);
    if (row && resend) {
      const { paymentIntentId, receiptUrl } = getSessionPaymentDetails(session);
      await sendIntakeReceivedEmail(row, false, {
        paid: true,
        amountCents: session.amount_total,
        transactionId: paymentIntentId || session.id,
        receiptUrl,
      });
    }
    response.json({ message: 'Payment confirmed.' });
  } catch (error) {
    console.error('Payment confirmation failed', error);
    response.status(500).json({ message: 'Payment confirmation could not be completed right now.' });
  }
});

router.post('/payment-cancelled', async (request, response) => {
  const id = cleanField(request.body?.id);
  if (!id || !isUuid(id)) {
    response.status(400).json({ message: 'Appointment request is required.' });
    return;
  }

  if (!hasDatabaseUrl()) {
    response.json({ message: 'Checkout cancelled.' });
    return;
  }

  try {
    await ensureDatabase();
    await pool.query(
      `UPDATE contact_requests
       SET payment_status = CASE WHEN payment_status = 'checkout_pending' THEN 'checkout_cancelled' ELSE payment_status END,
         updated_at = NOW()
       WHERE id = $1
         AND request_type = 'intake'
         AND payment_status <> 'paid'`,
      [id],
    );
    await releasePendingCheckoutReservation(id);
    response.json({ message: 'Checkout cancelled.' });
  } catch (error) {
    console.error('Checkout cancellation release failed', error);
    response.status(500).json({ message: 'Checkout cancellation could not be processed right now.' });
  }
});

router.get('/cancel/:token', async (request, response) => {
  const token = cleanField(request.params.token);
  if (!token || !isUuid(token)) {
    response.status(404).json({ message: 'Appointment request could not be found.' });
    return;
  }

  if (!hasDatabaseUrl()) {
    response.status(503).json({ message: 'Cancellation is not configured right now. Please call M.R.S. Medical Services.' });
    return;
  }

  try {
    await ensureDatabase();
    const result = await pool.query<CancellationRow>(
      `SELECT
        full_name AS "fullName",
        email,
        phone,
        preferred_date AS "preferredDate",
        preferred_time_window AS "preferredTimeWindow",
        status
      FROM contact_requests
      WHERE cancel_token = $1 AND request_type = 'intake'
      LIMIT 1`,
      [token],
    );

    const row = result.rows[0];
    if (!row) {
      response.status(404).json({ message: 'Appointment request could not be found.' });
      return;
    }

    response.json(toCancellationDetails(row));
  } catch (error) {
    console.error('Cancellation lookup failed', error);
    response.status(500).json({ message: 'Appointment request could not be loaded right now.' });
  }
});

router.post('/cancel/:token', async (request, response) => {
  const token = cleanField(request.params.token);
  const reason = cleanField(request.body?.reason);

  if (!token || !isUuid(token)) {
    response.status(404).json({ message: 'Appointment request could not be found.' });
    return;
  }

  if (!reason) {
    response.status(400).json({ message: 'Please enter a reason for cancellation.' });
    return;
  }

  if (!hasDatabaseUrl()) {
    response.status(503).json({ message: 'Cancellation is not configured right now. Please call M.R.S. Medical Services.' });
    return;
  }

  try {
    await ensureDatabase();
    const result = await pool.query<CancellationRow>(
      `SELECT
        full_name AS "fullName",
        email,
        phone,
        preferred_date AS "preferredDate",
        preferred_time_window AS "preferredTimeWindow",
        status
      FROM contact_requests
      WHERE cancel_token = $1 AND request_type = 'intake'
      LIMIT 1`,
      [token],
    );

    const row = result.rows[0];
    if (!row) {
      response.status(404).json({ message: 'Appointment request could not be found.' });
      return;
    }

    if (row.status === 'cancelled') {
      response.status(409).json({ message: 'This appointment request has already been canceled.' });
      return;
    }

    if (!canCancelOnline(row)) {
      response.status(409).json({
        message: 'This appointment request can no longer be canceled online because less than 24 hours remain. Please call (908) 463-7457.',
      });
      return;
    }

    await pool.query(
      `UPDATE contact_requests
      SET status = 'cancelled',
        cancellation_reason = $2,
        canceled_at = NOW(),
        updated_at = NOW()
      WHERE cancel_token = $1`,
      [token, reason],
    );
    await pool.query(
      `UPDATE appointment_slot_reservations
       SET status = 'cancelled',
         updated_at = NOW()
       WHERE contact_request_id = (
         SELECT id FROM contact_requests WHERE cancel_token = $1 LIMIT 1
       )`,
      [token],
    );

    if (resend) {
      await resend.emails.send({
        from: contactFromEmail,
        to: contactToEmail,
        replyTo: row.email || contactToEmail,
        subject: 'M.R.S. Medical Services appointment cancellation',
        text: [
          'A website appointment request was canceled.',
          '',
          `Name: ${row.fullName}`,
          `Phone: ${row.phone}`,
          `Email: ${row.email || 'Not provided'}`,
          `Requested date: ${getDateKey(row.preferredDate) || 'Not specified'}`,
          `Requested time window: ${row.preferredTimeWindow || 'Not specified'}`,
          '',
          'Cancellation reason:',
          reason,
        ].join('\n'),
      });
    }

    response.json({ message: 'Appointment request canceled successfully.' });
  } catch (error) {
    console.error('Cancellation failed', error);
    response.status(500).json({ message: 'Cancellation could not be completed right now.' });
  }
});

router.get('/confirm/:token', async (request, response) => {
  const token = cleanField(request.params.token);
  if (!token || !isUuid(token)) {
    response.status(404).json({ message: 'Appointment request could not be found.' });
    return;
  }

  if (!hasDatabaseUrl()) {
    response.status(503).json({ message: 'Confirmation is not configured right now. Please call M.R.S. Medical Services.' });
    return;
  }

  try {
    await ensureDatabase();
    const result = await pool.query<CancellationRow>(
      `SELECT
        full_name AS "fullName",
        email,
        phone,
        preferred_date AS "preferredDate",
        preferred_time_window AS "preferredTimeWindow",
        status,
        patient_confirmed_at AS "patientConfirmedAt"
      FROM contact_requests
      WHERE patient_confirm_token = $1 AND request_type = 'intake'
      LIMIT 1`,
      [token],
    );

    const row = result.rows[0];
    if (!row) {
      response.status(404).json({ message: 'Appointment request could not be found.' });
      return;
    }

    response.json({
      ...toCancellationDetails(row),
      confirmedAt: row.patientConfirmedAt || null,
    });
  } catch (error) {
    console.error('Appointment confirmation lookup failed', error);
    response.status(500).json({ message: 'Appointment request could not be loaded right now.' });
  }
});

router.post('/confirm/:token', async (request, response) => {
  const token = cleanField(request.params.token);
  if (!token || !isUuid(token)) {
    response.status(404).json({ message: 'Appointment request could not be found.' });
    return;
  }

  if (!hasDatabaseUrl()) {
    response.status(503).json({ message: 'Confirmation is not configured right now. Please call M.R.S. Medical Services.' });
    return;
  }

  try {
    await ensureDatabase();
    const result = await pool.query<CancellationRow>(
      `UPDATE contact_requests
      SET patient_confirmed_at = COALESCE(patient_confirmed_at, NOW()),
        updated_at = NOW()
      WHERE patient_confirm_token = $1
        AND request_type = 'intake'
        AND canceled_at IS NULL
        AND auto_cancelled_at IS NULL
      RETURNING
        id,
        full_name AS "fullName",
        email,
        phone,
        preferred_date AS "preferredDate",
        preferred_time_window AS "preferredTimeWindow",
        status,
        patient_confirmed_at AS "patientConfirmedAt"`,
      [token],
    );

    const row = result.rows[0];
    if (!row) {
      response.status(404).json({ message: 'Appointment request could not be found or has been canceled.' });
      return;
    }

    if (resend) {
      await sendEmail({
        to: contactToEmail,
        replyTo: row.email || contactToEmail,
        subject: 'M.R.S. Medical Services appointment confirmed by patient',
        title: 'Patient confirmed appointment',
        paragraphs: [
          `${row.fullName} confirmed the appointment for ${getAppointmentLabel(row.preferredDate, row.preferredTimeWindow)}.`,
          `Phone: ${row.phone}`,
          `Email: ${row.email || 'Not provided'}`,
        ],
      });
    }

    response.json({
      ...toCancellationDetails(row),
      confirmedAt: row.patientConfirmedAt || null,
    });
  } catch (error) {
    console.error('Appointment confirmation failed', error);
    response.status(500).json({ message: 'Appointment could not be confirmed right now.' });
  }
});

router.get('/staff-decision/:token', async (request, response) => {
  const token = cleanField(request.params.token);
  if (!token || !isUuid(token)) {
    response.status(404).json({ message: 'Appointment request could not be found.' });
    return;
  }

  if (!hasDatabaseUrl()) {
    response.status(503).json({ message: 'Appointment review is not configured right now.' });
    return;
  }

  try {
    await ensureDatabase();
    const result = await pool.query<CancellationRow & { decisionTokenExpiresAt: string | Date | null; decisionTokenUsedAt: string | Date | null }>(
      `SELECT
        full_name AS "fullName",
        email,
        phone,
        preferred_date AS "preferredDate",
        preferred_time_window AS "preferredTimeWindow",
        status,
        mrsms_confirmed_at AS "patientConfirmedAt",
        decision_token_expires_at AS "decisionTokenExpiresAt",
        decision_token_used_at AS "decisionTokenUsedAt"
      FROM contact_requests
      WHERE mrsms_decision_token = $1 AND request_type = 'intake'
      LIMIT 1`,
      [token],
    );
    const row = result.rows[0];
    if (!row) {
      response.status(404).json({ message: 'Appointment request could not be found.' });
      return;
    }

    if (row.decisionTokenUsedAt || row.status !== 'new') {
      response.status(409).json({ message: 'This appointment request has already been reviewed.' });
      return;
    }

    if (row.decisionTokenExpiresAt && new Date(row.decisionTokenExpiresAt).getTime() < Date.now()) {
      response.status(410).json({ message: 'This review link has expired. Please review this request from the control center instead.' });
      return;
    }

    response.json(toCancellationDetails(row));
  } catch (error) {
    console.error('MRSMS appointment review lookup failed', error);
    response.status(500).json({ message: 'Appointment request could not be loaded right now.' });
  }
});

router.post('/staff-decision/:token', async (request, response) => {
  const token = cleanField(request.params.token);
  const decision = cleanField(request.body?.decision);
  if (!token || !isUuid(token)) {
    response.status(404).json({ message: 'Appointment request could not be found.' });
    return;
  }
  if (decision !== 'confirm' && decision !== 'deny') {
    response.status(400).json({ message: 'Choose confirm or deny.' });
    return;
  }
  if (!hasDatabaseUrl()) {
    response.status(503).json({ message: 'Appointment review is not configured right now.' });
    return;
  }

  try {
    await ensureDatabase();
    const result = await pool.query<CancellationRow>(
      `UPDATE contact_requests
      SET
        status = $2,
        decision_token_used_at = NOW(),
        mrsms_confirmed_at = CASE WHEN $2 = 'mrsms_confirmed' THEN NOW() ELSE mrsms_confirmed_at END,
        canceled_at = CASE WHEN $2 = 'denied' THEN NOW() ELSE canceled_at END,
        updated_at = NOW()
      WHERE mrsms_decision_token = $1
        AND request_type = 'intake'
        AND status = 'new'
        AND decision_token_used_at IS NULL
        AND (decision_token_expires_at IS NULL OR decision_token_expires_at > NOW())
      RETURNING
        id,
        full_name AS "fullName",
        email,
        phone,
        preferred_date AS "preferredDate",
        preferred_time_window AS "preferredTimeWindow",
        status,
        cancel_token AS "cancelToken",
        patient_confirm_token AS "patientConfirmToken"`,
      [token, decision === 'confirm' ? 'mrsms_confirmed' : 'denied'],
    );
    const row = result.rows[0];
    if (!row) {
      response.status(409).json({ message: 'Appointment request could not be found, has already been reviewed, or this review link has expired.' });
      return;
    }

    if (decision === 'confirm') {
      await pool.query(
        `UPDATE appointment_slot_reservations
         SET status = 'confirmed',
           expires_at = NULL,
           updated_at = NOW()
         WHERE contact_request_id = $1`,
        [row.id],
      );
      await sendPatientConfirmationRequest(row, 'mrsms-confirmed');
      response.json({ message: 'Appointment confirmed. The patient confirmation email has been sent.' });
      return;
    }

    await pool.query(
      `UPDATE appointment_slot_reservations
       SET status = 'cancelled',
         updated_at = NOW()
       WHERE contact_request_id = $1`,
      [row.id],
    );

    if (resend && row.email) {
      await sendEmail({
        to: row.email,
        subject: 'M.R.S. Medical Services appointment request update',
        title: 'Appointment request update',
        paragraphs: [
          `Hi ${row.fullName},`,
          `Thank you for requesting an appointment with M.R.S. Medical Services for ${getAppointmentLabel(row.preferredDate, row.preferredTimeWindow)}.`,
          'We are sorry, but that appointment time is not available. Please choose another time that works for you.',
        ],
        actions: [{ label: 'Request a new appointment', url: `${getConfiguredSiteOrigin()}/intake` }],
      });
    }

    response.json({ message: 'Appointment request denied. A rescheduling email has been sent to the patient.' });
  } catch (error) {
    console.error('MRSMS appointment decision failed', error);
    response.status(500).json({ message: 'Appointment request could not be updated right now.' });
  }
});

function getConfiguredSiteOrigin() {
  return cleanField(process.env.SITE_ORIGIN || process.env.CLIENT_ORIGIN).replace(/\/$/, '');
}

async function sendPatientConfirmationRequest(row: CancellationRow, reminderStage: 'two-day' | 'one-day' | 'mrsms-confirmed') {
  if (!resend || !row.email || !row.patientConfirmToken) return;

  const confirmUrl = `${getConfiguredSiteOrigin()}/confirm?token=${row.patientConfirmToken}`;
  const cancelUrl = `${getConfiguredSiteOrigin()}/cancel?token=${row.cancelToken || ''}`;
  const appointmentLabel = getAppointmentLabel(row.preferredDate, row.preferredTimeWindow);
  const isWarning = reminderStage === 'one-day';
  const isInitialConfirmation = reminderStage === 'mrsms-confirmed';

  await sendEmail({
    to: row.email,
    subject: isWarning
      ? 'Action required: confirm your M.R.S. Medical Services appointment'
      : 'Please confirm your M.R.S. Medical Services appointment',
    title: isWarning ? 'Please confirm your appointment today' : 'Please confirm your appointment',
    paragraphs: [
      `Hi ${row.fullName},`,
      isInitialConfirmation
        ? `M.R.S. Medical Services has confirmed your appointment for ${appointmentLabel}.`
        : `This is a reminder for your appointment scheduled for ${appointmentLabel}.`,
      isWarning
        ? 'Your appointment must be confirmed today. If it is not confirmed, it may be canceled so the time can be made available for another patient.'
        : 'Please confirm that you still plan to keep this appointment.',
      'Please put all pets away for the safety of the techs, and fast for 12 hours if required by the doctor.',
      'If you need to cancel, please use the cancellation link as early as possible. Appointments must be canceled at least 24 hours in advance.',
    ],
    actions: [
      { label: 'Confirm appointment', url: confirmUrl },
      ...(cancelUrl ? [{ label: 'Cancel appointment', url: cancelUrl }] : []),
    ],
  });
}

async function sendMrsmsUnconfirmedNotice(row: CancellationRow) {
  if (!resend) return;

  await sendEmail({
    to: contactToEmail,
    replyTo: row.email || contactToEmail,
    subject: 'M.R.S. Medical Services appointment not yet confirmed',
    title: 'Appointment not yet confirmed',
    paragraphs: [
      `${row.fullName} has not confirmed the appointment for ${getAppointmentLabel(row.preferredDate, row.preferredTimeWindow)}.`,
      `Phone: ${row.phone}`,
      `Email: ${row.email || 'Not provided'}`,
    ],
  });
}

async function sendAutoCancellationNotice(row: CancellationRow, paymentNeedsRefund: boolean) {
  if (!resend) return;

  await sendEmail({
    to: contactToEmail,
    replyTo: row.email || contactToEmail,
    subject: paymentNeedsRefund
      ? 'M.R.S. Medical Services appointment auto-canceled - REFUND NEEDED'
      : 'M.R.S. Medical Services appointment auto-canceled',
    title: 'Appointment auto-canceled',
    paragraphs: [
      `${row.fullName}'s appointment for ${getAppointmentLabel(row.preferredDate, row.preferredTimeWindow)} was automatically canceled because it was not confirmed before the 24-hour cutoff.`,
      `Phone: ${row.phone}`,
      `Email: ${row.email || 'Not provided'}`,
      ...(paymentNeedsRefund
        ? ['This appointment was already paid by card. Open the control center and issue a refund for this request.']
        : []),
    ],
  });
}

function addDays(value: Date, amount: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
}

function getEasternDateKey(value: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

async function cleanupStaleAppointmentData() {
  // Remove expired or canceled slot reservations after 7 days.
  await pool.query(`
    DELETE FROM appointment_slot_reservations
    WHERE status IN ('expired', 'cancelled')
      AND updated_at < NOW() - INTERVAL '7 days'
  `);

  // Remove abandoned card-payment requests after 30 days.
  // Paid, confirmed, refunded, insurance, and pay-at-site records are protected.
  await pool.query(`
    DELETE FROM contact_requests
    WHERE request_type = 'intake'
      AND payment_method = 'card'
      AND payment_status IN (
        'checkout_pending',
        'checkout_cancelled',
        'checkout_expired'
      )
      AND status NOT IN ('mrsms_confirmed', 'confirmed', 'completed')
      AND patient_confirmed_at IS NULL
      AND mrsms_confirmed_at IS NULL
      AND refunded_at IS NULL
      AND stripe_refund_id IS NULL
      AND created_at < NOW() - INTERVAL '30 days'
  `);

  // Stripe webhook records are only technical processing logs.
  await pool.query(`
    DELETE FROM stripe_webhook_events
    WHERE status = 'processed'
      AND processed_at < NOW() - INTERVAL '90 days'
  `);
}

const reminderJobLockKey = "hashtext('mrsms_appointment_reminders')::bigint";

async function runReminderPass() {
  const result = await pool.query<CancellationRow & { paymentStatus: string | null }>(
    `SELECT
      id,
      full_name AS "fullName",
      email,
      phone,
      preferred_date AS "preferredDate",
      preferred_time_window AS "preferredTimeWindow",
      status,
      cancel_token AS "cancelToken",
      patient_confirm_token AS "patientConfirmToken",
      patient_confirmed_at AS "patientConfirmedAt",
      reminder_two_day_sent_at AS "reminderTwoDaySentAt",
      reminder_one_day_sent_at AS "reminderOneDaySentAt",
      auto_cancelled_at AS "autoCancelledAt",
      payment_status AS "paymentStatus"
    FROM contact_requests
    WHERE request_type = 'intake'
      AND mrsms_confirmed_at IS NOT NULL
      AND patient_confirmed_at IS NULL
      AND canceled_at IS NULL
      AND auto_cancelled_at IS NULL
      AND preferred_date >= CURRENT_DATE
    LIMIT 200`,
  );

  const todayKey = getEasternDateKey(new Date());
  const twoDaysKey = getEasternDateKey(addDays(new Date(), 2));
  const oneDayKey = getEasternDateKey(addDays(new Date(), 1));

  for (const row of result.rows) {
    const dateKey = getDateKey(row.preferredDate);

    if (dateKey === twoDaysKey && !row.reminderTwoDaySentAt) {
      // Claim the row before sending so a crash or an overlapping run never
      // sends the same reminder twice; the eligibility conditions are
      // repeated here so a mid-pass confirmation or cancellation wins the race.
      const claim = await pool.query(
        `UPDATE contact_requests
        SET reminder_two_day_sent_at = NOW(), updated_at = NOW()
        WHERE id = $1
          AND request_type = 'intake'
          AND mrsms_confirmed_at IS NOT NULL
          AND patient_confirmed_at IS NULL
          AND canceled_at IS NULL
          AND auto_cancelled_at IS NULL
          AND reminder_two_day_sent_at IS NULL
        RETURNING id`,
        [row.id],
      );
      if (claim.rowCount) {
        await sendPatientConfirmationRequest(row, 'two-day');
      }
      continue;
    }

    if (dateKey === oneDayKey && !row.reminderOneDaySentAt) {
      const claim = await pool.query(
        `UPDATE contact_requests
        SET reminder_one_day_sent_at = NOW(), unconfirmed_notice_sent_at = NOW(), updated_at = NOW()
        WHERE id = $1
          AND request_type = 'intake'
          AND mrsms_confirmed_at IS NOT NULL
          AND patient_confirmed_at IS NULL
          AND canceled_at IS NULL
          AND auto_cancelled_at IS NULL
          AND reminder_one_day_sent_at IS NULL
        RETURNING id`,
        [row.id],
      );
      if (claim.rowCount) {
        await sendPatientConfirmationRequest(row, 'one-day');
        await sendMrsmsUnconfirmedNotice(row);
      }
      continue;
    }

    if (dateKey <= todayKey) {
      // A paid appointment is never silently marked unpaid here - it is
      // flagged for a manual refund via the control center so the payment,
      // appointment, and reservation records never disagree with each other.
      const claim = await pool.query<{ paymentStatus: string | null }>(
        `UPDATE contact_requests
        SET status = 'cancelled',
          auto_cancelled_at = NOW(),
          payment_review_status = CASE WHEN payment_status = 'paid' THEN 'refund_needed' ELSE payment_review_status END,
          updated_at = NOW()
        WHERE id = $1
          AND request_type = 'intake'
          AND mrsms_confirmed_at IS NOT NULL
          AND patient_confirmed_at IS NULL
          AND canceled_at IS NULL
          AND auto_cancelled_at IS NULL
        RETURNING payment_status AS "paymentStatus"`,
        [row.id],
      );
      if (claim.rowCount) {
        await pool.query(
          `UPDATE appointment_slot_reservations
           SET status = 'cancelled', updated_at = NOW()
           WHERE contact_request_id = $1 AND status <> 'cancelled'`,
          [row.id],
        );
        await sendAutoCancellationNotice(row, claim.rows[0]?.paymentStatus === 'paid');
      }
    }
  }
}

export async function processAppointmentReminders() {
  if (!hasDatabaseUrl() || !resend || !getConfiguredSiteOrigin()) return;

  await ensureDatabase();

  // Guard against two Railway instances (or overlapping deploys) running the
  // job at the same time; the advisory lock is scoped to this connection, so
  // a dedicated client is held for the duration of the pass.
  const lockClient = await pool.connect();
  try {
    const lockResult = await lockClient.query<{ locked: boolean }>(
      `SELECT pg_try_advisory_lock(${reminderJobLockKey}) AS locked`,
    );
    if (!lockResult.rows[0]?.locked) return;

    try {
      await runReminderPass();
      await cleanupStaleAppointmentData();
    } finally {
      await lockClient.query(`SELECT pg_advisory_unlock(${reminderJobLockKey})`);
    }
  } finally {
    lockClient.release();
  }
}

export function startAppointmentReminderJob() {
  if (remindersStarted) return;
  remindersStarted = true;
  setTimeout(() => {
    void processAppointmentReminders().catch((error) => console.error('Appointment reminder job failed', error));
  }, 15_000);
  setInterval(() => {
    void processAppointmentReminders().catch((error) => console.error('Appointment reminder job failed', error));
  }, reminderIntervalMs);
}

export async function markRequestConfirmedByMrsms(id: string, request: Request) {
  await ensureDatabase();
  const result = await pool.query<CancellationRow>(
    `UPDATE contact_requests
    SET mrsms_confirmed_at = COALESCE(mrsms_confirmed_at, NOW()),
      status = 'mrsms_confirmed',
      updated_at = NOW()
    WHERE id = $1
      AND request_type = 'intake'
      AND canceled_at IS NULL
      AND auto_cancelled_at IS NULL
    RETURNING
      id,
      full_name AS "fullName",
      email,
      phone,
      preferred_date AS "preferredDate",
      preferred_time_window AS "preferredTimeWindow",
      status,
      cancel_token AS "cancelToken",
      patient_confirm_token AS "patientConfirmToken"`,
    [id],
  );

  const row = result.rows[0];
  if (!row) return null;

  await pool.query(
    `UPDATE appointment_slot_reservations
     SET status = 'confirmed',
       expires_at = NULL,
       updated_at = NOW()
     WHERE contact_request_id = $1`,
    [row.id],
  );

  if (resend && row.email && row.patientConfirmToken) {
    const confirmUrl = getConfirmUrl(request, row.patientConfirmToken);
    const cancelUrl = getCancelUrl(request, row.cancelToken);
    await sendEmail({
      to: row.email,
      subject: 'M.R.S. Medical Services appointment confirmed',
      title: 'Appointment confirmed by M.R.S.',
      paragraphs: [
        `Hi ${row.fullName},`,
        `M.R.S. Medical Services has confirmed your appointment for ${getAppointmentLabel(row.preferredDate, row.preferredTimeWindow)}.`,
        'You will receive another confirmation reminder before the appointment. Please confirm when that reminder arrives so the appointment stays on the schedule.',
        'Please put all pets away for the safety of the techs, and fast for 12 hours if required by the doctor.',
        'Appointments must be canceled at least 24 hours in advance.',
      ],
      actions: [
        { label: 'Confirm appointment', url: confirmUrl },
        ...(cancelUrl ? [{ label: 'Cancel appointment', url: cancelUrl }] : []),
      ],
    });
  }

  return row;
}

export default router;
