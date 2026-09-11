import { Router } from 'express';

import authenticate from '../middleware/authenticate.js';
import requireRole from '../middleware/requireRole.js';
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deactivateUser,
  activateUser,
} from '../controllers/userController.js';

const router = Router();

router.use(authenticate, requireRole('admin'));

router.get('/', listUsers);
router.get('/:id', getUser);
router.post('/', createUser);
router.put('/:id', updateUser);
router.patch('/:id/deactivate', deactivateUser);
router.patch('/:id/activate', activateUser);

export default router;