import { Router } from 'express';

import authenticate from '../../shared/middleware/authenticate.js';
import requireRole from '../../shared/middleware/requireRole.js';
import { listAuditLogs } from './auditLogController.js';

const router = Router();

router.get('/audit-logs', authenticate, requireRole('admin'), listAuditLogs);

export default router;
