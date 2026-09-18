export const normalizeLimit = (raw) => {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? Math.min(value, 200) : 50;
};

export const normalizeOffset = (raw) => {
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : 0;
};

export const readNonEmpty = (value) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

export const readOptionalString = readNonEmpty;

export const readOptionalDate = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date.toISOString();
};
