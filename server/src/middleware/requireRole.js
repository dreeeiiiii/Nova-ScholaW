export const requireRole = (...allowedRoles) => (req, res, next) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ status: 401, message: 'Authentication required.' });
  }
  if (!allowedRoles.includes(user.role)) {
    return res.status(403).json({ status: 403, message: 'You do not have permission to perform this action.' });
  }
  return next();
};

export default requireRole;