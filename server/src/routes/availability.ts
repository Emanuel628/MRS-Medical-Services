import { Router } from 'express';
import { pool } from '../config/database.js';
import { ensureScheduleTables } from './admin.js';
import { ensureDatabase } from './contact.js';

const router = Router();

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL);
}

router.get('/blocked-times', async (_request, response) => {
  if (!hasDatabaseUrl()) {
    response.json({ blockedTimes: [] });
    return;
  }

  try {
    await ensureScheduleTables();
    await ensureDatabase();
    await pool.query(`
      UPDATE appointment_slot_reservations
      SET status = 'expired',
        updated_at = NOW()
      WHERE status = 'reserved'
        AND expires_at IS NOT NULL
        AND expires_at <= NOW()
    `);
    const result = await pool.query(`
      SELECT
        id,
        block_date AS "blockDate",
        time_window AS "timeWindow",
        reason,
        'blocked' AS "source"
      FROM blocked_times
      WHERE block_date >= CURRENT_DATE
      UNION ALL
      SELECT
        id,
        appointment_date AS "blockDate",
        time_window AS "timeWindow",
        'Scheduled appointment' AS reason,
        'appointment' AS "source"
      FROM appointments
      WHERE appointment_date >= CURRENT_DATE
        AND status <> 'cancelled'
      UNION ALL
      SELECT
        id,
        preferred_date AS "blockDate",
        preferred_time_window AS "timeWindow",
        'Confirmed intake request' AS reason,
        'appointment' AS "source"
      FROM contact_requests
      WHERE request_type = 'intake'
        AND preferred_date >= CURRENT_DATE
        AND mrsms_confirmed_at IS NOT NULL
        AND canceled_at IS NULL
        AND auto_cancelled_at IS NULL
      UNION ALL
      SELECT
        id,
        preferred_date AS "blockDate",
        preferred_time_window AS "timeWindow",
        CASE
          WHEN status = 'reserved' THEN 'Checkout in progress'
          ELSE 'Appointment request held'
        END AS reason,
        'appointment' AS "source"
      FROM appointment_slot_reservations
      WHERE preferred_date >= CURRENT_DATE
        AND status IN ('reserved', 'held', 'confirmed')
      ORDER BY "blockDate" ASC, "timeWindow" ASC
      LIMIT 120
    `);

    response.json({ blockedTimes: result.rows });
  } catch (error) {
    console.error('Availability load failed', error);
    response.json({ blockedTimes: [] });
  }
});

export default router;
