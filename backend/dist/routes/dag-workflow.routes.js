// routes/dag-workflows.routes.ts
import { Router } from 'express';
import { DAGWorkflowController } from '../controllers/dag-workflow.controller.js';
const router = Router();
const controller = new DAGWorkflowController();
// DAG Workflow Management
router.post('/', controller.createWorkflow);
router.get('/', controller.getWorkflows);
router.get('/:id', controller.getWorkflow);
router.put('/:id', controller.updateWorkflow);
router.delete('/:id', controller.deleteWorkflow);
// Execution
router.post('/:workflowId/execute', controller.executeWorkflow);
router.get('/runs/:runId', controller.getWorkflowRun);
router.get('/:workflowId/runs', controller.getWorkflowRuns);
// Nodes Management
router.post('/:workflowId/nodes', controller.createNode);
router.put('/nodes/:nodeId', controller.updateNode);
router.delete('/nodes/:nodeId', controller.deleteNode);
// Connections
router.post('/:workflowId/connections', controller.createConnection);
router.delete('/connections/:connectionId', controller.deleteConnection);
// Templates
router.post('/templates/example', controller.createExampleWorkflow);
export default router;
//# sourceMappingURL=dag-workflow.routes.js.map