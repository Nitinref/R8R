import { Router } from 'express';
import { 
  executeQuery, 
  testWorkflow,
  getQueryHistory,
  getQueryDetail,
  executeBatchQueries
} from '../controllers/query.controller.js';
import { authenticateApiKey, authenticateJWT } from '../middleware/auth.middleware.js';
import { queryLimiter, apiLimiter } from '../middleware/rate-limiter.middleware.js';

const router = Router();

// Execute query against active workflow
// Can use either JWT or API key
router.post(
  '/', 
  queryLimiter, 
  authenticateApiKey, 
  executeQuery
);

// Test workflow configuration without saving
router.post(
  '/test',
  apiLimiter,
  authenticateJWT,
  testWorkflow
);

// Batch query execution
router.post(
  '/batch',
  queryLimiter,
  authenticateApiKey,
  executeBatchQueries
);

// Get query history
router.get(
  '/history', 
  authenticateJWT, 
  getQueryHistory
);

// Get detailed query log
router.get(
  '/history/:queryId',
  authenticateJWT,
  getQueryDetail
);

export default router;