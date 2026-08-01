CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
);

CREATE INDEX IF NOT EXISTS contact_requests_created_at_idx
  ON contact_requests (created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS contact_requests_cancel_token_idx
  ON contact_requests (cancel_token);

CREATE UNIQUE INDEX IF NOT EXISTS contact_requests_patient_confirm_token_idx
  ON contact_requests (patient_confirm_token);

CREATE INDEX IF NOT EXISTS contact_requests_preferred_date_idx
  ON contact_requests (preferred_date);

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
);

CREATE INDEX IF NOT EXISTS appointments_date_idx
  ON appointments (appointment_date);

CREATE TABLE IF NOT EXISTS blocked_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_date DATE NOT NULL,
  time_window TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS blocked_times_date_idx
  ON blocked_times (block_date);
