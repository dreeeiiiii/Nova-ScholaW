import { Router } from 'express';

import authenticate from '../middleware/authenticate.js';
import requireRole from '../middleware/requireRole.js';
import { listAuditLogs } from '../controllers/auditLogController.js';

const router = Router();

router.get('/audit-logs', authenticate, requireRole('admin'), listAuditLogs);

export default router;
