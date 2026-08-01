import { Router } from 'express';
import { pool } from '../config/database.js';
import { ensureDatabase, saveContactRequest } from './contact.js';

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

export default router;
