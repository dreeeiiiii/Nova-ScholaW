import { Router } from 'express';
import authenticate from '../../shared/middleware/authenticate.js';
import requireRole from '../../shared/middleware/requireRole.js';
import {
  listCategoriesHandler,
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
} from './categoryController.js';

const router = Router();
const adminOnly = [authenticate, requireRole('admin')];
const staffOnly = [authenticate, requireRole('admin', 'teacher')];

router.get('/', listCategoriesHandler);
router.post('/', staffOnly, createCategoryHandler);
router.put('/:id', staffOnly, updateCategoryHandler);
router.delete('/:id', adminOnly, deleteCategoryHandler);

export default router;
