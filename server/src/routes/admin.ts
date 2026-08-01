import { Router } from 'express';
import { pool } from '../config/database.js';
import { ensureDatabase, markRequestConfirmedByMrsms, saveContactRequest } from './contact.js';

const router = Router();

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

router.use((request, response, next) => {
  if (!process.env.ADMIN_PASSWORD) {
    response.status(503).json({ message: 'Admin password is not configured.' });
    return;
  }

  if (!isAuthorized(request.header('x-admin-password'))) {
    response.status(401).json({ message: 'Admin access denied.' });
    return;
  }

  next();
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
