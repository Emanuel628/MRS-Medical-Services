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

function getSslConfig(normalizedConnectionString: string | undefined) {
  if (process.env.NODE_ENV !== 'production') return false;

  const host = (() => {
    try {
      return normalizedConnectionString ? new URL(normalizedConnectionString).hostname : '';
    } catch {
      return '';
    }
  })();

  // Railway's private network is not exposed publicly, so certificate
  // verification does not add meaningful protection there and the internal
  // proxy does not always present a verifiable chain.
  if (host.endsWith('.railway.internal')) return false;

  const ca = process.env.DATABASE_CA_CERT;
  if (ca) return { ca, rejectUnauthorized: true };

  // No pinned CA: still require a verifiable certificate rather than
  // silently accepting any server identity. If the managed database's
  // certificate is not verifiable this way, either switch DATABASE_URL to
  // the private network host above or set DATABASE_CA_CERT.
  return { rejectUnauthorized: true };
}

const normalizedConnectionString = normalizeConnectionString(connectionString);

export const pool = new Pool({
  connectionString: normalizedConnectionString,
  ssl: getSslConfig(normalizedConnectionString),
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  query_timeout: 15000,
  statement_timeout: 15000,
});
