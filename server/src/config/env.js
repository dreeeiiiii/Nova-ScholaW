import { randomBytes } from 'node:crypto';
import path from 'node:path';
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
  ['DATABASE_URL', 'JWT_SECRET', 'CLIENT_ORIGIN', 'UPLOAD_DIR', 'NST_EMAIL_DOMAIN'].forEach(requireEnv);
}

const optional = (key, note) => {
  if (!process.env[key]) warn(key, note);
  return process.env[key];
};

const jwtSecret =
  process.env.JWT_SECRET ??
  (() => {
    warn('JWT_SECRET', 'using an in-memory secret — tokens will not survive restarts (development only)');
    return randomBytes(32).toString('hex');
  })();

const config = Object.freeze({
  nodeEnv,
  isProduction,
  port,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  databaseUrl: optional('DATABASE_URL', 'database features disabled until server/.env is configured'),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads'),
  nstEmailDomain: optional('NST_EMAIL_DOMAIN', 'email-domain validation will be relaxed'),
  maxImageSizeMb: Number(process.env.MAX_IMAGE_SIZE_MB || 10),
  maxVideoSizeMb: Number(process.env.MAX_VIDEO_SIZE_MB || 50),
  maxVideoDurationSeconds: Number(process.env.MAX_VIDEO_DURATION_SECONDS || 120),
});

export default config;