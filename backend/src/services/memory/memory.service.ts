// services/memory/memory.service.ts

import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAI } from 'openai';
import { prisma } from '../../server.js';
import { logger } from '../../utils/logger.js';
import type {
  MemoryEntry,
  MemoryMatch,
  MemoryServiceResponse,
  StoreMemoryRequest,
  RetrieveMemoryRequest,
  UpdateMemoryImportanceRequest,
  MemorySystemConfig,
  MemoryRetrieveConfig
} from '../../types/memory.types.js';

export class MemoryService {
  private qdrant: QdrantClient;
  private openai: OpenAI;
  private collectionName = 'r8r-memories';
  private embeddingDimension = 1536;

  constructor() {
    // @ts-ignore
    this.qdrant = new QdrantClient({
      url: process.env.QDRANT_URL!,
      apiKey: process.env.QDRANT_API_KEY
    });

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.initializeMemoryCollection();
  }

  private async initializeMemoryCollection(): Promise<void> {
    try {
      const collections = await this.qdrant.getCollections();
      const exists = collections.collections.some(c => c.name === this.collectionName);

      if (!exists) {
        await this.qdrant.createCollection(this.collectionName, {
          vectors: {
            size: this.embeddingDimension,
            distance: 'Cosine'
          }
        });
        logger.info('✅ Memory collection created', { collection: this.collectionName });
      }
    } catch (error) {
      logger.error('❌ Memory collection initialization failed', { error });
    }
  }

