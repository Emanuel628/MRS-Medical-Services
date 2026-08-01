import pg from 'pg';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

function normalizeConnectionString(value: string | undefined) {
  if (!value) return undefined;

  try {
    new URL(value);
    return value;
  } catch {
    const schemeSeparator = value.indexOf('://');
    const authSeparator = value.lastIndexOf('@');

    if (schemeSeparator === -1 || authSeparator === -1) return value;

    const schemeAndSlashes = value.slice(0, schemeSeparator + 3);
    const auth = value.slice(schemeSeparator + 3, authSeparator);
    const hostAndPath = value.slice(authSeparator + 1);
    const passwordSeparator = auth.indexOf(':');

    if (passwordSeparator === -1) return value;

    const user = auth.slice(0, passwordSeparator);
    const password = auth.slice(passwordSeparator + 1);
    return `${schemeAndSlashes}${encodeURIComponent(user)}:${encodeURIComponent(password)}@${hostAndPath}`;
  }
}

export const pool = new Pool({
  connectionString: normalizeConnectionString(connectionString),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  query_timeout: 15000,
  statement_timeout: 15000,
});
