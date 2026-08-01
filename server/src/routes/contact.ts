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
  preferredDate?: string;
  preferredTimeWindow?: string;
  hasKit?: boolean;
};

type SavedContactRequest = {
  id: string;
  cancelToken: string | null;
};

type CancellationRow = {
  fullName: string;
  email: string | null;
  phone: string;
  preferredDate: string | Date | null;
  preferredTimeWindow: string | null;
  status: string;
};

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const contactToEmail = process.env.CONTACT_TO_EMAIL || 'dirving.mrsms@gmail.com';
const contactFromEmail = process.env.CONTACT_FROM_EMAIL || 'M.R.S. Medical Services <onboarding@resend.dev>';
let databaseReady = false;
const appointmentConfirmationNote =
  'Appointment requests must be confirmed by M.R.S. Medical Services. Requests that are not confirmed will be canceled. Appointments must be canceled at least 24 hours in advance.';
const kitScheduleNote = 'Specialty kit collections must be scheduled before 10 AM.';

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
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS cancellation_reason TEXT');
  await pool.query('UPDATE contact_requests SET cancel_token = gen_random_uuid() WHERE cancel_token IS NULL');
  await pool.query('CREATE INDEX IF NOT EXISTS contact_requests_created_at_idx ON contact_requests (created_at DESC)');
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS contact_requests_cancel_token_idx ON contact_requests (cancel_token)');
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

export async function saveContactRequest(body: ContactRequest): Promise<SavedContactRequest | null> {
  if (!hasDatabaseUrl()) return null;

  await ensureDatabase();

  const name = cleanField(body.name);
  const phone = cleanField(body.phone);
  const email = cleanField(body.email);
  const message = cleanField(body.message);
  const requestType = cleanRequestType(cleanField(body.requestType));
  const serviceArea = cleanField(body.serviceArea) || null;
  const preferredDate = cleanField(body.preferredDate) || null;
  const preferredTimeWindow = cleanField(body.preferredTimeWindow) || null;

  const result = await pool.query<SavedContactRequest>(
    `INSERT INTO contact_requests (
      full_name,
      email,
      phone,
      message,
      request_type,
      service_area,
      preferred_date,
      preferred_time_window
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, cancel_token AS "cancelToken"`,
    [name, email || null, phone, message || null, requestType, serviceArea, preferredDate, preferredTimeWindow],
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
    await resend.emails.send({
      from: contactFromEmail,
      to: contactToEmail,
      replyTo,
      subject: `${requestType === 'intake' ? 'New M.R.S. Medical Services intake request' : 'New M.R.S. Medical Services message'} from ${name}`,
      text: [
        requestType === 'intake' ? 'New website intake request' : 'New website contact message',
        '',
        `Name: ${name}`,
        `Phone: ${phone}`,
        `Email: ${email}`,
        `Submitted: ${submittedAt}`,
        '',
        'Message:',
        message,
      ].join('\n'),
    });

    if (requestType === 'intake') {
      const cancelUrl = savedRequest?.cancelToken
        ? `${getSiteOrigin(request)}/cancel?token=${savedRequest.cancelToken}`
        : '';

      await resend.emails.send({
        from: contactFromEmail,
        to: email,
        replyTo: contactToEmail,
        subject: 'M.R.S. Medical Services visit request received',
        text: [
          `Hi ${name},`,
          '',
          'Your visit request was received.',
          '',
          appointmentConfirmationNote,
          ...(hasKit ? [kitScheduleNote] : []),
          '',
          `Requested date: ${cleanField(body.preferredDate) || 'Not specified'}`,
          `Requested time window: ${cleanField(body.preferredTimeWindow) || 'Not specified'}`,
          ...(cancelUrl ? ['', 'Cancel appointment request:', cancelUrl] : []),
          '',
          'M.R.S. Medical Services will follow up to confirm the appointment.',
          '',
          'Thank you,',
          'M.R.S. Medical Services',
        ].join('\n'),
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

export default router;
