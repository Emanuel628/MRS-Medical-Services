import { Router } from 'express';
import { pool } from '../config/database.js';
import { ensureScheduleTables } from './admin.js';

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
