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

router.get('/', listCategoriesHandler);
router.post('/', adminOnly, createCategoryHandler);
router.put('/:id', adminOnly, updateCategoryHandler);
router.delete('/:id', adminOnly, deleteCategoryHandler);

export default router;
