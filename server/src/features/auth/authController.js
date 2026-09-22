import { signToken } from '../../shared/utils/jwt.js';
import { comparePassword, hashPassword } from '../../shared/utils/password.js';
import { normalizeEmail } from '../../shared/utils/nstEmail.js';
import { audit } from '../audit/auditService.js';
import { findByEmailWithHash, findByEmail, createUser as insertUser, updateLastLogin, findByIdWithJoins } from '../users/userModel.js';
import { findSectionById } from '../academic/sectionModel.js';
import { findCourseById } from '../academic/courseModel.js';

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

const toNullableId = (raw) => {
  if (raw === null || raw === undefined || raw === '') return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const register = async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const email = normalizeEmail(body.email);
    const password = typeof body.password === 'string' ? body.password : '';
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';

    if (fullName === '' || fullName.length > 100) {
      return res.status(400).json({ status: 400, message: 'Full name must be between 1 and 100 characters.' });
    }
    if (!email.toLowerCase().endsWith('@my.nst.edu.ph')) {
      return res.status(400).json({ status: 400, message: 'Only @my.nst.edu.ph emails can register' });
    }
    if (password.length < 8) {
      return res.status(400).json({ status: 400, message: 'Password must be at least 8 characters long.' });
    }

    const existing = await findByEmail(email);
    if (existing) {
      return res.status(409).json({ status: 409, message: 'Email already registered' });
    }

    const section_id = toNullableId(body.section_id);
    const course_id = toNullableId(body.course_id);

    if (section_id !== null) {
      const section = await findSectionById(section_id);
      if (!section) {
        return res.status(400).json({ status: 400, message: `Section with id ${section_id} does not exist.` });
      }
    }
    if (course_id !== null) {
      const course = await findCourseById(course_id);
      if (!course) {
        return res.status(400).json({ status: 400, message: `Course with id ${course_id} does not exist.` });
      }
    }

    const password_hash = await hashPassword(password);
    const user = await insertUser({
      email,
      password_hash,
      full_name: fullName,
      role: 'student',
      section_id,
      course_id,
    });

    await audit(req, 'users.register', 'user', user.id, { email });

    return res.status(201).json({ message: 'Account created. You can now log in.' });
  } catch (err) {
    return next(err);
  }
};
