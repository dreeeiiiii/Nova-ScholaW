export const normalizeName = value => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
const invalid = message => { throw Object.assign(new Error(message), { status: 400 }); };
export function validateSectionName(value) {
  const name = normalizeName(value);
  if (!name || name.length > 100 || !/^[\p{L}\p{N}][\p{L}\p{N} .()'/&–—-]*[\p{L}\p{N})]$/u.test(name)
    || !/\p{L}/u.test(name) || !/\p{N}/u.test(name) || /[./&-]{3}/.test(name)) {
    invalid('Enter an official section name containing letters and a grade/year number (maximum 100 characters).');
  }
  return name;
}
