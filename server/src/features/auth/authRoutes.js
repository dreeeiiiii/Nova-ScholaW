import { Router } from 'express';

import { login, logout, me } from './authController.js';
import authenticate from '../../shared/middleware/authenticate.js';
import rateLimiter from '../../shared/middleware/rateLimiter.js';

const router = Router();

router.post('/login', rateLimiter(), login);
router.get('/me', authenticate, me);
router.post('/logout', logout);

export default router;