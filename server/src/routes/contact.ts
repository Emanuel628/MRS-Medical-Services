import { Router, type Request } from 'express';
import { Resend } from 'resend';
import { pool } from '../config/database.js';

const router = Router();

type ContactRequest = {
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
  requestType?: string;
  serviceArea?: string;
  zipCode?: string;
  preferredDate?: string;
  preferredTimeWindow?: string;
  hasKit?: boolean;
};

type SavedContactRequest = {
  id: string;
  cancelToken: string | null;
  patientConfirmToken: string | null;
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
};

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const contactToEmail = process.env.CONTACT_TO_EMAIL || 'dirving.mrsms@gmail.com';
const contactFromEmail = process.env.CONTACT_FROM_EMAIL || 'M.R.S. Medical Services <onboarding@resend.dev>';
let databaseReady = false;
const appointmentConfirmationNote =
  'Appointment requests must be confirmed by M.R.S. Medical Services. Requests that are not confirmed will be canceled. Appointments must be canceled at least 24 hours in advance.';
const kitScheduleNote = 'Specialty kit collections must be scheduled before 10 AM.';
const reminderIntervalMs = 60 * 60 * 1000;
let remindersStarted = false;

function cleanField(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
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
      status VARCHAR(30) NOT NULL DEFAULT 'new',
      request_type VARCHAR(30) NOT NULL DEFAULT 'contact',
      service_area TEXT,
      preferred_date DATE,
      preferred_time_window TEXT,
      cancel_token UUID UNIQUE DEFAULT gen_random_uuid(),
      patient_confirm_token UUID UNIQUE DEFAULT gen_random_uuid(),
      patient_confirmed_at TIMESTAMPTZ,
      mrsms_confirmed_at TIMESTAMPTZ,
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
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS cancel_token UUID');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS patient_confirm_token UUID');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS patient_confirmed_at TIMESTAMPTZ');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS mrsms_confirmed_at TIMESTAMPTZ');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS reminder_two_day_sent_at TIMESTAMPTZ');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS reminder_one_day_sent_at TIMESTAMPTZ');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS unconfirmed_notice_sent_at TIMESTAMPTZ');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS auto_cancelled_at TIMESTAMPTZ');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS cancellation_reason TEXT');
  await pool.query('UPDATE contact_requests SET cancel_token = gen_random_uuid() WHERE cancel_token IS NULL');
  await pool.query('UPDATE contact_requests SET patient_confirm_token = gen_random_uuid() WHERE patient_confirm_token IS NULL');
  await pool.query('CREATE INDEX IF NOT EXISTS contact_requests_created_at_idx ON contact_requests (created_at DESC)');
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS contact_requests_cancel_token_idx ON contact_requests (cancel_token)');
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS contact_requests_patient_confirm_token_idx ON contact_requests (patient_confirm_token)');
  await pool.query('CREATE INDEX IF NOT EXISTS contact_requests_preferred_date_idx ON contact_requests (preferred_date)');
  databaseReady = true;
}

