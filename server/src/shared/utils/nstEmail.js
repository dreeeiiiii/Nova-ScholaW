import config from '../config/env.js';

export const normalizeEmail = (email) =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

const emailDomainPart = (email) => {
  const value = normalizeEmail(email);
  const at = value.lastIndexOf('@');
  if (at <= 0 || at === value.length - 1) return '';
  return value.slice(at + 1);
};

/**
 * Institutional email domain required for each role.
 * Admin -> @nst.edu.ph ; Teacher -> @tr.nst.edu.ph ; Student -> @my.nst.edu.ph
 * (each configurable via NST_*_EMAIL_DOMAIN, see shared/config/env.js).
 * Returns null for unknown roles.
 */
export const getRoleEmailDomain = (role) => {
  if (role === 'admin') return (config.adminEmailDomain || '').trim().toLowerCase();
  if (role === 'teacher') return (config.teacherEmailDomain || '').trim().toLowerCase();
  if (role === 'student') return (config.studentEmailDomain || '').trim().toLowerCase();
  return null;
};

/**
 * Returns true when the address belongs to the institutional domain required
 * for the given role. Unknown roles never validate.
 */
export const isRoleEmail = (email, role) => {
  const domain = getRoleEmailDomain(role);
  if (!domain) return false;
  return emailDomainPart(email) === domain;
};

/**
 * Legacy single-domain check — now an alias for the student domain.
 * Prefer isRoleEmail(email, role) for role-aware validation.
 * When no student domain is configured (development fallback), validation is relaxed.
 */
export const isNstEmail = (email) => {
  const value = normalizeEmail(email);
  if (value === '' || !value.includes('@')) return false;

  const domain = (config.studentEmailDomain || config.nstEmailDomain || '').trim().toLowerCase();
  if (domain === '') return true;
  return emailDomainPart(value) === domain;
};
