import { query } from '../config/db.js';
import { signToken } from '../utils/jwt.js';
import { comparePassword } from '../utils/password.js';
import { audit } from '../services/auditService.js';

const GENERIC_LOGIN_ERROR = 'Invalid email or password.';
const DEACTIVATED_MESSAGE = 'This account has been deactivated. Please contact the administrator.';

export const login = async (req, res, next) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (email === '' || password === '') {
      return res.status(400).json({ status: 400, message: 'Email and password are required.' });
    }

    const { rows } = await query(
      `SELECT id, email, password_hash, full_name, role, section_id, course_id,
              is_active, last_login_at, created_at
         FROM users
        WHERE email = $1`,
      [email]
    );
    const user = rows[0];

    const validPassword = user ? await comparePassword(password, user.password_hash) : false;

    if (!user || !validPassword) {
      await audit(req, 'auth.login_failure', 'auth', null, { email });
      return res.status(401).json({ status: 401, message: GENERIC_LOGIN_ERROR });
    }

    if (!user.is_active) {
      await audit(req, 'auth.login_failure', 'auth', user.id, { email, reason: 'deactivated' });
      return res.status(403).json({ status: 403, message: DEACTIVATED_MESSAGE });
    }

    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
    await audit(req, 'auth.login_success', 'auth', user.id, { email });

    const token = signToken({ userId: user.id, role: user.role });

    const { password_hash: _hash, ...safeUser } = user;
    safeUser.last_login_at = new Date().toISOString();

    return res.json({ token, user: safeUser });
  } catch (err) {
    return next(err);
  }
};

export const me = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.email, u.full_name, u.role, u.section_id, u.course_id,
              u.is_active, u.last_login_at, u.created_at,
              s.name AS section_name,
              c.name AS course_name
         FROM users u
         LEFT JOIN sections s ON s.id = u.section_id
         LEFT JOIN courses c ON c.id = u.course_id
        WHERE u.id = $1`,
      [req.user.id]
    );

    const user = rows[0];
    if (!user) {
      return res.status(404).json({ status: 404, message: 'User not found.' });
    }

    return res.json({ user });
  } catch (err) {
    return next(err);
  }
};

export const logout = (_req, res) => {
  return res.json({
    message: 'Logged out successfully. Please discard your token on the client.',
  });
};