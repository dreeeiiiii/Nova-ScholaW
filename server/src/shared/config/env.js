import { randomBytes } from 'node:crypto';
import 'dotenv/config';

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

const requireEnv = (key) => {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${key}. See server/.env.example.`);
  }
  return value;
};

const warn = (key, note) => {
  console.warn(`[env] ${key} is not set${note ? ` — ${note}` : ''}.`);
};

const portRaw = process.env.PORT || '5000';
const port = Number(portRaw);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

if (isProduction) {
  ['DATABASE_URL', 'JWT_SECRET', 'CLIENT_ORIGIN'].forEach(requireEnv);
}

const b2BucketName = requireEnv('B2_BUCKET_NAME');
const b2BucketId = requireEnv('B2_BUCKET_ID');
const b2Endpoint = requireEnv('B2_ENDPOINT');
const b2Region = requireEnv('B2_REGION');
const b2KeyId = requireEnv('B2_KEY_ID');
const b2ApplicationKey = requireEnv('B2_APPLICATION_KEY');

const b2PresignExpirySecondsRaw = process.env.B2_PRESIGN_EXPIRY_SECONDS || '3600';
const b2PresignExpirySeconds = Number(b2PresignExpirySecondsRaw);
if (!Number.isInteger(b2PresignExpirySeconds) || b2PresignExpirySeconds < 1) {
  throw new Error('B2_PRESIGN_EXPIRY_SECONDS must be a positive integer.');
}

const optional = (key, note) => {
  if (!process.env[key]) warn(key, note);
  return process.env[key];
};

// Role-specific institutional email domains. Each resolves from its dedicated
// variable, falling back to the legacy single-domain variable for students
// (backward compatibility with existing deployments), then to the
// institutional default.
const resolveDomain = (specificKey, legacyKey, defaultDomain) => {
  const raw = process.env[specificKey] ?? (legacyKey ? process.env[legacyKey] : undefined) ?? defaultDomain;
  const domain = String(raw).trim().toLowerCase();
  if (!process.env[specificKey] && !(legacyKey && process.env[legacyKey])) {
    warn(specificKey, `defaulting to ${domain}`);
  }
  return domain;
};

const jwtSecret =
  process.env.JWT_SECRET ??
  (() => {
    warn('JWT_SECRET', 'using an in-memory secret — tokens will not survive restarts (development only)');
    return randomBytes(32).toString('hex');
  })();

const adminEmailDomain = resolveDomain('NST_ADMIN_EMAIL_DOMAIN', null, 'nst.edu.ph');
const teacherEmailDomain = resolveDomain('NST_TEACHER_EMAIL_DOMAIN', null, 'tr.nst.edu.ph');
const studentEmailDomain = resolveDomain('NST_STUDENT_EMAIL_DOMAIN', 'NST_EMAIL_DOMAIN', 'my.nst.edu.ph');

const config = Object.freeze({
  nodeEnv,
  isProduction,
  port,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  announcementSchedulerEnabled: process.env.ANNOUNCEMENT_SCHEDULER_ENABLED === 'true',
  databaseUrl: optional('DATABASE_URL', 'database features disabled until server/.env is configured'),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  adminEmailDomain,
  teacherEmailDomain,
  studentEmailDomain,
  emailMode: process.env.EMAIL_MODE || 'mock',
  brevoApiKey: process.env.BREVO_API_KEY || '',
  emailSender: process.env.EMAIL_SENDER_ADDRESS || '',
  emailSenderName: process.env.EMAIL_SENDER_NAME || 'Nova Schola Hub',
  emailEnabledAt: process.env.EMAIL_ENABLED_AT || '',
  emailTestRecipient: process.env.EMAIL_TEST_RECIPIENT || '',
  b2BucketName,
  b2BucketId,
  b2Endpoint,
  b2Region,
  b2KeyId,
  b2ApplicationKey,
  b2PresignExpirySeconds,
});

export default config;
