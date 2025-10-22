// controllers/memory.controller.ts

import type { Request, Response } from 'express';
import { getMemoryService } from '../services/memory/memory.service.js';
import { AppError } from '../middleware/error-handler.middleware.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../server.js'; // ADD THIS IMPORT
import type {
  StoreMemoryRequest,
  RetrieveMemoryRequest,
  UpdateMemoryImportanceRequest
} from '../types/memory.types.js';

const memoryService = getMemoryService();

/**
 * Store a new memory
 * POST /api/memory
 */
export const storeMemory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    const { workflowId, query, response, metadata } = req.body as StoreMemoryRequest;

    if (!query || !response) {
      throw new AppError('Query and response are required', 400);
    }

    logger.info('Storing memory via API', {
      userId,
      workflowId,
      queryLength: query.length
    });
 // @ts-ignore
    const result = await memoryService.storeMemory({
      userId,
      workflowId,
      query,
      response,
      metadata
    });

    if (!result.success) {
      throw new AppError(result.error || 'Failed to store memory', 500);
    }

    res.status(201).json({
      success: true,
      message: 'Memory stored successfully',
      data: result.data,
      stats: result.stats
    });
  } catch (error) {
    logger.error('Store memory failed', { error });
    throw error;
  }
};

/**
 * Retrieve memories
 * POST /api/memory/retrieve
 */
export const retrieveMemories = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    const {
      workflowId,
      query,
      topK = 5,
      minScore = 0.7,
      filters
    } = req.body as RetrieveMemoryRequest;

    if (!query) {
      throw new AppError('Query is required', 400);
    }

    logger.info('Retrieving memories via API', {
      userId,
      workflowId,
      topK,
      minScore
    });
 // @ts-ignore
    const result = await memoryService.retrieveMemories({
      userId,
      workflowId,
      query,
      topK,
      minScore,
      filters
    });

    if (!result.success) {
      throw new AppError(result.error || 'Failed to retrieve memories', 500);
    }

    res.json({
      success: true,
      data: result.data,
      stats: result.stats
    });
  } catch (error) {
    logger.error('Retrieve memories failed', { error });
    throw error;
  }
};

/**
 * Update memory importance based on feedback
 * PATCH /api/memory/:memoryId/importance
 */
export const updateMemoryImportance = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    const { memoryId } = req.params;
    const { feedbackScore, reason } = req.body as Omit<UpdateMemoryImportanceRequest, 'memoryId' | 'userId'>;

    if (!memoryId) {
      throw new AppError('Memory ID is required', 400);
    }

    if (feedbackScore === undefined || feedbackScore < -1 || feedbackScore > 1) {
      throw new AppError('Feedback score must be between -1 and 1', 400);
    }

    logger.info('Updating memory importance via API', {
      userId,
      memoryId,
      feedbackScore
    });
 // @ts-ignore
    const result = await memoryService.updateImportance({
      memoryId,
      userId,
      feedbackScore,
      reason
    });

    if (!result.success) {
      throw new AppError(result.error || 'Failed to update memory importance', 500);
    }

    res.json({
      success: true,
      message: 'Memory importance updated successfully',
      data: result.data
    });
  } catch (error) {
    logger.error('Update memory importance failed', { error });
    throw error;
  }
};

/**
 * Summarize memories
 * POST /api/memory/summarize
 */
export const summarizeMemories = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    const { memoryIds, preserveDetails = false } = req.body;

    if (!memoryIds || !Array.isArray(memoryIds) || memoryIds.length === 0) {
      throw new AppError('Memory IDs array is required', 400);
    }

    if (memoryIds.length < 2) {
      throw new AppError('At least 2 memories required for summarization', 400);
    }

    logger.info('Summarizing memories via API', {
      userId,
      count: memoryIds.length,
      preserveDetails
    });

    const result = await memoryService.summarizeMemories(
      memoryIds,
      userId,
      preserveDetails
    );

    if (!result.success) {
      throw new AppError(result.error || 'Failed to summarize memories', 500);
    }

    res.json({
      success: true,
      message: 'Memories summarized successfully',
      data: result.data
    });
  } catch (error) {
    logger.error('Summarize memories failed', { error });
    throw error;
  }
};

/**
 * Get memory statistics
 * GET /api/memory/stats
 */
export const getMemoryStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    const { workflowId } = req.query;

    logger.info('Getting memory stats via API', {
      userId,
      workflowId
    });

    const stats = await memoryService.getStats(userId, workflowId as string);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Get memory stats failed', { error });
    throw error;
  }
};

/**
 * Delete a memory
 * DELETE /api/memory/:memoryId
 */
