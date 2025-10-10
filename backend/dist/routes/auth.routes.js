import { Prisma } from '../../generated/prisma/index.js';
import { Router } from 'express';
import { register, login, createApiKey, listApiKeys, deleteApiKey } from '../controllers/auth.controllers.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';
import { apiLimiter } from '../middleware/rate-limiter.middleware.js';
const router = Router();
router.post('/register', apiLimiter, register);
router.post('/login', apiLimiter, login);
router.post('/api-keys', authenticateJWT, createApiKey);
router.get('/api-keys', authenticateJWT, listApiKeys);
router.delete('/api-keys/:keyId', authenticateJWT, deleteApiKey);
export default router;
//# sourceMappingURL=auth.routes.js.map