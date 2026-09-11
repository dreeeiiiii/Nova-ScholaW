import { Router } from 'express';

import { login, logout, me } from '../controllers/authController.js';
import authenticate from '../middleware/authenticate.js';
import rateLimiter from '../middleware/rateLimiter.js';

const router = Router();

router.post('/login', rateLimiter(), login);
router.get('/me', authenticate, me);
router.post('/logout', logout);

export default router;