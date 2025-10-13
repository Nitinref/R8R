// workflow-executor.service.ts - FIXED VERSION

import type { WorkflowConfig, WorkflowStep, StepType, QueryResponse, LLMProvider, RetrieverType } from '../../types/workflow.types.js';
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
      // Validate required API keys
      this.validateConfiguration(config);

      // Check cache first
      if (useCache && config.cacheEnabled) {
        const cacheKey = this.cache.generateKey(config.id, query);
        const cached = await this.cache.get<QueryResponse>(cacheKey);
        
        if (cached) {
          logger.info('Cache hit', { workflowId: config.id, query });
          return { 
            ...cached, 
            cached: true, 
            latency: Date.now() - startTime 
          };
        }
      }

      // Build execution context
      const context: ExecutionContext = {
        originalQuery: query,
        currentQuery: query,
        documents: [],
        answer: '',
        confidence: 0,
        metadata: {}
      };

      // Execute workflow steps in correct order
      await this.executeSteps(config.steps, context, llmsUsed, retrieversUsed);

      // Validate we got an answer
      if (!context.answer || context.answer.trim().length === 0) {
        throw new Error('No answer generated. Please ensure your workflow includes an answer generation step.');
      }

      const result: QueryResponse = {
        answer: context.answer,
        sources: context.documents.slice(0, 10).map(doc => ({
          content: doc.content || 'No content',
          metadata: doc.metadata || {},
          score: doc.score || 0.5
        })),
        confidence: context.confidence,
        latency: Date.now() - startTime,
        llmsUsed: [...new Set(llmsUsed)],
        retrieversUsed: [...new Set(retrieversUsed)],
        cached: false
      };

      // Cache result if enabled
      if (useCache && config.cacheEnabled && context.answer) {
        const cacheKey = this.cache.generateKey(config.id, query);
        await this.cache.set(cacheKey, result, config.cacheTTL || 3600);
      }

      return result;

    } catch (error) {
      logger.error('Workflow execution failed', { 
        workflowId: config.id, 
        error: (error as Error).message,
        stack: (error as Error).stack
      });
      
      throw error; // Let controller handle error response
    }
  }

  private validateConfiguration(config: WorkflowConfig): void {
    const errors: string[] = [];

    // Check for answer generation step
    const hasAnswerStep = config.steps.some(s => s.type === 'answer_generation');
    if (!hasAnswerStep) {
      errors.push('Workflow must include an answer generation step');
    }

    // Validate API keys for used providers
    const llmProviders = new Set<string>();
    config.steps.forEach(step => {
      if (step.config.llm) {
        llmProviders.add(step.config.llm.provider);
      }
    });

    if (llmProviders.has('openai') && !process.env.OPENAI_API_KEY) {
      errors.push('OPENAI_API_KEY environment variable is required');
    }
    if (llmProviders.has('anthropic') && !process.env.ANTHROPIC_API_KEY) {
      errors.push('ANTHROPIC_API_KEY environment variable is required');
    }
    if (llmProviders.has('google') && !process.env.GOOGLE_API_KEY) {
      errors.push('GOOGLE_API_KEY environment variable is required');
    }

    // Check for retriever configuration
    const hasRetrieval = config.steps.some(s => s.type === 'retrieval');
    if (hasRetrieval && !process.env.PINECONE_API_KEY) {
      errors.push('PINECONE_API_KEY required for retrieval steps');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration errors: ${errors.join(', ')}`);
    }
  }

  private async executeSteps(
    steps: WorkflowStep[],
    context: ExecutionContext,
    llmsUsed: string[],
    retrieversUsed: string[]
  ): Promise<void> {
    if (steps.length === 0) {
      throw new Error('No steps defined in workflow');
    }

    // Build dependency graph
    const stepMap = new Map(steps.map(step => [step.id, step]));
    const visited = new Set<string>();
    const executing = new Set<string>();

    // Find entry points (steps with no predecessors)
    const entrySteps = this.findEntrySteps(steps);
    
    // Execute from each entry point
    for (const entryStep of entrySteps) {
      await this.executeStepRecursive(
        entryStep,
        stepMap,
        visited,
        executing,
        context,
        llmsUsed,
        retrieversUsed
      );
    }
  }

  private findEntrySteps(steps: WorkflowStep[]): WorkflowStep[] {
    const hasIncoming = new Set<string>();
    
    // Mark all steps that have incoming connections
    steps.forEach(step => {
      step.nextSteps?.forEach(nextId => {
        hasIncoming.add(nextId);
      });
    });

    // Entry steps are those without incoming connections
    const entrySteps = steps.filter(step => !hasIncoming.has(step.id));
    
    // If no entry steps found (circular or single node), use first step
    // @ts-ignore
    return entrySteps.length > 0 ? entrySteps : [steps[0]];
  }

  private async executeStepRecursive(
    step: WorkflowStep,
    stepMap: Map<string, WorkflowStep>,
    visited: Set<string>,
    executing: Set<string>,
    context: ExecutionContext,
    llmsUsed: string[],
    retrieversUsed: string[]
  ): Promise<void> {
    // Cycle detection
    if (executing.has(step.id)) {
      throw new Error(`Circular dependency detected at step: ${step.id}`);
    }
    
    if (visited.has(step.id)) {
      return; // Already executed
    }

    executing.add(step.id);
    
    // Execute the step
    await this.executeSingleStep(step, context, llmsUsed, retrieversUsed);
    
    executing.delete(step.id);
    visited.add(step.id);

    // Execute next steps
    if (step.nextSteps) {
      for (const nextStepId of step.nextSteps) {
        const nextStep = stepMap.get(nextStepId);
        if (!nextStep) {
          logger.warn(`Next step not found: ${nextStepId}`);
          continue;
        }
        
        await this.executeStepRecursive(
          nextStep,
          stepMap,
          visited,
          executing,
          context,
          llmsUsed,
          retrieversUsed
        );
      }
    }
  }

  private async executeSingleStep(
    step: WorkflowStep,
    context: ExecutionContext,
    llmsUsed: string[],
    retrieversUsed: string[]
  ): Promise<void> {
    logger.info(`Executing step: ${step.type}`, { stepId: step.id });

    try {
      switch (step.type) {
        case 'query_rewrite':
          await this.executeQueryRewrite(step, context, llmsUsed);
          break;

        case 'retrieval':
          await this.executeRetrieval(step, context, retrieversUsed);
          break;

        case 'rerank':
          await this.executeRerank(step, context, llmsUsed);
          break;

        case 'answer_generation':
          await this.executeAnswerGeneration(step, context, llmsUsed);
          break;

        case 'post_process':
          await this.executePostProcess(step, context);
          break;

        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }
    } catch (error) {
      logger.error(`Step execution failed: ${step.type}`, { 
        stepId: step.id, 
        error: (error as Error).message 
      });
      throw error; // Propagate error to fail the workflow
    }
  }

  private async executeRetrieval(
    step: WorkflowStep,
    context: ExecutionContext,
    retrieversUsed: string[]
  ): Promise<void> {
    if (!step.config?.retriever) {
      throw new Error('No retriever config for retrieval step');
    }

    const retrieverConfig = step.config.retriever;
    const topK = retrieverConfig.config?.topK || 10;
    
    try {
      // FIXED: Actually use the VectorDB service
      if (retrieverConfig.type === 'pinecone') {
        const indexName = retrieverConfig.config?.indexName;
        if (!indexName) {
          throw new Error('Pinecone index name required');
        }

        // Get embedding for query
        const embedding = await this.vectorDB.getEmbedding(context.currentQuery);
        
        // Search vector database
        const results = await this.vectorDB.searchPinecone(
          indexName,
          embedding,
          topK,
          retrieverConfig.config?.filter
        );

        context.documents.push(...results);
        retrieversUsed.push(retrieverConfig.type);
        
        logger.info('Documents retrieved from Pinecone', { 
          count: results.length,
          indexName 
        });
      } else {
        throw new Error(`Unsupported retriever type: ${retrieverConfig.type}`);
      }

    } catch (error) {
      logger.error('Retrieval failed', { error: (error as Error).message });
      throw error;
    }
  }

  private async executeQueryRewrite(
    step: WorkflowStep,
    context: ExecutionContext,
    llmsUsed: string[]
  ): Promise<void> {
    if (!step.config?.llm) {
      throw new Error('No LLM config for query rewrite step');
    }

    const prompt = step.config.prompt || 
      `Improve this search query for better document retrieval. Return only the improved query.\n\nQuery: ${context.currentQuery}`;
// @ts-ignore
    const response = await this.llmOrchestrator.generateCompletion({
      provider: step.config.llm.provider as LLMProvider,
      model: step.config.llm.model,
      prompt,
      temperature: step.config.llm.temperature || 0.3,
      maxTokens: step.config.llm.maxTokens || 200,
      fallback: step.config.llm.fallback
    });

    context.currentQuery = response.content.trim();
    llmsUsed.push(`${response.provider}:${response.model}`);
    
    logger.info('Query rewritten', { 
      original: context.originalQuery, 
      rewritten: context.currentQuery 
    });
  }

  private async executeRerank(
    step: WorkflowStep,
    context: ExecutionContext,
    llmsUsed: string[]
  ): Promise<void> {
    if (!step.config?.llm || context.documents.length === 0) {
      return;
    }

    // FIXED: Implement actual reranking
    const prompt = `Rank these documents by relevance to the query: "${context.currentQuery}"\n\n${
      context.documents.map((doc, i) => `${i + 1}. ${doc.content.substring(0, 200)}`).join('\n\n')
    }\n\nReturn only the numbers in order of relevance (e.g., "3,1,2"):`;

    try {
      // @ts-ignore
      const response = await this.llmOrchestrator.generateCompletion({
        provider: step.config.llm.provider as LLMProvider,
        model: step.config.llm.model,
        prompt,
        temperature: 0.1,
        maxTokens: 100,
        fallback: step.config.llm.fallback
      });

      // Parse ranking
      const ranking = response.content
        .trim()
        .split(',')
        .map(n => parseInt(n.trim()) - 1)
        .filter(i => i >= 0 && i < context.documents.length);

      if (ranking.length > 0) {
        const reranked = ranking.map(i => context.documents[i]);
        context.documents = reranked;
        llmsUsed.push(`${response.provider}:${response.model}`);
        
        logger.info('Documents reranked', { count: reranked.length });
      }
    } catch (error) {
      logger.warn('Reranking failed, keeping original order', { 
        error: (error as Error).message 
      });
    }
  }

private async executeAnswerGeneration(
  step: WorkflowStep,
  context: ExecutionContext,
  llmsUsed: string[]
): Promise<void> {
  if (!step.config?.llm) {
    throw new Error('No LLM config for answer generation step');
  }

  const hasContext = context.documents.length > 0;
  const contextText = context.documents
    .slice(0, 5)
    .map((doc, i) => `[${i + 1}] ${doc.content}`)
    .join('\n\n');

  // FIXED: Handle both cases - with and without context
  const prompt = step.config.prompt || (hasContext
    ? `Answer this question using the context provided. If you cannot find the answer, say so.\n\nQuestion: ${context.currentQuery}\n\nContext:\n${contextText}\n\nAnswer:`
    : `Answer this question based on your general knowledge:\n\nQuestion: ${context.currentQuery}\n\nAnswer:`);

  // @ts-ignore
  const response = await this.llmOrchestrator.generateCompletion({
    provider: step.config.llm.provider as LLMProvider,
    model: step.config.llm.model,
    prompt,
    temperature: step.config.llm.temperature || 0.7,
    maxTokens: step.config.llm.maxTokens || 1000,
    systemPrompt: "You are a helpful assistant that provides accurate answers based on the given context.",
    fallback: step.config.llm.fallback
  });

  context.answer = response.content.trim();
  llmsUsed.push(`${response.provider}:${response.model}`);
  context.confidence = this.calculateConfidence(context.documents, context.answer);
  
  logger.info('Answer generated', { 
    answerLength: context.answer.length,
    confidence: context.confidence 
  });
}
  private async executePostProcess(
    step: WorkflowStep,
    context: ExecutionContext
  ): Promise<void> {
    if (context.answer) {
      context.answer = context.answer.trim();
      
      // Add source attribution if configured
      if (step.config?.addSourceAttribution && context.documents.length > 0) {
        context.answer += `\n\nSources: ${context.documents.length} document${context.documents.length > 1 ? 's' : ''}`;
      }
    }
  }

  private calculateConfidence(documents: any[], answer: string): number {
    if (documents.length === 0) return 0.3;
    
    const avgScore = documents.reduce((sum, doc) => sum + (doc.score || 0), 0) / documents.length;
    const hasSubstantialAnswer = answer.length > 50;
    const hasMultipleSources = documents.length > 1;
    
    let confidence = avgScore * 0.5; // Base on retrieval scores
    confidence += hasSubstantialAnswer ? 0.3 : 0.1;
    confidence += hasMultipleSources ? 0.2 : 0.1;
    
    return Math.min(0.95, Math.max(0.1, confidence));
  }
}

interface ExecutionContext {
  originalQuery: string;
  currentQuery: string;
  documents: any[];
  answer: string;
  confidence: number;
  metadata: Record<string, any>;
}