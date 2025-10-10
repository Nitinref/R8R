import { Router } from 'express';
import { createWorkflow, listWorkflows, getWorkflow, updateWorkflow, deleteWorkflow } from '../controllers/workflow.controller.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';
const router = Router();
router.use(authenticateJWT);
router.post('/', createWorkflow);
router.get('/', listWorkflows);
router.get('/:workflowId', getWorkflow);
router.put('/:workflowId', updateWorkflow);
router.delete('/:workflowId', deleteWorkflow);
export default router;
//# sourceMappingURL=workflow.routes.js.map