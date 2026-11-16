/**
 * All settings in one place, read from environment variables.
 *
 * Locally: copy .env.example to .env and edit it. .env is listed in .gitignore, so it never reaches GitHub.
 * On the host: set the same variables in the host's dashboard (no .env file there).
 *
 * In production (NODE_ENV=production) the server refuses to start with unsafe settings
 * instead of silently falling back to development values.
 */
const fs = require('fs');
const path = require('path');

/* Minimal .env loader (no extra package): KEY=value lines, # comments, optional quotes. Real env vars win. */
function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadDotEnv(path.join(__dirname, '..', '.env'));

const env = process.env;
const isProd = env.NODE_ENV === 'production';
const DEV_SECRET = 'team3-dev-secret-change-me';
const int = (v, d) => (v === undefined || v === '' ? d : Number.parseInt(v, 10));
const bool = (v) => ['1', 'true', 'yes', 'on'].includes(String(v || '').toLowerCase());

/** TRUST_PROXY: how many proxies sit in front of Express (the host's HTTPS server = 1). 'loopback' for local dev. */
function trustProxy(v) {
  if (v === undefined || v === '') return isProd ? 1 : 'loopback';
  if (/^\d+$/.test(v)) return Number(v);
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v;
}

const config = {
  isProd,
  port: int(env.PORT, 4000),
  trustProxy: trustProxy(env.TRUST_PROXY),
  db: {
    host: env.DB_HOST || '127.0.0.1',
    port: int(env.DB_PORT, 3306),
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'team3_store',
    // Hosted MySQL usually requires an encrypted connection. DB_SSL=true turns it on (certificate is verified).
    ssl: bool(env.DB_SSL) ? { minVersion: 'TLSv1.2', rejectUnauthorized: !bool(env.DB_SSL_ALLOW_SELF_SIGNED) } : undefined,
  },
  jwt: {
    secret: env.JWT_SECRET || DEV_SECRET,
    ttl: env.JWT_TTL || '2h',
  },
  bcryptCost: int(env.BCRYPT_COST, 10),
  login: {
    accountLockAfter: int(env.LOGIN_LOCK_AFTER, 5),        // wrong passwords from UNKNOWN devices before the account locks for them
    lockMinutes: int(env.LOGIN_LOCK_MINUTES, 15),
    ipLimit: int(env.LOGIN_IP_LIMIT, 30),                  // wrong passwords per IP address per window
    ipWindowMinutes: int(env.LOGIN_IP_WINDOW_MINUTES, 15),
    deviceDays: int(env.TRUSTED_DEVICE_DAYS, 180),         // how long a device stays "known" after a successful sign-in
  },
  secureCookies: isProd || bool(env.SECURE_COOKIES),       // Secure flag = cookie only sent over HTTPS
};

/* Refuse to start in production with settings that would be unsafe on the internet. */
const problems = [];
if (isProd) {
  if (!env.JWT_SECRET || env.JWT_SECRET === DEV_SECRET) problems.push('JWT_SECRET is not set (or is the development value).');
  else if (env.JWT_SECRET.length < 32) problems.push('JWT_SECRET must be at least 32 characters.');
  if (!env.DB_PASSWORD) problems.push('DB_PASSWORD is empty.');
}
if (!(config.bcryptCost >= 10 && config.bcryptCost <= 14)) problems.push('BCRYPT_COST must be between 10 and 14.');
if (problems.length) {
  console.error(`\nRefusing to start: unsafe configuration${isProd ? ' for production' : ''}:\n  - ${problems.join('\n  - ')}\nSee .env.example.\n`);
  process.exit(1);
}
if (!isProd && config.jwt.secret === DEV_SECRET) console.warn('[config] Using the development JWT secret. Fine on your laptop; never in production.');

module.exports = config;
