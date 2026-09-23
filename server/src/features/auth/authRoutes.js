import { Router } from 'express';

import { login, logout, me, register, listSections } from './authController.js';
import authenticate from '../../shared/middleware/authenticate.js';
import rateLimiter from '../../shared/middleware/rateLimiter.js';
import registerRateLimiter from '../../shared/middleware/registerRateLimiter.js';

const router = Router();

router.post('/register', registerRateLimiter, register);
router.get('/sections', listSections);
router.post('/login', rateLimiter(), login);
router.get('/me', authenticate, me);
router.post('/logout', logout);

export default router;