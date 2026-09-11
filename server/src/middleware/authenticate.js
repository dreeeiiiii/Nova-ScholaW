import { verifyToken } from '../utils/jwt.js';
import { query } from '../config/db.js';

const extractBearerToken = (req) => {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
};

export const authenticate = async (req, res, next) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ status: 401, message: 'Missing or malformed Authorization header.' });
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (err) {
      return res.status(401).json({ status: 401, message: 'Invalid or expired token.' });
    }

    const { rows } = await query(
      `SELECT id, email, full_name, role, section_id, course_id, is_active
         FROM users
        WHERE id = $1`,
      [payload.userId ?? payload.sub ?? payload.id]
    );

    const user = rows[0];
    if (!user) {
      return res.status(401).json({ status: 401, message: 'User no longer exists.' });
    }
    if (!user.is_active) {
      return res.status(403).json({ status: 403, message: 'Account is deactivated.' });
    }

    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
};

export const requireAuth = authenticate;

export default authenticate;