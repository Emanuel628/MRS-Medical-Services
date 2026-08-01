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
        reason
      FROM blocked_times
      WHERE block_date >= CURRENT_DATE
      ORDER BY block_date ASC, time_window ASC
      LIMIT 30
    `);

    response.json({ blockedTimes: result.rows });
  } catch (error) {
    console.error('Availability load failed', error);
    response.json({ blockedTimes: [] });
  }
});

export default router;
