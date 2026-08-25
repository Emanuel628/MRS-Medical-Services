import { Router } from 'express';
import { pool } from '../config/database.js';
import { ensureScheduleTables } from './admin.js';
import { ensureDatabase } from './contact.js';

const router = Router();

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL);
}

router.get('/blocked-times', async (_request, response) => {
  response.set('Cache-Control', 'no-store');

  if (!hasDatabaseUrl()) {
    response.json({ blockedTimes: [] });
    return;
  }

  try {
    await ensureScheduleTables();
    await ensureDatabase();

    // A completed booking is authoritative even if its reservation row was
    // left in a temporary state by an interrupted checkout/webhook flow.
    // Repair those rows before expiring stale checkout-only reservations so a
    // genuinely booked appointment can never silently reopen.
    await pool.query(`
      UPDATE appointment_slot_reservations AS reservation
      SET status = 'confirmed',
        expires_at = NULL,
        updated_at = NOW()
      FROM contact_requests AS request
      WHERE reservation.contact_request_id = request.id
        AND reservation.status IN ('reserved', 'expired')
        AND request.request_type = 'intake'
        AND request.preferred_date >= CURRENT_DATE
        AND request.canceled_at IS NULL
        AND request.auto_cancelled_at IS NULL
        AND (
          request.mrsms_confirmed_at IS NOT NULL
          OR request.patient_confirmed_at IS NOT NULL
          OR request.payment_status = 'paid'
          OR request.status IN ('mrsms_confirmed', 'confirmed', 'completed')
        )
    `);

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
        AND canceled_at IS NULL
        AND auto_cancelled_at IS NULL
        AND (
          mrsms_confirmed_at IS NOT NULL
          OR patient_confirmed_at IS NOT NULL
          OR payment_status = 'paid'
          OR status IN ('mrsms_confirmed', 'confirmed', 'completed')
        )
      UNION ALL
      SELECT
        reservation.id,
        reservation.preferred_date AS "blockDate",
        reservation.preferred_time_window AS "timeWindow",
        CASE
          WHEN reservation.status = 'reserved' THEN 'Checkout in progress'
          WHEN reservation.status = 'held' THEN 'Appointment request held'
          ELSE 'Confirmed appointment'
        END AS reason,
        'appointment' AS "source"
      FROM appointment_slot_reservations AS reservation
      WHERE reservation.preferred_date >= CURRENT_DATE
        AND reservation.status IN ('reserved', 'held', 'confirmed')
        AND NOT EXISTS (
          SELECT 1
          FROM contact_requests AS request
          WHERE request.id = reservation.contact_request_id
            AND request.request_type = 'intake'
            AND request.canceled_at IS NULL
            AND request.auto_cancelled_at IS NULL
            AND (
              request.mrsms_confirmed_at IS NOT NULL
              OR request.patient_confirmed_at IS NOT NULL
              OR request.payment_status = 'paid'
              OR request.status IN ('mrsms_confirmed', 'confirmed', 'completed')
            )
        )
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