export const deleteMemory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    const { memoryId } = req.params;

    if (!memoryId) {
      throw new AppError('Memory ID is required', 400);
    }

    logger.info('Deleting memory via API', {
      userId,
      memoryId
    });

    // First check if memory exists and belongs to user
    const memory = await prisma.memory.findFirst({
      where: {
        id: memoryId,
        userId
      }
    });

    if (!memory) {
      throw new AppError('Memory not found or access denied', 404);
    }

    // Delete from database
    const deleted = await prisma.memory.delete({
      where: {
        id: memoryId
      }
    });

    // Delete from vector database (Qdrant)
    await memoryService.deleteMemoryFromVectorDB(memoryId);

    logger.info('Memory deleted successfully', {
      userId,
      memoryId
    });

    res.json({
      success: true,
      message: 'Memory deleted successfully',
      data: { deleted: { id: memoryId } }
    });
  } catch (error) {
    logger.error('Delete memory failed', { error });
    throw error;
  }
};

/**
 * Cleanup old memories (Admin/User endpoint)
 * POST /api/memory/cleanup
 */
export const cleanupMemories = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    const { maxMemories = 1000 } = req.body;

    if (maxMemories < 10) {
      throw new AppError('maxMemories must be at least 10', 400);
    }

    logger.info('Cleaning up memories via API', {
      userId,
      maxMemories
    });

    await memoryService.cleanup(userId, maxMemories);

    res.json({
      success: true,
      message: 'Memory cleanup completed successfully'
    });
  } catch (error) {
    logger.error('Memory cleanup failed', { error });
    throw error;
  }
};

/**
 * Search memories with advanced filters
 * POST /api/memory/search
 */
export const searchMemories = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    const {
      query,
      workflowId,
      types,
      tags,
      minImportance,
      maxImportance,
      dateFrom,
      dateTo,
      limit = 20,
      offset = 0,
      sortBy = 'relevance'
    } = req.body;

    // Build filters for advanced search
    const filters: any = {};
    
    if (types && types.length > 0) filters.types = types;
    if (tags && tags.length > 0) filters.tags = tags;
    if (minImportance !== undefined) filters.minImportance = minImportance;
    if (maxImportance !== undefined) filters.maxImportance = maxImportance;

    let result;
    
    if (query) {
      // Semantic search with filters
      result = await memoryService.retrieveMemories({
        userId,
        workflowId,
        query,
        topK: limit,
        minScore: 0.5,
        filters
      });
    } else {
      // Database-only search (no semantic search)
      const where: any = { userId };
      
      if (workflowId) where.workflowId = workflowId;
      if (types && types.length > 0) where.type = { in: types };
      if (tags && tags.length > 0) where.tags = { hasSome: tags };
      if (minImportance !== undefined) where.importance = { gte: minImportance };
      if (maxImportance !== undefined) {
        where.importance = { ...where.importance, lte: maxImportance };
      }
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom);
        if (dateTo) where.createdAt.lte = new Date(dateTo);
      }

      const memories = await prisma.memory.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: sortBy === 'recent' ? { createdAt: 'desc' } : 
                 sortBy === 'important' ? { importance: 'desc' } :
                 { lastAccessed: 'desc' }
      });

      result = {
        success: true,
        data: { 
          memories: memories.map(mem => ({
            id: mem.id,
            content: `Query: ${mem.query}\nResponse: ${mem.response}`,
            metadata: {
              timestamp: mem.createdAt,
              importance: mem.importance,
              type: mem.type,
              tags: mem.tags,
              accessCount: mem.accessCount,
              lastAccessed: mem.lastAccessed
            },
            score: 1.0, // Default score for DB-only search
            distance: 0
          }))
        },
        stats: { totalRetrieved: memories.length }
      };
    }

    if (!result.success) {
      throw new AppError(result.error || 'Failed to search memories', 500);
    }

    res.json({
      success: true,
      data: result.data,
      stats: result.stats
    });
  } catch (error) {
    logger.error('Search memories failed', { error });
    throw error;
  }
};

/**
 * Export memories
 * GET /api/memory/export
 */
export const exportMemories = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    const { format = 'json', workflowId } = req.query;

    if (format !== 'json' && format !== 'csv') {
      throw new AppError('Format must be json or csv', 400);
    }

    logger.info('Exporting memories via API', {
      userId,
      format,
      workflowId
    });

    // Get all memories for export
    const where: any = { userId };
    if (workflowId) where.workflowId = workflowId as string;

    const memories = await prisma.memory.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    if (format === 'csv') {
      const headers = ['ID', 'Query', 'Response', 'Type', 'Importance', 'Tags', 'Created At', 'Last Accessed'];
      const rows = memories.map(memory => [
        memory.id,
        `"${memory.query.replace(/"/g, '""')}"`,
        `"${memory.response.replace(/"/g, '""')}"`,
        memory.type,
        memory.importance,
        `"${memory.tags.join(', ')}"`,
        memory.createdAt.toISOString(),
        memory.lastAccessed?.toISOString() || ''
      ]);

      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=memories-${userId}-${Date.now()}.csv`);
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: {
          format: 'json',
          count: memories.length,
          memories
        }
      });
    }
  } catch (error) {
    logger.error('Export memories failed', { error });
    throw error;
  }
};