 // In memory.service.ts - update storeMemory method
async storeMemory(request: StoreMemoryRequest): Promise<MemoryServiceResponse> {
  try {
    // Validate request
    const validation = this.validateMemoryRequest(request);
    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`
      };
    }

    // Check if workflow exists before storing memory
    let workflowExists = false;
    if (request.workflowId) {
      try {
        const workflow = await prisma.workflow.findUnique({
          where: { id: request.workflowId },
          select: { id: true }
        });
        workflowExists = !!workflow;
        
        if (!workflowExists) {
          logger.warn('Workflow not found, storing memory without workflow reference', {
            workflowId: request.workflowId,
            userId: request.userId
          });
        }
      } catch (error) {
        logger.warn('Error checking workflow existence', { 
          workflowId: request.workflowId,
          error: (error as Error).message 
        });
        workflowExists = false;
      }
    }

    // Compress content
    const { compressedQuery, compressedResponse } = await this.compressMemoryContent(
      request.query,
      request.response
    );

    const combinedText = `${compressedQuery}\n${compressedResponse}`;
    const embedding = await this.generateEmbedding(combinedText);

    // Store memory - only include workflowId if it exists
    const memoryData: any = {
      userId: request.userId,
      query: compressedQuery,
      response: compressedResponse,
      embedding: embedding,
      importance: request.metadata?.importance || 0.5,
      type: request.metadata?.type || 'conversation',
      tags: request.metadata?.tags || [],
      metadata: {
        originalQueryLength: request.query.length,
        originalResponseLength: request.response.length,
        compressedQueryLength: compressedQuery.length,
        compressedResponseLength: compressedResponse.length,
        createdAt: new Date().toISOString(),
        workflowExists: workflowExists
      }
    };

    // Only add workflowId if the workflow exists
    if (workflowExists && request.workflowId) {
      memoryData.workflowId = request.workflowId;
    } else {
      // Store workflow ID in metadata for reference
      memoryData.metadata.originalWorkflowId = request.workflowId;
    }

    const memory = await prisma.memory.create({
      data: memoryData
    });

    // Rest of your vector DB upsert logic...
    await this.qdrant.upsert(this.collectionName, {
      wait: true,
      points: [{
        id: memory.id,
        vector: embedding,
        payload: {
          userId: request.userId,
          workflowId: workflowExists ? request.workflowId : null,
          query: compressedQuery,
          response: compressedResponse,
          importance: memory.importance,
          type: memory.type,
          tags: memory.tags,
          timestamp: memory.createdAt.toISOString(),
          originalLength: request.query.length + request.response.length,
          workflowExists: workflowExists
        }
      }]
    });

    logger.info('✅ Memory stored successfully', {
      memoryId: memory.id,
      withWorkflow: workflowExists
    });

    return {
      success: true,
      data: { stored: memory as MemoryEntry }
    };

  } catch (error) {
    logger.error('❌ Failed to store memory', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
  async retrieveMemories(
    request: RetrieveMemoryRequest,
    config?: MemoryRetrieveConfig
  ): Promise<MemoryServiceResponse> {
    const startTime = Date.now();

    try {
      logger.info('🔍 Retrieving memories', {
        userId: request.userId,
        workflowId: request.workflowId,
        topK: request.topK || 5
      });

      const embeddingStart = Date.now();
      const embedding = await this.generateEmbedding(request.query);
      const embeddingTime = Date.now() - embeddingStart;

      const filter: any = {
        must: [{ key: 'userId', match: { value: request.userId } }]
      };

      if (request.workflowId) {
        filter.must.push({ key: 'workflowId', match: { value: request.workflowId } });
      }

      if (request.filters?.types && request.filters.types.length > 0) {
        filter.must.push({ key: 'type', match: { any: request.filters.types } });
      }

      if (request.filters?.minImportance) {
        filter.must.push({ key: 'importance', range: { gte: request.filters.minImportance } });
      }

      if (request.filters?.maxAgeDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - request.filters.maxAgeDays);
        filter.must.push({ 
          key: 'timestamp', 
          range: { gte: cutoffDate.toISOString() } 
        });
      }

      const retrievalStart = Date.now();
      const searchResults = await this.qdrant.search(this.collectionName, {
        vector: embedding,
        limit: request.topK || 5,
        filter: filter,
        with_payload: true,
        score_threshold: request.minScore || 0.7
      });
      const retrievalTime = Date.now() - retrievalStart;

      const memories: MemoryMatch[] = searchResults.map(result => ({
        id: result.id as string,
        content: `Query: ${result.payload?.query}\nResponse: ${result.payload?.response}`,
        metadata: {
          query: result.payload?.query as string,
          response: result.payload?.response as string,
          timestamp: new Date(result.payload?.timestamp as string),
          importance: result.payload?.importance as number,
          type: result.payload?.type as any,
          tags: result.payload?.tags as string[],
          accessCount: 0,
          lastAccessed: new Date()
        },
        score: result.score || 0,
        distance: 1 - (result.score || 0)
      }));

      if (memories.length > 0) {
        await prisma.memory.updateMany({
          where: { id: { in: memories.map(m => m.id) } },
          data: {
            accessCount: { increment: 1 },
            lastAccessed: new Date()
          }
        });
      }

      const totalTime = Date.now() - startTime;

      logger.info('✅ Memories retrieved', {
        count: memories.length,
        avgScore: memories.reduce((sum, m) => sum + m.score, 0) / memories.length || 0,
        totalTime
      });

      return {
        success: true,
        data: { memories },
        stats: { embeddingTime, retrievalTime, totalTime }
      };
    } catch (error) {
      logger.error('❌ Failed to retrieve memories', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async hybridSearch(
    request: RetrieveMemoryRequest,
    keywordWeight: number = 0.3
  ): Promise<MemoryServiceResponse> {
    const startTime = Date.now();
    
    try {
      // First get vector-based results
      const vectorResults = await this.retrieveMemories(request);
      
      if (!vectorResults.success || !vectorResults.data?.memories) {
        return vectorResults;
      }

      // Apply keyword boosting
      const boostedMemories = await this.applyKeywordBoost(
        vectorResults.data.memories,
        request.query,
        keywordWeight
      );

      const totalTime = Date.now() - startTime;

      return {
        success: true,
        data: { memories: boostedMemories },
        stats: {
          ...vectorResults.stats,
          totalTime,
          searchType: 'hybrid'
        }
      };
    } catch (error) {
      logger.error('❌ Hybrid search failed', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateImportance(request: UpdateMemoryImportanceRequest): Promise<MemoryServiceResponse> {
    try {
      const memory = await prisma.memory.findFirst({
        where: { id: request.memoryId, userId: request.userId }
      });

      if (!memory) {
        return { success: false, error: 'Memory not found' };
      }

      const feedbackImpact = request.feedbackScore * 0.3;
      const newImportance = Math.max(0, Math.min(1, memory.importance + feedbackImpact));

      const updated = await prisma.memory.update({
        where: { id: request.memoryId },
        data: {
          importance: newImportance,
          metadata: {
            ...(memory.metadata as any),
            feedbackScore: request.feedbackScore,
            feedbackReason: request.reason,
            lastFeedbackAt: new Date().toISOString()
          }
        }
      });

      await this.qdrant.setPayload(this.collectionName, {
        points: [request.memoryId],
        payload: { importance: newImportance }
      });

      logger.info('✅ Memory importance updated', {
        memoryId: request.memoryId,
        oldImportance: memory.importance,
        newImportance,
        feedbackScore: request.feedbackScore
      });

      return {
        success: true,
        data: { stored: updated as MemoryEntry }
      };
    } catch (error) {
      logger.error('❌ Failed to update memory importance', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async summarizeMemories(
    memoryIds: string[],
    userId: string,
    preserveDetails: boolean = false
  ): Promise<MemoryServiceResponse> {
    try {
      const memories = await prisma.memory.findMany({
        where: { id: { in: memoryIds }, userId }
      });

      if (memories.length === 0) {
        return { success: false, error: 'No memories found' };
      }

      if (memories.length === 1) {
        return { 
          success: false, 
          error: 'At least 2 memories required for summarization' 
        };
      }

      const combinedContent = memories.map((m, i) =>
        `[${i + 1}] Query: ${m.query}\nResponse: ${m.response}`
      ).join('\n\n');

      const summaryPrompt = preserveDetails
        ? `Summarize these related conversations while preserving key details and specific information:\n\n${combinedContent}\n\nCreate a comprehensive summary that captures the main points:`
        : `Create a concise summary of these related conversations, focusing on the key insights and main points:\n\n${combinedContent}\n\nSummary:`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { 
            role: 'system', 
            content: 'You are a helpful assistant that creates accurate, well-structured summaries.' 
          },
          { role: 'user', content: summaryPrompt }
        ],
        temperature: 0.3,
        max_tokens: preserveDetails ? 800 : 500
      });
       // @ts-ignore

      const summary = response.choices[0].message.content?.trim() || 'No summary generated';

      const avgImportance = memories.reduce((sum, m) => sum + m.importance, 0) / memories.length;
      const allTags = new Set<string>();
      memories.forEach(m => m.tags.forEach(tag => allTags.add(tag)));
 // @ts-ignore
      const summaryMemory = await this.storeMemory({
        userId,
         // @ts-ignore
        workflowId: memories[0].workflowId || undefined,
        query: `Summary of ${memories.length} related conversations`,
        response: summary,
        metadata: {
          importance: Math.min(avgImportance + 0.1, 1.0), // Slight boost for summaries
          type: 'conversation',
          tags: Array.from(allTags),
          isSummary: true,
          summarizedMemories: memoryIds,
          originalCount: memories.length
        }
      });

      if (!summaryMemory.success) {
        throw new Error('Failed to store summary memory');
      }

      // Delete original memories
      await prisma.memory.deleteMany({
        where: { id: { in: memoryIds } }
      });

      await this.qdrant.delete(this.collectionName, {
        points: memoryIds
      });

      logger.info('✅ Memories summarized', {
        originalCount: memories.length,
        summaryId: summaryMemory.data?.stored?.id,
        tokensUsed: response.usage?.total_tokens || 0
      });

      return {
        success: true,
        data: {
          summarized: {
            original: memories as MemoryEntry[],
            summary: summaryMemory.data?.stored as MemoryEntry
          }
        }
      };
    } catch (error) {
      logger.error('❌ Failed to summarize memories', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async cleanup(userId: string, maxMemories: number): Promise<void> {
    try {
      const count = await prisma.memory.count({ where: { userId } });

      if (count <= maxMemories) {
        logger.info('No cleanup needed', { userId, currentCount: count, maxMemories });
        return;
      }

      const toDelete = count - maxMemories;

      const oldMemories = await prisma.memory.findMany({
        where: { userId },
        orderBy: [
          { importance: 'asc' },
          { accessCount: 'asc' },
          { createdAt: 'asc' }
        ],
        take: toDelete,
        select: { id: true }
      });

      const ids = oldMemories.map(m => m.id);

      if (ids.length > 0) {
        await prisma.memory.deleteMany({
          where: { id: { in: ids } }
        });

        await this.qdrant.delete(this.collectionName, {
          points: ids
        });

        logger.info('🧹 Memory cleanup completed', {
          userId,
          deleted: toDelete,
          remaining: maxMemories
        });
      }
    } catch (error) {
      logger.error('❌ Memory cleanup failed', { error });
    }
  }

  async deleteMemoryFromVectorDB(memoryId: string): Promise<void> {
    try {
      await this.qdrant.delete(this.collectionName, {
        points: [memoryId]
      });
      logger.info('✅ Memory deleted from vector DB', { memoryId });
    } catch (error) {
      logger.error('❌ Failed to delete memory from vector DB', { memoryId, error });
      // Don't throw - we still want to proceed even if vector DB deletion fails
    }
  }

  async getStats(userId: string, workflowId?: string): Promise<any> {
    const where: any = { userId };
    if (workflowId) where.workflowId = workflowId;

    const [total, byType, avgImportance, recentActivity] = await Promise.all([
      prisma.memory.count({ where }),
      prisma.memory.groupBy({
        by: ['type'],
        where,
        _count: true
      }),
      prisma.memory.aggregate({
        where,
        _avg: { importance: true }
      }),
      prisma.memory.aggregate({
        where,
        _max: { lastAccessed: true },
        _sum: { accessCount: true }
      })
    ]);

    // Get memory size statistics
    const memoryStats = await prisma.memory.findMany({
      where,
      select: {
        query: true,
        response: true
      }
    });

    const totalChars = memoryStats.reduce((sum, mem) => 
      sum + mem.query.length + mem.response.length, 0
    );

    return {
      total,
      byType: byType.reduce((acc, t) => {
        acc[t.type] = t._count;
        return acc;
      }, {} as Record<string, number>),
      avgImportance: avgImportance._avg.importance || 0,
      totalAccessCount: recentActivity._sum.accessCount || 0,
      lastAccessed: recentActivity._max.lastAccessed,
      totalCharacters: totalChars,
      avgMemorySize: total > 0 ? Math.round(totalChars / total) : 0
    };
  }

  async healthCheck(): Promise<{
    database: boolean;
    vectorDb: boolean;
    openai: boolean;
    details: any;
  }> {
    const checks = {
      database: false,
      vectorDb: false,
      openai: false,
      details: {} as any
    };

    try {
      // Check PostgreSQL
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (error) {
      checks.details.databaseError = error instanceof Error ? error.message : 'Unknown error';
    }

    try {
      // Check Qdrant
      await this.qdrant.getCollections();
      checks.vectorDb = true;
    } catch (error) {
      checks.details.vectorDbError = error instanceof Error ? error.message : 'Unknown error';
    }

    try {
      // Check OpenAI
      await this.openai.models.list();
      checks.openai = true;
    } catch (error) {
      checks.details.openaiError = error instanceof Error ? error.message : 'Unknown error';
    }

    return checks;
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    });
 // @ts-ignore
    return response.data[0].embedding;
  }

  private async compressMemoryContent(
    query: string,
    response: string,
    maxLength: number = 2000
  ): Promise<{compressedQuery: string; compressedResponse: string}> {
    const totalLength = query.length + response.length;
    
    if (totalLength <= maxLength) {
      return { compressedQuery: query, compressedResponse: response };
    }

    // Simple compression - you can enhance with LLM later
    const compressedQuery = query.length > 500 ? 
      query.slice(0, 450) + '... [compressed]' : query;
    
    const compressedResponse = response.length > 1500 ? 
      response.slice(0, 1450) + '... [compressed]' : response;

    logger.info('Memory content compressed', {
      originalLength: totalLength,
      compressedLength: compressedQuery.length + compressedResponse.length,
      compressionRatio: (compressedQuery.length + compressedResponse.length) / totalLength
    });

    return { compressedQuery, compressedResponse };
  }

  private validateMemoryRequest(request: StoreMemoryRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.userId?.trim()) errors.push('User ID is required');
    if (!request.query?.trim()) errors.push('Query cannot be empty');
    if (!request.response?.trim()) errors.push('Response cannot be empty');
    
    if (request.query.length > 10000) errors.push('Query too long (max 10000 chars)');
    if (request.response.length > 20000) errors.push('Response too long (max 20000 chars)');
    
    if (request.metadata?.importance && 
        (request.metadata.importance < 0 || request.metadata.importance > 1)) {
      errors.push('Importance must be between 0 and 1');
    }

    const validTypes = ['conversation', 'fact', 'preference', 'decision', 'insight', 'feedback'];
    if (request.metadata?.type && !validTypes.includes(request.metadata.type)) {
      errors.push(`Type must be one of: ${validTypes.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private async applyKeywordBoost(
    memories: MemoryMatch[],
    query: string,
    weight: number
  ): Promise<MemoryMatch[]> {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    
    return memories.map(memory => {
      let keywordScore = 0;
      const content = `${memory.metadata.query} ${memory.metadata.response}`.toLowerCase();
      
      for (const term of queryTerms) {
        const termCount = (content.match(new RegExp(term, 'g')) || []).length;
        keywordScore += termCount * 0.1; // Boost for each occurrence
      }
      
      // Normalize keyword score
      const maxPossibleScore = queryTerms.length * 0.3;
      const normalizedKeywordScore = maxPossibleScore > 0 ? 
        Math.min(keywordScore / maxPossibleScore, 1) : 0;
      
      // Combine scores
      const finalScore = (memory.score * (1 - weight)) + (normalizedKeywordScore * weight);
      
      return {
        ...memory,
        score: finalScore,
        metadata: {
          ...memory.metadata,
          keywordMatches: keywordScore,
          originalScore: memory.score
        }
      };
    }).sort((a, b) => b.score - a.score);
  }
}

let memoryServiceInstance: MemoryService | null = null;

export function getMemoryService(): MemoryService {
  if (!memoryServiceInstance) {
    memoryServiceInstance = new MemoryService();
  }
  return memoryServiceInstance;
}