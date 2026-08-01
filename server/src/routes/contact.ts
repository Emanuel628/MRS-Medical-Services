import { Router } from 'express';
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
};

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const contactToEmail = process.env.CONTACT_TO_EMAIL || 'dirving.mrsms@gmail.com';
const contactFromEmail = process.env.CONTACT_FROM_EMAIL || 'M.R.S. Medical Services <onboarding@resend.dev>';
let databaseReady = false;
const appointmentConfirmationNote =
  'Appointment requests must be confirmed by M.R.S. Medical Services. Requests that are not confirmed will be canceled. M.R.S. Medical Services will soon be accepting insurance.';

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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS request_type VARCHAR(30) NOT NULL DEFAULT \'contact\'');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS service_area TEXT');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS preferred_date DATE');
  await pool.query('ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS preferred_time_window TEXT');
  await pool.query('CREATE INDEX IF NOT EXISTS contact_requests_created_at_idx ON contact_requests (created_at DESC)');
  databaseReady = true;
}

function cleanRequestType(value: string) {
  return value === 'intake' || value === 'manual_intake' ? value : 'contact';
}

export async function saveContactRequest(body: ContactRequest) {
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

  const result = await pool.query<{ id: string }>(
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
    RETURNING id`,
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

  try {
    await saveContactRequest(body);
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
          '',
          `Requested date: ${cleanField(body.preferredDate) || 'Not specified'}`,
          `Requested time window: ${cleanField(body.preferredTimeWindow) || 'Not specified'}`,
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

export default router;
