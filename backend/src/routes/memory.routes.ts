// routes/memory.routes.ts
import { Router } from 'express';
import {
  storeMemory,
  retrieveMemories,
  updateMemoryImportance,
  summarizeMemories,
  getMemoryStats,
  deleteMemory,
  cleanupMemories,
  searchMemories,
  exportMemories
} from '../controllers/memory.controller.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';

const router = Router();

// All memory routes require authentication
router.use(authenticateJWT);

router.post('/', storeMemory);
router.post('/retrieve', retrieveMemories);
router.patch('/:memoryId/importance', updateMemoryImportance);
router.post('/summarize', summarizeMemories);
router.get('/stats', getMemoryStats);
router.delete('/:memoryId', deleteMemory);
router.post('/cleanup', cleanupMemories);
router.post('/search', searchMemories);
router.get('/export', exportMemories);

export { router as memoryRoutes };