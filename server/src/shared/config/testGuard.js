import dotenv from 'dotenv';
import path from 'node:path';

import config from './env.js';

// Hosted-database indicators. Test databases must be local/private;
// anything looking like a cloud-hosted database is rejected fail-closed.
const HOSTED_PATTERNS = [
  /neon\.tech/i,
  /amazonaws/i,
  /render\.com/i,
  /railway(\.app)?/i,
  /supabase\.co/i,
  /planetscale/i,
  /aivencloud\.com/i,
];

// Load test-only overrides (gitignored server/.env.test) before the URL is
// read. dotenv never overrides variables that are already set, so explicit
// environment always wins over the file.
if ((process.env.NODE_ENV || 'development') === 'test') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });
}

/**
 * Fail-closed safety gate for the test database connection.
 *
 * Rejects (by throwing, before any pool/client is created):
 *   - any run where NODE_ENV is 'production', or is not 'test'
 *   - a missing DATABASE_URL_TEST (never falls back to production DATABASE_URL)
 *   - a DATABASE_URL_TEST identical to the production DATABASE_URL
 *   - hosted/cloud database hosts (Neon, AWS, Render, Railway, Supabase, ...)
 *   - database names that do not contain "test"
 *
 * Returns the validated test connection string. Callers must use the return
 * value — never the raw environment variable.
 */
export const assertTestDatabaseSafety = (testUrl) => {
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (nodeEnv === 'production') {
    throw new Error(
      '[testGuard] Refusing to run tests with NODE_ENV=production. Use NODE_ENV=test with DATABASE_URL_TEST.'
    );
  }
  if (nodeEnv !== 'test') {
    throw new Error(
      `[testGuard] Refusing to select a test database outside NODE_ENV=test (current: ${nodeEnv}). Run tests via "npm test".`
    );
  }
  if (!testUrl) {
    throw new Error(
      '[testGuard] Refusing to run tests: DATABASE_URL_TEST is not set. ' +
        'Create a dedicated test database and configure server/.env.test (see server/.env.test.example). ' +
        'The production DATABASE_URL is never used for tests.'
    );
  }

  let parsed;
  try {
    parsed = new URL(testUrl);
  } catch {
    throw new Error('[testGuard] Refusing to run tests: DATABASE_URL_TEST is not a valid URL.');
  }
  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    throw new Error('[testGuard] Refusing to run tests: DATABASE_URL_TEST must be a postgresql:// URL.');
  }
  for (const pattern of HOSTED_PATTERNS) {
    if (pattern.test(parsed.host)) {
      throw new Error(
        `[testGuard] Refusing to run tests: DATABASE_URL_TEST points at a hosted database host (${parsed.host}). ` +
          'Use a clearly-identified local/private test database.'
      );
    }
  }
  if (config.databaseUrl && testUrl === config.databaseUrl) {
    throw new Error('[testGuard] Refusing to run tests: DATABASE_URL_TEST is identical to the production DATABASE_URL.');
  }
  const dbName = parsed.pathname.replace(/^\//, '').split('?')[0];
  if (!/test/i.test(dbName)) {
    throw new Error(
      `[testGuard] Refusing to run tests: test database name "${dbName || '(empty)'}" does not contain "test". ` +
        'Name the isolated database accordingly (e.g. novalschola_test).'
    );
  }

  return testUrl;
};
