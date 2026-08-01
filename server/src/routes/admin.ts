import { Router, type Request } from 'express';
import crypto from 'node:crypto';
import { Resend } from 'resend';
import { pool } from '../config/database.js';
import { ensureDatabase, markRequestConfirmedByMrsms, saveContactRequest } from './contact.js';

const router = Router();
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const contactFromEmail = process.env.CONTACT_FROM_EMAIL || 'M.R.S. Medical Services <onboarding@resend.dev>';
const contactToEmail = process.env.CONTACT_TO_EMAIL || 'dirving.mrsms@gmail.com';
const sessionMinutes = 15;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const registerAttempts = new Map<string, { count: number; resetAt: number }>();

type ManualIntakeRequest = {
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
  serviceArea?: string;
  preferredDate?: string;
  preferredTimeWindow?: string;
};

type AppointmentRequest = {
  patientName?: string;
  phone?: string;
  serviceArea?: string;
  serviceAddress?: string;
  appointmentDate?: string;
  timeWindow?: string;
  notes?: string;
};

type BlockedTimeRequest = {
  blockDate?: string;
  timeWindow?: string;
  reason?: string;
};

function cleanField(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL);
}

function isAuthorized(value: unknown) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  return Boolean(adminPassword && typeof value === 'string' && value === adminPassword);
}

function getSiteOrigin(request: { protocol: string; get(name: string): string | undefined }) {
  return process.env.SITE_ORIGIN || process.env.CLIENT_ORIGIN || `${request.protocol}://${request.get('host')}`;
}

function cleanEmail(value: unknown) {
  return cleanField(value).toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getPasswordIssues(value: string) {
  const issues: string[] = [];
  if (value.length < 12) issues.push('Use at least 12 characters.');
  if (!/[a-z]/.test(value)) issues.push('Add a lowercase letter.');
  if (!/[A-Z]/.test(value)) issues.push('Add an uppercase letter.');
  if (!/\d/.test(value)) issues.push('Add a number.');
  if (!/[^A-Za-z0-9]/.test(value)) issues.push('Add a symbol.');
  return issues;
}

function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string) {
  const [salt, originalHash] = stored.split(':');
  if (!salt || !originalHash) return false;
  const hash = crypto.scryptSync(password, salt, 64);
  const original = Buffer.from(originalHash, 'hex');
  return original.length === hash.length && crypto.timingSafeEqual(original, hash);
}

function checkRateLimit(store: Map<string, { count: number; resetAt: number }>, key: string, max = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  current.count += 1;
  return current.count <= max;
}

async function ensureAuthTables() {
  if (!hasDatabaseUrl()) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'approved',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      approved_at TIMESTAMPTZ
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_registration_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      decision_token TEXT NOT NULL UNIQUE,
      requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      decided_at TIMESTAMPTZ
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS admin_sessions_expires_idx ON admin_sessions (expires_at)');
  await pool.query('CREATE INDEX IF NOT EXISTS admin_registration_status_idx ON admin_registration_requests (status)');
}

async function createAdminSession(userId: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + sessionMinutes * 60 * 1000);
  await pool.query('INSERT INTO admin_sessions (token, user_id, expires_at) VALUES ($1, $2, $3)', [
    token,
    userId,
    expiresAt,
  ]);
  return { token, expiresAt };
}

