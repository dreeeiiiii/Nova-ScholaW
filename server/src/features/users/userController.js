import config from '../../shared/config/env.js';
import * as userRepo from './userModel.js';
import * as sectionRepo from '../academic/sectionModel.js';
import * as courseRepo from '../academic/courseModel.js';
import { hashPassword } from '../../shared/utils/password.js';
import { isNstEmail, normalizeEmail } from '../../shared/utils/nstEmail.js';
import { audit } from '../audit/auditService.js';
import { parseId } from '../../shared/utils/parseId.js';
import { normalizeLimit, normalizeOffset } from '../../shared/utils/normalize.js';

const ROLE_LIST = ['admin', 'teacher', 'student'];

const sanitizeUser = (user) => {
  if (!user) return user;
  const { password_hash: _hash, ...safe } = user;
  return safe;
};

const toNullableId = (raw) => {
  if (raw === null || raw === undefined || raw === '') return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const normalizeSearch = (raw) => {
  const search = typeof raw === 'string' ? raw.trim() : '';
  return search === '' ? undefined : search;
};

const verifyAcademicRefs = async ({ section_id, course_id }) => {
  if (section_id !== null) {
    const section = await sectionRepo.findSectionById(section_id);
    if (!section) return `Section with id ${section_id} does not exist.`;
  }
  if (course_id !== null) {
    const course = await courseRepo.findCourseById(course_id);
    if (!course) return `Course with id ${course_id} does not exist.`;
  }
  return null;
};

const readRole = (body) => (body && ROLE_LIST.includes(body.role) ? body.role : null);
const readFullName = (body) =>
  typeof body?.full_name === 'string' && body.full_name.trim() !== ''
    ? body.full_name.trim()
    : null;

export const listUsers = async (req, res, next) => {
  try {
    const role = ROLE_LIST.includes(req.query.role) ? req.query.role : undefined;
    const search = normalizeSearch(req.query.search);

    const users = await userRepo.listUsers({
      role,
      search,
      limit: normalizeLimit(req.query.limit),
      offset: normalizeOffset(req.query.offset),
    });
    const total = await userRepo.countUsers({ role, search });

    return res.json({ users: users.map(sanitizeUser), total });
  } catch (err) {
    return next(err);
  }
};

export const getUser = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ status: 400, message: 'Invalid user id.' });
    }

    const user = await userRepo.findById(id);
    if (!user) {
      return res.status(404).json({ status: 404, message: 'User not found.' });
    }

    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    return next(err);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const email = normalizeEmail(body.email);
    const password = typeof body.password === 'string' ? body.password : '';
    const role = readRole(body);
    const fullName = readFullName(body);

    if (email === '') {
      return res.status(400).json({ status: 400, message: 'Email is required.' });
    }
    if (!isNstEmail(email)) {
      return res.status(400).json({
        status: 400,
        message: `Email must end with @${config.nstEmailDomain}.`,
      });
    }
    if (password === '' || password.length < 8) {
      return res.status(400).json({
        status: 400,
        message: 'Password must be at least 8 characters long.',
      });
    }
    if (fullName === null) {
      return res.status(400).json({ status: 400, message: 'Full name is required.' });
    }
    if (role === null) {
      return res.status(400).json({
        status: 400,
        message: 'Role must be one of: admin, teacher, student.',
      });
    }

    const existing = await userRepo.findByEmail(email);
    if (existing) {
      return res.status(409).json({ status: 409, message: 'A user with this email already exists.' });
    }

    const section_id = role === 'student' ? toNullableId(body.section_id) : null;
    const course_id = role === 'student' ? toNullableId(body.course_id) : null;

    const refError = await verifyAcademicRefs({ section_id, course_id });
    if (refError) {
      return res.status(400).json({ status: 400, message: refError });
    }

    const password_hash = await hashPassword(password);
    const user = await userRepo.createUser({
      email,
      password_hash,
      full_name: fullName,
      role,
      section_id,
      course_id,
    });

    await audit(req, 'user.create', 'user', user.id, { email, role, full_name: fullName });

    return res.status(201).json({
      message: 'User created successfully.',
      user: sanitizeUser(user),
    });
  } catch (err) {
    return next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ status: 400, message: 'Invalid user id.' });
    }

    const existing = await userRepo.findById(id);
    if (!existing) {
      return res.status(404).json({ status: 404, message: 'User not found.' });
    }

    const body = req.body ?? {};
    const fields = {};

    const fullName = readFullName(body);
    if (fullName !== null) fields.full_name = fullName;

    const role = readRole(body);
    if (role !== null) fields.role = role;

    if (body.section_id !== undefined) fields.section_id = toNullableId(body.section_id);
    if (body.course_id !== undefined) fields.course_id = toNullableId(body.course_id);

    const refError = await verifyAcademicRefs({
      section_id: toNullableId(fields.section_id),
      course_id: toNullableId(fields.course_id),
    });
    if (refError) {
      return res.status(400).json({ status: 400, message: refError });
    }

    const user = await userRepo.updateUser(id, fields);
    await audit(req, 'user.update', 'user', id, { updated_fields: Object.keys(fields) });
    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    return next(err);
  }
};

export const deactivateUser = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ status: 400, message: 'Invalid user id.' });
    }
    if (id === req.user.id) {
      return res.status(400).json({
        status: 400,
        message: 'You cannot deactivate your own account.',
      });
    }

    const existing = await userRepo.findById(id);
    if (!existing) {
      return res.status(404).json({ status: 404, message: 'User not found.' });
    }

    const user = await userRepo.deactivateUser(id);
    await audit(req, 'user.deactivate', 'user', id, null);
    return res.json({ message: 'User deactivated.', user: sanitizeUser(user) });
  } catch (err) {
    return next(err);
  }
};

export const activateUser = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ status: 400, message: 'Invalid user id.' });
    }

    const existing = await userRepo.findById(id);
    if (!existing) {
      return res.status(404).json({ status: 404, message: 'User not found.' });
    }

    const user = await userRepo.activateUser(id);
    await audit(req, 'user.activate', 'user', id, null);
    return res.json({ message: 'User activated.', user: sanitizeUser(user) });
  } catch (err) {
    return next(err);
  }
};