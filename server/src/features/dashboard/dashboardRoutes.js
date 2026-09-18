import { Router } from 'express';

import authenticate from '../../shared/middleware/authenticate.js';
import requireRole from '../../shared/middleware/requireRole.js';
import { getDashboardStats } from './dashboardController.js';

const router = Router();

router.get('/dashboard/stats', authenticate, requireRole('admin'), getDashboardStats);

export default router;
