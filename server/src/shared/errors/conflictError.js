const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';

const uniqueViolationMessage = (err, label) =>
  err.constraint?.includes('name')
    ? `${label} with this name already exists.`
    : `${label} with this code already exists.`;

export const handleConflict = (err, res, label) => {
  if (err.code === UNIQUE_VIOLATION) {
    return res.status(409).json({
      status: 409,
      message: uniqueViolationMessage(err, label),
    });
  }
  if (err.code === FOREIGN_KEY_VIOLATION) {
    return res.status(409).json({
      status: 409,
      message: `${label} is referenced by other records and cannot be deleted.`,
    });
  }
  return null;
};
