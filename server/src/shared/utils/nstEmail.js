import config from '../config/env.js';

export const normalizeEmail = (email) =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

/**
 * Returns true when the address ends with the configured NST_EMAIL_DOMAIN.
 * When the domain is not configured (development fallback), validation is relaxed.
 */
export const isNstEmail = (email) => {
  const value = normalizeEmail(email);
  if (value === '' || !value.includes('@')) return false;

  const domain = (config.nstEmailDomain || '').trim().toLowerCase();
  if (domain === '') return true;
  return value.endsWith(`@${domain}`);
};