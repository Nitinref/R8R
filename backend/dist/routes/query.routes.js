import { Router } from 'express';
import { executeQuery, getQueryHistory } from '../controllers/query.controller.js';
import { authenticateApiKey, authenticateJWT } from '../middleware/auth.middleware.js';
import { queryLimiter } from '../middleware/rate-limiter.middleware.js';
const router = Router();
// Can use either JWT or API key
router.post('/', queryLimiter, authenticateApiKey, executeQuery);
router.get('/history', authenticateJWT, getQueryHistory);
export default router;
//# sourceMappingURL=query.routes.js.map