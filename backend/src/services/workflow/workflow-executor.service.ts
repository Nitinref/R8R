import type{ WorkflowConfig, WorkflowStep, StepType, QueryResponse } from '../../types/workflow.types.js';
import { LLMOrchestrator } from '../llm/llm-orchestrator.service.js';
import { VectorDBService } from '../retrieval/vector-db.service.js';
import { CacheService } from '../cache.service.js';
import { logger } from '../../utils/logger.js';

export class WorkflowExecutor {
  private llmOrchestrator: LLMOrchestrator;
  private vectorDB: VectorDBService;
  private cache: CacheService;

  constructor() {
    this.llmOrchestrator = new LLMOrchestrator();
    this.vectorDB = new VectorDBService();
    this.cache = new CacheService();
  }

  async executeWorkflow(
    config: WorkflowConfig,
    query: string,
    useCache: boolean = true
  ): Promise<QueryResponse> {
    const startTime = Date.now();
    const llmsUsed: string[] = [];
    const retrieversUsed: string[] = [];

    try {
      // Check cache
      if (useCache && config.cacheEnabled) {
        const cacheKey = this.cache.generateKey(config.id, query);
        const cached = await this.cache.get<QueryResponse>(cacheKey);
        
        if (cached) {
          logger.info('Cache hit', { workflowId: config.id, query });
          return { ...cached, cached: true, latency: Date.now() - startTime };
        }
      }

      // Execute workflow steps in order
      let currentQuery = query;
      let retrievedDocs: any[] = [];
      let finalAnswer = '';
      let confidence = 0;

      for (const step of config.steps) {
        logger.info(`Executing step: ${step.type}`, { stepId: step.id });

        switch (step.type) {
            // @ts-ignore
          case StepType.QUERY_REWRITE:
            if (step.config.llm) {
              const prompt = step.config.prompt || 
                `Rewrite the following query to be more specific and effective for document retrieval:\n\nQuery: ${currentQuery}\n\nRewritten query:`;
              
                // @ts-ignore
              const response = await this.llmOrchestrator.generateCompletion({
                provider: step.config.llm.provider,
                model: step.config.llm.model,
                prompt,
                temperature: step.config.llm.temperature,
                maxTokens: step.config.llm.maxTokens,
                fallback: step.config.llm.fallback
              });

              currentQuery = response.content.trim();
              llmsUsed.push(`${response.provider}:${response.model}`);
            }
            break;

            // @ts-ignore
          case StepType.RETRIEVAL:
            if (step.config.retriever) {
              const embedding = await this.vectorDB.getEmbedding(currentQuery);
              const results = await this.vectorDB.searchPinecone(
                step.config.retriever.config.indexName || 'default',
                embedding,
                step.config.retriever.config.topK || 5
              );
              
              retrievedDocs.push(...results);
              retrieversUsed.push(step.config.retriever.type);
            }
            break;

            // @ts-ignore
          case StepType.RERANK:
            if (step.config.llm && retrievedDocs.length > 0) {
              const docsText = retrievedDocs
                .map((doc, i) => `[${i + 1}] ${doc.content}`)
                .join('\n\n');
              
              const prompt = step.config.prompt || 
                `Given the query: "${currentQuery}"\n\nRank these documents by relevance (return document numbers in order, most relevant first):\n\n${docsText}\n\nRanked order:`;
              
                // @ts-ignore
              const response = await this.llmOrchestrator.generateCompletion({
                provider: step.config.llm.provider,
                model: step.config.llm.model,
                prompt,
                temperature: 0.1,
                maxTokens: 200,
                fallback: step.config.llm.fallback
              });

              llmsUsed.push(`${response.provider}:${response.model}`);
              
              // Simple reranking based on LLM output
              const rankMatch = response.content.match(/\d+/g);
              if (rankMatch) {
                const ranks = rankMatch.map(n => parseInt(n) - 1);
                retrievedDocs = ranks
                  .filter(i => i >= 0 && i < retrievedDocs.length)
                  .map(i => retrievedDocs[i]);
              }
            }
            break;

            // @ts-ignore
          case StepType.ANSWER_GENERATION:
            if (step.config.llm) {
              const context = retrievedDocs
                .slice(0, 5)
                .map(doc => doc.content)
                .join('\n\n');
              
              const prompt = step.config.prompt || 
                `Answer the following query using only the provided context. If the answer is not in the context, say so.\n\nQuery: ${currentQuery}\n\nContext:\n${context}\n\nAnswer:`;
              
                // @ts-ignore
              const response = await this.llmOrchestrator.generateCompletion({
                provider: step.config.llm.provider,
                model: step.config.llm.model,
                prompt,
                temperature: step.config.llm.temperature || 0.7,
                maxTokens: step.config.llm.maxTokens || 1000,
                fallback: step.config.llm.fallback
              });

              finalAnswer = response.content;
              llmsUsed.push(`${response.provider}:${response.model}`);
              
              // Simple confidence estimation
              confidence = retrievedDocs.length > 0 
                ? Math.min(0.95, retrievedDocs[0].score * 1.2)
                : 0.5;
            }
            break;

            // @ts-ignore
          case StepType.POST_PROCESS:
            // Additional processing if needed
            break;
        }
      }

      const result: QueryResponse = {
        answer: finalAnswer,
        sources: retrievedDocs.slice(0, 5).map(doc => ({
          content: doc.content,
          metadata: doc.metadata,
          score: doc.score
        })),
        confidence,
        latency: Date.now() - startTime,
        llmsUsed: [...new Set(llmsUsed)],
        retrieversUsed: [...new Set(retrieversUsed)],
        cached: false
      };

      // Cache result
      if (useCache && config.cacheEnabled) {
        const cacheKey = this.cache.generateKey(config.id, query);
        await this.cache.set(cacheKey, result, config.cacheTTL || 3600);
      }

      return result;

    } catch (error) {
      logger.error('Workflow execution failed', { 
        workflowId: config.id, 
        // @ts-ignore
        error: error.message 
      });
      throw error;
    }
  }
}