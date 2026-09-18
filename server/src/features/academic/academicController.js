import * as sectionRepo from './sectionModel.js';
import * as courseRepo from './courseModel.js';
import { parseId } from '../../shared/utils/parseId.js';
import { readNonEmpty } from '../../shared/utils/normalize.js';
import { handleConflict } from '../../shared/errors/conflictError.js';

export const listSections = async (_req, res, next) => {
  try {
    const sections = await sectionRepo.listSections();
    return res.json({ sections });
  } catch (err) {
    return next(err);
  }
};

export const createSection = async (req, res, next) => {
  try {
    const name = readNonEmpty(req.body?.name, 'name');
    const grade_level = readNonEmpty(req.body?.grade_level, 'grade_level');

    if (name === null || grade_level === null) {
      return res.status(400).json({
        status: 400,
        message: 'Name and grade_level are required.',
      });
    }

    const section = await sectionRepo.createSection({ name, grade_level });
    return res.status(201).json({ message: 'Section created.', section });
  } catch (err) {
    const handled = handleConflict(err, res, 'Section');
    return handled ?? next(err);
  }
};

export const updateSection = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ status: 400, message: 'Invalid section id.' });
    }

    const existing = await sectionRepo.findSectionById(id);
    if (!existing) {
      return res.status(404).json({ status: 404, message: 'Section not found.' });
    }

    const name = readNonEmpty(req.body?.name, 'name');
    const grade_level = readNonEmpty(req.body?.grade_level, 'grade_level');

    const section = await sectionRepo.updateSection(id, { name, grade_level });
    return res.json({ section });
  } catch (err) {
    const handled = handleConflict(err, res, 'Section');
    return handled ?? next(err);
  }
};

export const deleteSection = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ status: 400, message: 'Invalid section id.' });
    }

    const existing = await sectionRepo.findSectionById(id);
    if (!existing) {
      return res.status(404).json({ status: 404, message: 'Section not found.' });
    }

    const assigned = await sectionRepo.countUsersInSection(id);
    if (assigned > 0) {
      return res.status(400).json({
        status: 400,
        message: `Cannot delete this section: ${assigned} student(s) are still assigned to it.`,
      });
    }

    await sectionRepo.deleteSection(id);
    return res.json({ message: 'Section deleted.' });
  } catch (err) {
    const handled = handleConflict(err, res, 'Section');
    return handled ?? next(err);
  }
};

export const listCourses = async (_req, res, next) => {
  try {
    const courses = await courseRepo.listCourses();
    return res.json({ courses });
  } catch (err) {
    return next(err);
  }
};

export const createCourse = async (req, res, next) => {
  try {
    const name = readNonEmpty(req.body?.name, 'name');
    const code = readNonEmpty(req.body?.code, 'code');
    const description =
      typeof req.body?.description === 'string' && req.body.description.trim() !== ''
        ? req.body.description.trim()
        : null;

    if (name === null || code === null) {
      return res.status(400).json({
        status: 400,
        message: 'Name and code are required.',
      });
    }

    const course = await courseRepo.createCourse({ name, code, description });
    return res.status(201).json({ message: 'Course created.', course });
  } catch (err) {
    const handled = handleConflict(err, res, 'Course');
    return handled ?? next(err);
  }
};

export const updateCourse = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ status: 400, message: 'Invalid course id.' });
    }

    const existing = await courseRepo.findCourseById(id);
    if (!existing) {
      return res.status(404).json({ status: 404, message: 'Course not found.' });
    }

    const name = readNonEmpty(req.body?.name, 'name');
    const code = readNonEmpty(req.body?.code, 'code');
    const description =
      typeof req.body?.description === 'string' && req.body.description.trim() !== ''
        ? req.body.description.trim()
        : null;

    const course = await courseRepo.updateCourse(id, { name, code, description });
    return res.json({ course });
  } catch (err) {
    const handled = handleConflict(err, res, 'Course');
    return handled ?? next(err);
  }
};

export const deleteCourse = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ status: 400, message: 'Invalid course id.' });
    }

    const existing = await courseRepo.findCourseById(id);
    if (!existing) {
      return res.status(404).json({ status: 404, message: 'Course not found.' });
    }

    const assigned = await courseRepo.countUsersInCourse(id);
    if (assigned > 0) {
      return res.status(400).json({
        status: 400,
        message: `Cannot delete this course: ${assigned} student(s) are still assigned to it.`,
      });
    }

    await courseRepo.deleteCourse(id);
    return res.json({ message: 'Course deleted.' });
  } catch (err) {
    const handled = handleConflict(err, res, 'Course');
    return handled ?? next(err);
  }
};