import { Router } from 'express';
import { getWorkflowAnalytics, getDashboardStats } from '../controllers/analytics.controller.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';
const router = Router();
router.use(authenticateJWT);
// @ts-ignore
router.get('/dashboard', getDashboardStats);
// @ts-ignore
router.get('/workflow/:workflowId', getWorkflowAnalytics);
export default router;
//# sourceMappingURL=analytics.routes.js.map