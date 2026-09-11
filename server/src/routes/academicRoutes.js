import { Router } from 'express';

import authenticate from '../middleware/authenticate.js';
import requireRole from '../middleware/requireRole.js';
import {
  listSections,
  createSection,
  updateSection,
  deleteSection,
  listCourses,
  createCourse,
  updateCourse,
  deleteCourse,
} from '../controllers/academicController.js';

const router = Router();
const adminOnly = [authenticate, requireRole('admin')];

router.get('/sections', authenticate, listSections);
router.post('/sections', adminOnly, createSection);
router.put('/sections/:id', adminOnly, updateSection);
router.delete('/sections/:id', adminOnly, deleteSection);

router.get('/courses', authenticate, listCourses);
router.post('/courses', adminOnly, createCourse);
router.put('/courses/:id', adminOnly, updateCourse);
router.delete('/courses/:id', adminOnly, deleteCourse);

export default router;