function cleanRequestType(value: string) {
  return value === 'intake' || value === 'manual_intake' ? value : 'contact';
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getSiteOrigin(request: Request) {
  const configuredOrigin = cleanField(process.env.CLIENT_ORIGIN);
  if (configuredOrigin) return configuredOrigin.replace(/\/$/, '');

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
          <a href="${escapeHtml(action.url)}" style="display: inline-block; padding: 13px 18px; background: #062948; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: 700;">
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

  const result = await pool.query<SavedContactRequest>(
    `INSERT INTO contact_requests (
      full_name,
      email,
      phone,
      zip_code,
      message,
      request_type,
      service_area,
      preferred_date,
      preferred_time_window
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, cancel_token AS "cancelToken", patient_confirm_token AS "patientConfirmToken"`,
    [name, email || null, phone, zipCode, message || null, requestType, serviceArea, preferredDate, preferredTimeWindow],
  );

  return result.rows[0] ?? null;
}

router.post('/', async (request, response) => {
  const body = request.body as ContactRequest;
  const name = cleanField(body.name);
  const phone = cleanField(body.phone);
  const email = cleanField(body.email);
  const message = cleanField(body.message);
  const requestType = cleanRequestType(cleanField(body.requestType));
  const hasKit = body.hasKit === true;

  if (!name || !phone || !email || !message) {
    response.status(400).json({ message: 'Name, phone, email, and message are required.' });
    return;
  }

  if (!resend && !hasDatabaseUrl()) {
    response.status(500).json({ message: 'Contact form is not configured.' });
    return;
  }

  const replyTo = email || contactToEmail;
  const submittedAt = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/New_York',
  });

  let savedRequest: SavedContactRequest | null = null;

  try {
    savedRequest = await saveContactRequest(body);
  } catch (error) {
    console.error('Contact request save failed', error);
    response.status(500).json({ message: 'Message could not be saved right now.' });
    return;
  }

  if (!resend) {
    response.json({ message: 'Message saved successfully.' });
    return;
  }

  try {
    await sendEmail({
      to: contactToEmail,
      replyTo,
      subject: `${requestType === 'intake' ? 'New M.R.S. Medical Services intake request' : 'New M.R.S. Medical Services message'} from ${name}`,
      title: requestType === 'intake' ? 'New intake request' : 'New website message',
      paragraphs: [
        `Name: ${name}`,
        `Phone: ${phone}`,
        `Email: ${email}`,
        `Submitted: ${submittedAt}`,
        message,
      ],
    });

    if (requestType === 'intake') {
      const cancelUrl = getCancelUrl(request, savedRequest?.cancelToken);
      const appointmentLabel = getAppointmentLabel(cleanField(body.preferredDate), cleanField(body.preferredTimeWindow));

      await sendEmail({
        to: email,
        subject: 'M.R.S. Medical Services visit request received',
        title: 'Visit request received',
        paragraphs: [
          `Hi ${name},`,
          `Thank you for requesting an appointment with M.R.S. Medical Services. We received your request for ${appointmentLabel}.`,
          'This is not a confirmed appointment yet. M.R.S. Medical Services will review the request and contact you to confirm the appointment.',
          'Appointments must be canceled at least 24 hours in advance.',
          ...(hasKit ? [kitScheduleNote] : []),
        ],
        actions: cancelUrl ? [{ label: 'Cancel appointment request', url: cancelUrl }] : [],
      });
    }

    response.json({ message: 'Message sent successfully.' });
  } catch (error) {
    console.error('Resend contact email failed', error);
    response.json({ message: 'Message saved successfully.' });
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

function getConfiguredSiteOrigin() {
  return cleanField(process.env.CLIENT_ORIGIN).replace(/\/$/, '');
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

async function sendAutoCancellationNotice(row: CancellationRow) {
  if (!resend) return;

  await sendEmail({
    to: contactToEmail,
    replyTo: row.email || contactToEmail,
    subject: 'M.R.S. Medical Services appointment auto-canceled',
    title: 'Appointment auto-canceled',
    paragraphs: [
      `${row.fullName}'s appointment for ${getAppointmentLabel(row.preferredDate, row.preferredTimeWindow)} was automatically canceled because it was not confirmed before the 24-hour cutoff.`,
      `Phone: ${row.phone}`,
      `Email: ${row.email || 'Not provided'}`,
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

export async function processAppointmentReminders() {
  if (!hasDatabaseUrl() || !resend || !getConfiguredSiteOrigin()) return;

  await ensureDatabase();
  const result = await pool.query<CancellationRow>(
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
      auto_cancelled_at AS "autoCancelledAt"
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
      await sendPatientConfirmationRequest(row, 'two-day');
      await pool.query('UPDATE contact_requests SET reminder_two_day_sent_at = NOW(), updated_at = NOW() WHERE id = $1', [row.id]);
      continue;
    }

    if (dateKey === oneDayKey && !row.reminderOneDaySentAt) {
      await sendPatientConfirmationRequest(row, 'one-day');
      await sendMrsmsUnconfirmedNotice(row);
      await pool.query('UPDATE contact_requests SET reminder_one_day_sent_at = NOW(), unconfirmed_notice_sent_at = NOW(), updated_at = NOW() WHERE id = $1', [row.id]);
      continue;
    }

    if (dateKey <= todayKey) {
      await pool.query(
        `UPDATE contact_requests
        SET status = 'cancelled',
          auto_cancelled_at = NOW(),
          updated_at = NOW()
        WHERE id = $1`,
        [row.id],
      );
      await sendAutoCancellationNotice(row);
    }
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
