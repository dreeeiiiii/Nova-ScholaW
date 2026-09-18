import { Router } from 'express';

import authenticate from '../../shared/middleware/authenticate.js';
import requireRole from '../../shared/middleware/requireRole.js';
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deactivateUser,
  activateUser,
  searchStudents,
} from './userController.js';

const router = Router();

const adminOnly = [authenticate, requireRole('admin')];
const teacherOrAdmin = [authenticate, requireRole('admin', 'teacher')];

router.get('/students/search', teacherOrAdmin, searchStudents);

router.get('/', adminOnly, listUsers);
router.get('/:id', adminOnly, getUser);
router.post('/', adminOnly, createUser);
router.put('/:id', adminOnly, updateUser);
router.patch('/:id/deactivate', adminOnly, deactivateUser);
router.patch('/:id/activate', adminOnly, activateUser);

export default router;