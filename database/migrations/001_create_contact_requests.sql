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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
