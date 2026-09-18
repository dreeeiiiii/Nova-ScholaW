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
} from './userController.js';

const router = Router();

router.use(authenticate, requireRole('admin'));

router.get('/', listUsers);
router.get('/:id', getUser);
router.post('/', createUser);
router.put('/:id', updateUser);
router.patch('/:id/deactivate', deactivateUser);
router.patch('/:id/activate', activateUser);

export default router;