async function approveBootstrapAdmin(email: string, password: string) {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO admin_users (email, password_hash, status, approved_at)
     VALUES ($1, $2, 'approved', NOW())
     ON CONFLICT (email) DO UPDATE
     SET password_hash = EXCLUDED.password_hash,
       status = 'approved',
       approved_at = COALESCE(admin_users.approved_at, NOW())
     RETURNING id`,
    [email, hashPassword(password)],
  );

  await pool.query(
    `UPDATE admin_registration_requests
     SET status = 'approved',
       decided_at = COALESCE(decided_at, NOW())
     WHERE email = $1 AND status = 'pending'`,
    [email],
  );

  return result.rows[0]?.id || '';
}

async function sendAdminRegistrationEmail(request: { protocol: string; get(name: string): string | undefined }, email: string, token: string) {
  if (!resend) return;

  const reviewUrl = `${getSiteOrigin(request)}/admin-registration?token=${encodeURIComponent(token)}`;
  await resend.emails.send({
    from: contactFromEmail,
    to: contactToEmail,
    subject: 'Admin account request for M.R.S. Medical Services',
    text: [
      'A new admin account request was submitted.',
      `Email: ${email}`,
      `Review this request: ${reviewUrl}`,
      'Approve this only if the request came from an authorized M.R.S. Medical Services user.',
    ].join('\n\n'),
    html: `
      <div style="font-family:Arial,sans-serif; color:#082743; line-height:1.5;">
        <h1 style="font-family:Georgia,serif;">Admin account request</h1>
        <p>A new admin account request was submitted for <strong>${email}</strong>.</p>
        <p>Approve this only if the request came from an authorized M.R.S. Medical Services user.</p>
        <p><a href="${reviewUrl}" style="display:inline-block; background:#082743; color:#ffffff; padding:12px 18px; text-decoration:none;">Review request</a></p>
      </div>
    `,
  });
}

async function sendRegistrationDecisionEmail(email: string, approved: boolean) {
  if (!resend) return;

  await resend.emails.send({
    from: contactFromEmail,
    to: email,
    subject: approved ? 'M.R.S. Medical Services admin access approved' : 'M.R.S. Medical Services admin access request update',
    text: approved
      ? 'Your M.R.S. Medical Services admin access has been approved. You can now log in.'
      : 'Your M.R.S. Medical Services admin access request was not approved. If this was a mistake, contact M.R.S. Medical Services directly.',
    html: `<div style="font-family:Arial,sans-serif; color:#082743; line-height:1.5;"><h1 style="font-family:Georgia,serif;">Admin access ${approved ? 'approved' : 'not approved'}</h1><p>${approved ? 'Your admin access has been approved. You can now log in.' : 'Your admin access request was not approved. If this was a mistake, contact M.R.S. Medical Services directly.'}</p></div>`,
  });
}

async function isAuthorizedRequest(request: Request) {
  if (isAuthorized(request.header('x-admin-password'))) return true;

  const authorization = request.header('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token || !hasDatabaseUrl()) return false;

  await ensureAuthTables();
  const result = await pool.query<{ token: string }>(
    `UPDATE admin_sessions
     SET expires_at = NOW() + INTERVAL '${sessionMinutes} minutes'
     WHERE token = $1 AND expires_at > NOW()
     RETURNING token`,
    [token],
  );
  return Boolean(result.rowCount);
}

export async function ensureScheduleTables() {
  if (!hasDatabaseUrl()) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS appointments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      service_area TEXT,
      service_address TEXT,
      appointment_date DATE NOT NULL,
      time_window TEXT NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'scheduled',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS blocked_times (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      block_date DATE NOT NULL,
      time_window TEXT NOT NULL,
      reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS appointments_date_idx ON appointments (appointment_date)');
  await pool.query('CREATE INDEX IF NOT EXISTS blocked_times_date_idx ON blocked_times (block_date)');
}

router.post('/auth/register', async (request, response) => {
  if (!hasDatabaseUrl()) {
    response.status(503).json({ message: 'Database is not configured.' });
    return;
  }

  const key = request.ip || 'unknown';
  if (!checkRateLimit(registerAttempts, key, 3, 60 * 60 * 1000)) {
    response.status(429).json({ message: 'Too many account requests. Try again later.' });
    return;
  }

  const email = cleanEmail(request.body?.email);
  const password = cleanField(request.body?.password);
  const confirmPassword = cleanField(request.body?.confirmPassword);

  if (!isValidEmail(email)) {
    response.status(400).json({ message: 'Enter a valid email address.' });
    return;
  }
  if (password !== confirmPassword) {
    response.status(400).json({ message: 'Passwords do not match.' });
    return;
  }
  const passwordIssues = getPasswordIssues(password);
  if (passwordIssues.length) {
    response.status(400).json({ message: passwordIssues.join(' ') });
    return;
  }

  try {
    await ensureAuthTables();
    const existingUser = await pool.query('SELECT 1 FROM admin_users WHERE email = $1 LIMIT 1', [email]);
    if (existingUser.rowCount) {
      response.status(409).json({ message: 'An approved admin account already exists for this email.' });
      return;
    }

    const pending = await pool.query(
      `SELECT 1 FROM admin_registration_requests WHERE email = $1 AND status = 'pending' LIMIT 1`,
      [email],
    );
    if (pending.rowCount) {
      response.status(409).json({ message: 'An account request is already pending for this email.' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    await pool.query(
      `INSERT INTO admin_registration_requests (email, password_hash, decision_token)
       VALUES ($1, $2, $3)`,
      [email, hashPassword(password), token],
    );
    await sendAdminRegistrationEmail(request, email, token);

    response.json({ message: 'Account request sent. Access is not active until M.R.S. Medical Services approves it.' });
  } catch (error) {
    console.error('Admin registration failed', error);
    response.status(500).json({ message: 'Account request could not be sent right now.' });
  }
});

router.post('/auth/login', async (request, response) => {
  if (!hasDatabaseUrl()) {
    response.status(503).json({ message: 'Database is not configured.' });
    return;
  }

  const email = cleanEmail(request.body?.email);
  const password = cleanField(request.body?.password);
  if (!isValidEmail(email) || !password) {
    response.status(400).json({ message: 'Enter a valid email and password.' });
    return;
  }

  const key = `${request.ip || 'unknown'}:${email}`;
  if (!checkRateLimit(loginAttempts, key, 5)) {
    response.status(429).json({ message: 'Too many login attempts. Try again later.' });
    return;
  }

  try {
    await ensureAuthTables();
    const user = await pool.query<{ id: string; passwordHash: string; status: string }>(
      `SELECT id, password_hash AS "passwordHash", status FROM admin_users WHERE email = $1 LIMIT 1`,
      [email],
    );
    const row = user.rows[0];
    if (!row || row.status !== 'approved' || !verifyPassword(password, row.passwordHash)) {
      if (isAuthorized(password)) {
        const userId = await approveBootstrapAdmin(email, password);
        if (userId) {
          const session = await createAdminSession(userId);
          response.json({ message: 'Signed in.', token: session.token, expiresAt: session.expiresAt.toISOString() });
          return;
        }
      }

      response.status(401).json({ message: 'Email or password is incorrect, or the account is not approved yet.' });
      return;
    }

    const session = await createAdminSession(row.id);
    response.json({ message: 'Signed in.', token: session.token, expiresAt: session.expiresAt.toISOString() });
  } catch (error) {
    console.error('Admin login failed', error);
    response.status(500).json({ message: 'Login failed right now.' });
  }
});

router.get('/auth/registration/:token', async (request, response) => {
  if (!hasDatabaseUrl()) {
    response.status(503).json({ message: 'Database is not configured.' });
    return;
  }

  try {
    await ensureAuthTables();
    const result = await pool.query(
      `SELECT email, status, requested_at AS "requestedAt" FROM admin_registration_requests WHERE decision_token = $1 LIMIT 1`,
      [cleanField(request.params.token)],
    );
    if (!result.rows[0]) {
      response.status(404).json({ message: 'Account request could not be found.' });
      return;
    }
    response.json({ request: result.rows[0] });
  } catch (error) {
    console.error('Admin registration lookup failed', error);
    response.status(500).json({ message: 'Account request could not be loaded.' });
  }
});

router.post('/auth/registration/:token/decision', async (request, response) => {
  if (!hasDatabaseUrl()) {
    response.status(503).json({ message: 'Database is not configured.' });
    return;
  }

  const decision = cleanField(request.body?.decision);
  if (decision !== 'approve' && decision !== 'deny') {
    response.status(400).json({ message: 'Choose approve or deny.' });
    return;
  }

  try {
    await ensureAuthTables();
    const pending = await pool.query<{ id: string; email: string; passwordHash: string; status: string }>(
      `SELECT id, email, password_hash AS "passwordHash", status
       FROM admin_registration_requests
       WHERE decision_token = $1
       LIMIT 1`,
      [cleanField(request.params.token)],
    );
    const row = pending.rows[0];
    if (!row) {
      response.status(404).json({ message: 'Account request could not be found.' });
      return;
    }
    if (row.status !== 'pending') {
      response.status(409).json({ message: `This account request was already ${row.status}.` });
      return;
    }

    if (decision === 'approve') {
      await pool.query(
        `INSERT INTO admin_users (email, password_hash, status, approved_at)
         VALUES ($1, $2, 'approved', NOW())
         ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash, status = 'approved', approved_at = NOW()`,
        [row.email, row.passwordHash],
      );
    }
    await pool.query(
      `UPDATE admin_registration_requests
       SET status = $1, decided_at = NOW()
       WHERE id = $2`,
      [decision === 'approve' ? 'approved' : 'denied', row.id],
    );
    await sendRegistrationDecisionEmail(row.email, decision === 'approve');
    response.json({ message: decision === 'approve' ? 'Account approved.' : 'Account denied.' });
  } catch (error) {
    console.error('Admin registration decision failed', error);
    response.status(500).json({ message: 'Account request could not be updated.' });
  }
});

router.use(async (request, response, next) => {
  if (!process.env.ADMIN_PASSWORD) {
    if (!hasDatabaseUrl()) {
      response.status(503).json({ message: 'Admin authentication is not configured.' });
      return;
    }
  }

  if (!(await isAuthorizedRequest(request))) {
    response.status(401).json({ message: 'Admin access denied.' });
    return;
  }

  next();
});

router.post('/auth/logout', async (request, response) => {
  const authorization = request.header('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (token && hasDatabaseUrl()) {
    await ensureAuthTables();
    await pool.query('DELETE FROM admin_sessions WHERE token = $1', [token]);
  }
  response.json({ message: 'Signed out.' });
});

router.get('/auth/me', async (_request, response) => {
  response.json({ authenticated: true });
});

router.get('/contact-requests', async (_request, response) => {
  if (!hasDatabaseUrl()) {
    response.status(503).json({ message: 'Database is not configured.' });
    return;
  }

  try {
    await ensureDatabase();
    const result = await pool.query(`
      SELECT
        id,
        full_name AS "fullName",
        email,
        phone,
        message,
        status,
        request_type AS "requestType",
        service_area AS "serviceArea",
        preferred_date AS "preferredDate",
        preferred_time_window AS "preferredTimeWindow",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM contact_requests
      ORDER BY created_at DESC
      LIMIT 100
    `);

    response.json({ requests: result.rows });
  } catch (error) {
    console.error('Admin contact request list failed', error);
    response.status(500).json({ message: 'Saved requests could not be loaded.' });
  }
});

router.post('/manual-intake', async (request, response) => {
  if (!hasDatabaseUrl()) {
    response.status(503).json({ message: 'Database is not configured.' });
    return;
  }

  const body = request.body as ManualIntakeRequest;
  const name = cleanField(body.name);
  const phone = cleanField(body.phone);
  const message = cleanField(body.message);

  if (!name || !phone || !message) {
    response.status(400).json({ message: 'Name, phone, and notes are required.' });
    return;
  }

  try {
    const saved = await saveContactRequest({
      name,
      phone,
      email: cleanField(body.email),
      message,
      requestType: 'manual_intake',
      serviceArea: cleanField(body.serviceArea),
      preferredDate: cleanField(body.preferredDate),
      preferredTimeWindow: cleanField(body.preferredTimeWindow),
    });

    response.json({ message: 'Manual intake saved.', id: saved?.id });
  } catch (error) {
    console.error('Manual intake save failed', error);
    response.status(500).json({ message: 'Manual intake could not be saved.' });
  }
});

router.post('/contact-requests/:id/confirm', async (request, response) => {
  if (!hasDatabaseUrl()) {
    response.status(503).json({ message: 'Database is not configured.' });
    return;
  }

  const id = cleanField(request.params.id);
  if (!id) {
    response.status(400).json({ message: 'Request id is required.' });
    return;
  }

  try {
    const confirmed = await markRequestConfirmedByMrsms(id, request);
    if (!confirmed) {
      response.status(404).json({ message: 'Intake request could not be found or has already been canceled.' });
      return;
    }

    response.json({ message: 'Appointment confirmed and patient email sent.', request: confirmed });
  } catch (error) {
    console.error('MRSMS confirmation failed', error);
    response.status(500).json({ message: 'Appointment could not be confirmed right now.' });
  }
});

router.get('/schedule', async (_request, response) => {
  if (!hasDatabaseUrl()) {
    response.status(503).json({ message: 'Database is not configured.' });
    return;
  }

  try {
    await ensureScheduleTables();
    const [appointments, blockedTimes] = await Promise.all([
      pool.query(`
        SELECT
          id,
          patient_name AS "patientName",
          phone,
          service_area AS "serviceArea",
          service_address AS "serviceAddress",
          appointment_date AS "appointmentDate",
          time_window AS "timeWindow",
          status,
          notes,
          created_at AS "createdAt"
        FROM appointments
        ORDER BY appointment_date DESC, created_at DESC
        LIMIT 100
      `),
      pool.query(`
        SELECT
          id,
          block_date AS "blockDate",
          time_window AS "timeWindow",
          reason,
          created_at AS "createdAt"
        FROM blocked_times
        ORDER BY block_date DESC, created_at DESC
        LIMIT 100
      `),
    ]);

    response.json({ appointments: appointments.rows, blockedTimes: blockedTimes.rows });
  } catch (error) {
    console.error('Admin schedule load failed', error);
    response.status(500).json({ message: 'Schedule could not be loaded.' });
  }
});

router.post('/appointments', async (request, response) => {
  if (!hasDatabaseUrl()) {
    response.status(503).json({ message: 'Database is not configured.' });
    return;
  }

  const body = request.body as AppointmentRequest;
  const patientName = cleanField(body.patientName);
  const phone = cleanField(body.phone);
  const appointmentDate = cleanField(body.appointmentDate);
  const timeWindow = cleanField(body.timeWindow);

  if (!patientName || !phone || !appointmentDate || !timeWindow) {
    response.status(400).json({ message: 'Patient, phone, date, and time window are required.' });
    return;
  }

  try {
    await ensureScheduleTables();
    const conflict = await pool.query(
      `SELECT 1 FROM appointments
      WHERE appointment_date = $1 AND time_window = $2 AND status <> 'cancelled'
      UNION ALL
      SELECT 1 FROM blocked_times
      WHERE block_date = $1 AND time_window = $2
      LIMIT 1`,
      [appointmentDate, timeWindow],
    );

    if (conflict.rowCount) {
      response.status(409).json({ message: 'That date and time window is already unavailable.' });
      return;
    }

    const result = await pool.query<{ id: string }>(
      `INSERT INTO appointments (
        patient_name,
        phone,
        service_area,
        service_address,
        appointment_date,
        time_window,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
      [
        patientName,
        phone,
        cleanField(body.serviceArea) || null,
        cleanField(body.serviceAddress) || null,
        appointmentDate,
        timeWindow,
        cleanField(body.notes) || null,
      ],
    );

    response.json({ message: 'Appointment saved.', id: result.rows[0]?.id });
  } catch (error) {
    console.error('Appointment save failed', error);
    response.status(500).json({ message: 'Appointment could not be saved.' });
  }
});

