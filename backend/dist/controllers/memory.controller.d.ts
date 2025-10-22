import type { Request, Response } from 'express';
/**
 * Store a new memory
 * POST /api/memory
 */
export declare const storeMemory: (req: Request, res: Response) => Promise<void>;
/**
 * Retrieve memories
 * POST /api/memory/retrieve
 */
export declare const retrieveMemories: (req: Request, res: Response) => Promise<void>;
/**
 * Update memory importance based on feedback
 * PATCH /api/memory/:memoryId/importance
 */
export declare const updateMemoryImportance: (req: Request, res: Response) => Promise<void>;
/**
 * Summarize memories
 * POST /api/memory/summarize
 */
export declare const summarizeMemories: (req: Request, res: Response) => Promise<void>;
/**
 * Get memory statistics
 * GET /api/memory/stats
 */
export declare const getMemoryStats: (req: Request, res: Response) => Promise<void>;
/**
 * Delete a memory
 * DELETE /api/memory/:memoryId
 */
export declare const deleteMemory: (req: Request, res: Response) => Promise<void>;
/**
 * Cleanup old memories (Admin/User endpoint)
 * POST /api/memory/cleanup
 */
export declare const cleanupMemories: (req: Request, res: Response) => Promise<void>;
/**
 * Search memories with advanced filters
 * POST /api/memory/search
 */
export declare const searchMemories: (req: Request, res: Response) => Promise<void>;
/**
 * Export memories
 * GET /api/memory/export
 */
export declare const exportMemories: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=memory.controller.d.ts.map