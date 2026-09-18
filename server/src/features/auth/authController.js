import { signToken } from '../../shared/utils/jwt.js';
import { comparePassword } from '../../shared/utils/password.js';
import { audit } from '../audit/auditService.js';
import { findByEmailWithHash, updateLastLogin, findByIdWithJoins } from '../users/userModel.js';

const GENERIC_LOGIN_ERROR = 'Invalid email or password.';
const DEACTIVATED_MESSAGE = 'This account has been deactivated. Please contact the administrator.';

export const login = async (req, res, next) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (email === '' || password === '') {
      return res.status(400).json({ status: 400, message: 'Email and password are required.' });
    }

    const user = await findByEmailWithHash(email);

    const validPassword = user ? await comparePassword(password, user.password_hash) : false;

    if (!user || !validPassword) {
      await audit(req, 'auth.login_failure', 'auth', null, { email });
      return res.status(401).json({ status: 401, message: GENERIC_LOGIN_ERROR });
    }

    if (!user.is_active) {
      await audit(req, 'auth.login_failure', 'auth', user.id, { email, reason: 'deactivated' });
      return res.status(403).json({ status: 403, message: DEACTIVATED_MESSAGE });
    }

    await updateLastLogin(user.id);
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
    const user = await findByIdWithJoins(req.user.id);

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
