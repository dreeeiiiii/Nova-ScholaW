import { Router } from 'express';

import authenticate from '../middleware/authenticate.js';
import requireRole from '../middleware/requireRole.js';
import { getDashboardStats } from '../controllers/dashboardController.js';

const router = Router();

router.get('/dashboard/stats', authenticate, requireRole('admin'), getDashboardStats);

export default router;
