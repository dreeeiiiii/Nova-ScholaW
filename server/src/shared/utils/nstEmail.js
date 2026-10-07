export const normalizeEmail = email => typeof email === 'string' ? email.trim().toLowerCase() : '';
const domains = Object.freeze({admin:'nst.edu.ph',teacher:'tr.nst.edu.ph',student:'my.nst.edu.ph'});
export const getRoleEmailDomain = role => domains[role] ?? null;
export const isRoleEmail = (email,role) => {
  const value=normalizeEmail(email),domain=getRoleEmailDomain(role);
  return Boolean(value.length<=255 && domain && /^[^@\s]+@[^@\s]+$/.test(value) && value.split('@')[1]===domain);
};
export const isNstEmail = email => isRoleEmail(email,'student');