router.post('/blocked-times', async (request, response) => {
  if (!hasDatabaseUrl()) {
    response.status(503).json({ message: 'Database is not configured.' });
    return;
  }

  const body = request.body as BlockedTimeRequest;
  const blockDate = cleanField(body.blockDate);
  const timeWindow = cleanField(body.timeWindow);

  if (!blockDate || !timeWindow) {
    response.status(400).json({ message: 'Date and time window are required.' });
    return;
  }

  try {
    await ensureScheduleTables();
    const conflict = await pool.query(
      `SELECT 1 FROM blocked_times
      WHERE block_date = $1 AND time_window = $2
      UNION ALL
      SELECT 1 FROM appointments
      WHERE appointment_date = $1 AND time_window = $2 AND status <> 'cancelled'
      LIMIT 1`,
      [blockDate, timeWindow],
    );

    if (conflict.rowCount) {
      response.status(409).json({ message: 'That date and time window is already unavailable.' });
      return;
    }

    const result = await pool.query<{ id: string }>(
      `INSERT INTO blocked_times (block_date, time_window, reason)
      VALUES ($1, $2, $3)
      RETURNING id`,
      [blockDate, timeWindow, cleanField(body.reason) || null],
    );

    response.json({ message: 'Blocked time saved.', id: result.rows[0]?.id });
  } catch (error) {
    console.error('Blocked time save failed', error);
    response.status(500).json({ message: 'Blocked time could not be saved.' });
  }
});

export default router;
