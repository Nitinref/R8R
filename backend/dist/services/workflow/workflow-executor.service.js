// workflow-executor.service.ts - COMPLETE WORKING VERSION
import { LLMOrchestrator } from '../llm/llm-orchestrator.service.js';
import { VectorDBService } from '../retrieval/vector-db.service.js';
import { CacheService } from '../cache.service.js';
import { getMemoryService } from '../memory/memory.service.js';
import { logger } from '../../utils/logger.js';
export class WorkflowExecutor {
    llmOrchestrator;
    vectorDB;
    cache;
    memoryService;
    constructor() {
        this.llmOrchestrator = new LLMOrchestrator();
        this.vectorDB = new VectorDBService();
        this.cache = new CacheService();
        this.memoryService = getMemoryService();
    }
    async executeWorkflow(config, query, userId, useCache = true) {
        const startTime = Date.now();
        const llmsUsed = [];
        const retrieversUsed = [];
        try {
            this.validateConfiguration(config);
            // Check cache
            if (useCache && config.cacheEnabled) {
                const cacheKey = this.cache.generateKey(config.id, query);
                const cached = await this.cache.get(cacheKey);
                if (cached) {
                    logger.info('Cache hit', { workflowId: config.id, query });
                    return {
                        ...cached,
                        cached: true,
                        latency: Date.now() - startTime
                    };
                }
            }
            // Initialize execution context
            const context = {
                originalQuery: query,
                currentQuery: query,
                rewrittenQueries: new Map(),
                documents: [],
                answer: '',
                confidence: 0,
                metadata: {
                    userId: userId,
                    workflowId: config.id,
                    startTime: startTime,
                    memories: [],
                    stepOutputs: new Map()
                },
                stepResults: new Map(),
                stepOutputs: new Map()
            };
            // Execute workflow graph
            await this.executeWorkflowGraph(config, context, llmsUsed, retrieversUsed);
            // Generate final result based on what steps were executed
            const result = this.generateFinalResult(context, startTime, llmsUsed, retrieversUsed);
            // Cache result
            if (useCache && config.cacheEnabled && (context.answer || context.documents.length > 0 || context.rewrittenQueries.size > 0)) {
                const cacheKey = this.cache.generateKey(config.id, query);
                await this.cache.set(cacheKey, result, config.cacheTTL || 3600);
            }
            return result;
        }
        catch (error) {
            logger.error('Workflow execution failed', {
                workflowId: config.id,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
    /**
     * Generate final result based on executed steps
     */
    generateFinalResult(context, startTime, llmsUsed, retrieversUsed) {
        const baseResult = {
            latency: Date.now() - startTime,
            llmsUsed: [...new Set(llmsUsed)],
            retrieversUsed: [...new Set(retrieversUsed)],
            cached: false,
            rewrittenQuery: Object.fromEntries(context.rewrittenQueries),
            query: context.originalQuery,
            documents: context.documents,
            metadata: {
                ...context.metadata,
                finalQuery: context.currentQuery,
                stepOutputs: Object.fromEntries(context.metadata.stepOutputs),
                memoriesUsed: context.metadata.memories?.length || 0
            }
        };
        // If answer was generated, use it as primary result
        if (context.answer && context.answer.trim().length > 0) {
            return {
                ...baseResult,
                answer: context.answer,
                sources: context.documents.slice(0, 10).map(doc => ({
                    content: doc.content || 'No content',
                    metadata: doc.metadata || {},
                    score: doc.score || 0.5
                })),
                confidence: context.confidence,
                workflowType: 'answer_generation'
            };
        }
        // If no answer but we have documents, return them
        if (context.documents.length > 0) {
            return {
                ...baseResult,
                answer: `Retrieved ${context.documents.length} relevant documents. No answer generation step was configured.`,
                sources: context.documents.slice(0, 10).map(doc => ({
                    content: doc.content || 'No content',
                    metadata: doc.metadata || {},
                    score: doc.score || 0.5
                })),
                confidence: this.calculateRetrievalConfidence(context.documents),
                workflowType: 'retrieval_only'
            };
        }
        // If only query rewriting was done, return the enhanced queries
        if (context.rewrittenQueries.size > 0) {
            const rewrittenEntries = Array.from(context.rewrittenQueries.entries());
            const finalQuery = context.currentQuery !== context.originalQuery
                ? context.currentQuery
                : rewrittenEntries[rewrittenEntries.length - 1]?.[1] || context.originalQuery;
            return {
                ...baseResult,
                answer: `Query enhanced through ${context.rewrittenQueries.size} rewrite step(s). Final optimized query: "${finalQuery}"`,
                sources: [],
                confidence: 0.8,
                workflowType: 'query_enhancement',
                metadata: {
                    ...baseResult.metadata,
                    enhancedQuery: finalQuery,
                    totalRewrites: context.rewrittenQueries.size
                }
            };
        }
        // If only memory operations were performed
        if (context.metadata.memories && context.metadata.memories.length > 0) {
            return {
                ...baseResult,
                answer: `Memory operations completed. Retrieved ${context.metadata.memories.length} relevant memories from previous conversations.`,
                sources: [],
                confidence: 0.6,
                workflowType: 'memory_operations',
                metadata: {
                    ...baseResult.metadata,
                    memoryOperations: true,
                    memoryCount: context.metadata.memories.length
                }
            };
        }
        // Fallback for workflows with minimal output
        return {
            ...baseResult,
            answer: 'Workflow executed successfully. Configure additional steps for answer generation, retrieval, or query enhancement.',
            sources: [],
            confidence: 0.3,
            workflowType: 'minimal_execution'
        };
    }
    /**
     * Updated validation - no longer requires answer generation step
     */
    validateConfiguration(config) {
        const errors = [];
        // Validate that workflow has at least one step
        if (!config.steps || config.steps.length === 0) {
            errors.push('Workflow must include at least one step');
        }
        // Validate LLM configurations
        const llmProviders = new Set();
        config.steps.forEach(step => {
            if (step.config?.llm) {
                llmProviders.add(step.config.llm.provider);
                // Validate step-specific configurations
                if (step.type === 'query_rewrite' && !step.config.llm.model) {
                    errors.push(`Query rewrite step ${step.id} must have LLM model configured`);
                }
                if (step.type === 'answer_generation' && !step.config.llm.model) {
                    errors.push(`Answer generation step ${step.id} must have LLM model configured`);
                }
            }
            // Validate retriever configurations
            if (step.type === 'retrieval' && !step.config?.retriever) {
                errors.push(`Retrieval step ${step.id} must have retriever configuration`);
            }
        });
        // Validate API keys for used providers
        if (llmProviders.has('openai') && !process.env.OPENAI_API_KEY) {
            errors.push('OPENAI_API_KEY environment variable is required');
        }
        if (llmProviders.has('anthropic') && !process.env.ANTHROPIC_API_KEY) {
            errors.push('ANTHROPIC_API_KEY environment variable is required');
        }
        if (llmProviders.has('google') && !process.env.GOOGLE_API_KEY) {
            errors.push('GOOGLE_API_KEY environment variable is required');
        }
        if (errors.length > 0) {
            throw new Error(`Configuration errors: ${errors.join(', ')}`);
        }
    }
    /**
     * Calculate confidence for retrieval-only workflows
     */
    calculateRetrievalConfidence(documents) {
        if (documents.length === 0)
            return 0.3;
        const avgScore = documents.reduce((sum, doc) => sum + (doc.score || 0), 0) / documents.length;
        const hasHighQualityDocs = documents.some(doc => doc.score > 0.8);
        const hasMultipleSources = documents.length > 2;
        let confidence = avgScore * 0.6;
        confidence += hasHighQualityDocs ? 0.2 : 0;
        confidence += hasMultipleSources ? 0.2 : 0.1;
        return Math.min(0.95, Math.max(0.1, confidence));
    }
    /**
     * Execute workflow as a graph - supports parallel and sequential execution
     */
    async executeWorkflowGraph(config, context, llmsUsed, retrieversUsed) {
        const steps = config.steps;
        if (steps.length === 0) {
            throw new Error('No steps defined in workflow');
        }
        // Build step map for quick lookup
        const stepMap = new Map(steps.map(step => [step.id, step]));
        // Track execution state
        const completed = new Set();
        // Find entry points (nodes with no incoming edges)
        const entrySteps = this.findEntrySteps(steps);
        logger.info('Starting workflow execution', {
            totalSteps: steps.length,
            entrySteps: entrySteps.map(s => s.id),
            hasAnswerGeneration: steps.some(s => s.type === 'answer_generation')
        });
        // Execute from entry points
        await this.executeFromEntryPoints(entrySteps, stepMap, completed, context, llmsUsed, retrieversUsed);
        logger.info('Workflow execution completed', {
            completedSteps: completed.size,
            totalSteps: steps.length,
            hasAnswer: !!context.answer,
            documentCount: context.documents.length,
            rewriteCount: context.rewrittenQueries.size
        });
    }
    /**
     * Find entry steps (steps with no incoming connections)
     */
    findEntrySteps(steps) {
        const hasIncoming = new Set();
        steps.forEach(step => {
            step.nextSteps?.forEach(nextId => {
                hasIncoming.add(nextId);
            });
        });
        const entrySteps = steps.filter(step => !hasIncoming.has(step.id));
        return entrySteps.length > 0
            ? entrySteps.filter((s) => s !== undefined)
            : steps[0] !== undefined
                ? [steps[0]]
                : [];
    }
    /**
     * Execute workflow starting from entry points
     */
    async executeFromEntryPoints(entrySteps, stepMap, completed, context, llmsUsed, retrieversUsed) {
        // Execute all entry steps in parallel
        await Promise.all(entrySteps.map(step => this.executeStepWithDependencies(step, stepMap, completed, context, llmsUsed, retrieversUsed)));
    }
    /**
     * Execute a step and all its downstream dependencies
     */
    async executeStepWithDependencies(step, stepMap, completed, context, llmsUsed, retrieversUsed) {
        // Check if already completed - ATOMIC CHECK
        if (completed.has(step.id)) {
            logger.debug(`Step ${step.id} already completed, skipping`);
            return;
        }
        // Wait for all parent steps to complete
        await this.waitForParentSteps(step, stepMap, completed);
        // DOUBLE CHECK completion after waiting (race condition fix)
        if (completed.has(step.id)) {
            logger.debug(`Step ${step.id} completed by parallel execution, skipping`);
            return;
        }
        // Execute current step
        logger.info(`Executing step: ${step.type}`, { stepId: step.id });
        const stepOutput = await this.executeSingleStep(step, context, llmsUsed, retrieversUsed);
        // Store step output in metadata
        if (stepOutput) {
            context.metadata.stepOutputs.set(step.id, stepOutput);
        }
        // Mark as completed
        completed.add(step.id);
        // Execute next steps
        if (step.nextSteps && step.nextSteps.length > 0) {
            const nextSteps = step.nextSteps
                .map(id => stepMap.get(id))
                .filter(s => s !== undefined);
            // Execute ALL next steps in parallel
            await Promise.all(nextSteps.map(nextStep => this.executeStepWithDependencies(nextStep, stepMap, completed, context, llmsUsed, retrieversUsed)));
        }
    }
    /**
     * Wait for all parent steps to complete
     */
    async waitForParentSteps(step, stepMap, completed) {
        // Find parent steps (steps that have this step as nextStep)
        const parentSteps = [];
        stepMap.forEach((s, id) => {
            if (s.nextSteps?.includes(step.id)) {
                parentSteps.push(id);
            }
        });
        // If no parents, we can execute immediately
        if (parentSteps.length === 0) {
            return;
        }
        // Wait for ALL parents to complete with timeout
        const maxWaitTime = 30000; // 30 seconds
        const startTime = Date.now();
        const checkInterval = 50; // ms
        while (parentSteps.some(parentId => !completed.has(parentId))) {
            // Check for timeout
            if (Date.now() - startTime > maxWaitTime) {
                const missingParents = parentSteps.filter(p => !completed.has(p));
                throw new Error(`Timeout waiting for parent steps: ${missingParents.join(', ')}`);
            }
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
        logger.debug(`All parents completed for step: ${step.id}`, { parentSteps });
    }
    /**
     * Execute a single step and return output
     */
    async executeSingleStep(step, context, llmsUsed, retrieversUsed) {
        try {
            let output = null;
            switch (step.type) {
                case 'query_rewrite':
                    output = await this.executeQueryRewrite(step, context, llmsUsed);
                    break;
                case 'retrieval':
                    output = await this.executeRetrieval(step, context, retrieversUsed);
                    break;
                case 'rerank':
                    output = await this.executeRerank(step, context, llmsUsed);
                    break;
                case 'answer_generation':
                    output = await this.executeAnswerGeneration(step, context, llmsUsed);
                    break;
                case 'post_process':
                    output = await this.executePostProcess(step, context);
                    break;
                case 'memory_update':
                    output = await this.executeMemoryUpdate(step, context, llmsUsed);
                    break;
                case 'memory_retrieve':
                    output = await this.executeMemoryRetrieve(step, context, llmsUsed);
                    break;
                case 'memory_summarize':
                    output = await this.executeMemorySummarize(step, context, llmsUsed);
                    break;
                default:
                    throw new Error(`Unknown step type: ${step.type}`);
            }
            // Store step result
            context.stepResults.set(step.id, {
                completed: true,
                timestamp: Date.now(),
                output: output
            });
            return output;
        }
        catch (error) {
            logger.error(`Step execution failed: ${step.type}`, {
                stepId: step.id,
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Execute query rewrite step
     */
    async executeQueryRewrite(step, context, llmsUsed) {
        if (!step.config?.llm) {
            throw new Error('No LLM config for query rewrite step');
        }
        const prompt = step.config.prompt ||
            `Improve this search query for better document retrieval. Return only the improved query.\n\nQuery: ${context.currentQuery}`;
        // @ts-ignore
        const response = await this.llmOrchestrator.generateCompletion({
            provider: step.config.llm.provider,
            model: step.config.llm.model,
            prompt,
            temperature: step.config.llm.temperature || 0.3,
            maxTokens: step.config.llm.maxTokens || 200,
            fallback: step.config.llm.fallback
        });
        const rewrittenQuery = response.content.trim();
        // Store each rewritten query by step ID (for parallel rewrites)
        context.rewrittenQueries.set(step.id, rewrittenQuery);
        // For downstream steps, use the last rewritten query or combine logic
        context.currentQuery = rewrittenQuery;
        llmsUsed.push(`${response.provider}:${response.model}`);
        logger.info('Query rewritten', {
            stepId: step.id,
            original: context.originalQuery,
            rewritten: rewrittenQuery
        });
        return {
            originalQuery: context.originalQuery,
            rewrittenQuery: rewrittenQuery
        };
    }
    /**
     * Execute retrieval step
     */
    async executeRetrieval(step, context, retrieversUsed) {
        if (!step.config?.retriever) {
            throw new Error('No retriever config for retrieval step');
        }
        const retrieverConfig = step.config.retriever;
        const topK = retrieverConfig.config?.topK || 10;
        try {
            // @ts-ignore
            if (retrieverConfig.type === 'qdrant') {
                const queryToUse = context.currentQuery;
                const embedding = await this.vectorDB.getEmbedding(queryToUse);
                const results = await this.vectorDB.searchVectors(embedding, topK, retrieverConfig.config?.filter);
                context.documents.push(...results);
                // @ts-ignore
                retrieversUsed.push(`qdrant:${this.vectorDB.collectionName}`);
                logger.info('Documents retrieved from Qdrant', {
                    count: results.length,
                    totalDocs: context.documents.length
                });
                const avgScore = results.length > 0
                    ? results.reduce((sum, doc) => sum + (doc.score || 0), 0) / results.length
                    : 0;
                return {
                    retrievedCount: results.length,
                    averageScore: avgScore
                };
            }
            else {
                throw new Error(`Unsupported retriever type: ${retrieverConfig.type}`);
            }
        }
        catch (error) {
            logger.error('Retrieval failed', { error: error.message });
            throw error;
        }
    }
    /**
     * Execute rerank step
     */
    async executeRerank(step, context, llmsUsed) {
        if (!step.config?.llm) {
            logger.warn('Skipping rerank - no LLM config');
            return { selectedQuery: context.currentQuery, totalQueries: 1 };
        }
        // Get all rewritten queries from previous steps
        const rewrittenQueries = Array.from(context.rewrittenQueries.values());
        if (rewrittenQueries.length === 0) {
            logger.warn('Skipping rerank - no rewritten queries available');
            return { selectedQuery: context.currentQuery, totalQueries: 1 };
        }
        if (rewrittenQueries.length === 1) {
            // Only one query, no need to rerank
            // @ts-ignore
            context.currentQuery = rewrittenQueries[0];
            // @ts-ignore
            return { selectedQuery: rewrittenQueries[0], totalQueries: 1 };
        }
        // Rerank multiple queries
        const prompt = `You have multiple query rewrites for the original question: "${context.originalQuery}"
    
Rewritten queries:
${rewrittenQueries.map((query, i) => `${i + 1}. ${query}`).join('\n')}

Which ONE query is the best for document retrieval? Return only the number (1, 2, 3, etc.):`;
        try {
            const response = await this.llmOrchestrator.generateCompletion({
                provider: step.config.llm.provider,
                model: step.config.llm.model,
                prompt,
                temperature: 0.1,
                maxTokens: 10
            });
            const selectedIndex = parseInt(response.content.trim()) - 1;
            if (selectedIndex >= 0 && selectedIndex < rewrittenQueries.length) {
                const bestQuery = rewrittenQueries[selectedIndex];
                // @ts-ignore
                context.currentQuery = bestQuery;
                logger.info('Best query selected by rerank', {
                    selectedQuery: bestQuery,
                    totalQueries: rewrittenQueries.length
                });
                return {
                    // @ts-ignore
                    selectedQuery: bestQuery,
                    totalQueries: rewrittenQueries.length
                };
            }
        }
        catch (error) {
            logger.warn('Reranking failed, using first query', { error: error.message });
            // @ts-ignore
            context.currentQuery = rewrittenQueries[0]; // Fallback
        }
        return {
            selectedQuery: context.currentQuery,
            totalQueries: rewrittenQueries.length
        };
    }
    /**
     * Execute answer generation step
     */
    async executeAnswerGeneration(step, context, llmsUsed) {
        if (!step.config?.llm) {
            throw new Error('No LLM config for answer generation step');
        }
        const queryForAnswer = context.currentQuery;
        const hasContext = context.documents.length > 0;
        const contextText = context.documents
            .slice(0, 5)
            .map((doc, i) => `[${i + 1}] ${doc.content}`)
            .join('\n\n');
        // Include memory context if available
        const memoryContext = context.metadata.memories
            ? `\n\nPrevious conversations:\n${context.metadata.memories.slice(0, 3).map(m => `- ${m.metadata.query}: ${m.metadata.response}`).join('\n')}`
            : '';
        const prompt = step.config.prompt || (hasContext
            ? `Answer this question using the context provided:\n\nQuestion: ${queryForAnswer}\n\nContext:\n${contextText}${memoryContext}\n\nAnswer:`
            : `Answer this question:\n\nQuestion: ${queryForAnswer}${memoryContext}\n\nAnswer:`);
        // @ts-ignore
        const response = await this.llmOrchestrator.generateCompletion({
            provider: step.config.llm.provider,
            model: step.config.llm.model,
            prompt,
            temperature: step.config.llm.temperature || 0.7,
            maxTokens: step.config.llm.maxTokens || 1000,
            systemPrompt: "You are a helpful assistant that provides accurate answers.",
            fallback: step.config.llm.fallback
        });
        context.answer = response.content.trim();
        llmsUsed.push(`${response.provider}:${response.model}`);
        context.confidence = this.calculateConfidence(context.documents, context.answer);
        logger.info('Answer generated', {
            answerLength: context.answer.length,
            confidence: context.confidence,
            documentsUsed: context.documents.length,
            memoriesUsed: context.metadata.memories?.length || 0
        });
        return {
            answerLength: context.answer.length,
            confidence: context.confidence
        };
    }
    /**
     * Execute post process step
     */
    async executePostProcess(step, context) {
        const modifications = [];
        if (context.answer) {
            context.answer = context.answer.trim();
            modifications.push('trimmed_answer');
            if (step.config?.addSourceAttribution && context.documents.length > 0) {
                context.answer += `\n\nSources: ${context.documents.length} document${context.documents.length > 1 ? 's' : ''}`;
                modifications.push('added_source_attribution');
            }
            // Show all rewritten queries if available
            if (step.config?.showRewrittenQuery && context.rewrittenQueries.size > 0) {
                const queries = Array.from(context.rewrittenQueries.entries())
                    .map(([id, query]) => `Step ${id}: "${query}"`)
                    .join(', ');
                context.answer += `\n\n[Enhanced queries: ${queries}]`;
                modifications.push('added_rewritten_queries');
            }
            // Show memory usage if available
            // @ts-ignore
            if (step.config?.showMemoryUsage && context.metadata.memories?.length > 0) {
                // @ts-ignore
                context.answer += `\n\n[Used ${context.metadata.memories.length} relevant memories from previous conversations]`;
                modifications.push('added_memory_usage');
            }
        }
        return { modifications };
    }
    /**
     * Execute memory retrieval step
     */
    async executeMemoryRetrieve(step, context, llmsUsed) {
        const config = step.config?.memoryRetrieve;
        if (!config?.enabled) {
            logger.info('Memory retrieve step disabled, skipping');
            return { memoryCount: 0, hasContext: false };
        }
        try {
            logger.info('Executing memory retrieval', {
                stepId: step.id,
                topK: config.topK || 5,
                minScore: config.minScore || 0.7
            });
            // Retrieve relevant memories
            // @ts-ignore
            const memoryResult = await this.memoryService.retrieveMemories({
                userId: context.metadata.userId,
                workflowId: context.metadata.workflowId,
                query: context.currentQuery,
                topK: config.topK || 5,
                minScore: config.minScore || 0.7,
                filters: config.filters
            });
            if (!memoryResult.success || !memoryResult.data?.memories) {
                logger.warn('Memory retrieval failed or no memories found', {
                    stepId: step.id,
                    error: memoryResult.error
                });
                return { memoryCount: 0, hasContext: false };
            }
            const memories = memoryResult.data.memories;
            let hasContext = false;
            if (memories.length > 0) {
                // Store memories in context for use in answer generation
                context.metadata.memories = memories;
                // Add memory context to the current query for better retrieval
                const memoryContext = memories
                    .slice(0, 3) // Use top 3 most relevant memories
                    .map(memory => `Previous conversation: ${memory.metadata.query} - ${memory.metadata.response}`)
                    .join('\n\n');
                if (memoryContext) {
                    // Enhance the current query with memory context
                    context.currentQuery = `${context.currentQuery}\n\nContext from previous conversations:\n${memoryContext}`;
                    hasContext = true;
                }
                logger.info('Memory retrieval successful', {
                    stepId: step.id,
                    memoryCount: memories.length,
                    topScore: memories[0]?.score || 0,
                    hasContext: hasContext
                });
            }
            else {
                logger.info('No relevant memories found', { stepId: step.id });
            }
            return {
                memoryCount: memories.length,
                hasContext: hasContext
            };
        }
        catch (error) {
            logger.error('Memory retrieval failed', {
                stepId: step.id,
                error: error.message
            });
            // Don't throw - memory retrieval shouldn't break the workflow
            return { memoryCount: 0, hasContext: false };
        }
    }
    /**
     * Execute memory summarize step
     */
    async executeMemorySummarize(step, context, llmsUsed) {
        const config = step.config?.memorySummarize;
        if (!config?.enabled) {
            logger.info('Memory summarize step disabled, skipping');
            return { originalCount: 0 };
        }
        try {
            logger.info('Executing memory summarization', {
                stepId: step.id,
                // @ts-ignore
                preserveDetails: config.preserveDetails || false
            });
            // Get memories to summarize (either from context or retrieve new ones)
            let memoryIds = [];
            if (Array.isArray(config.memoryIds) && config.memoryIds.length > 0) {
                // Use specified memory IDs
                memoryIds = config.memoryIds;
            }
            else if (config.similarityThreshold) {
                // Retrieve similar memories to summarize
                const memoryResult = await this.memoryService.retrieveMemories({
                    userId: context.metadata.userId,
                    workflowId: context.metadata.workflowId,
                    query: context.currentQuery,
                    topK: config.topK || 10,
                    minScore: config.similarityThreshold
                });
                if (memoryResult.success && memoryResult.data?.memories) {
                    memoryIds = memoryResult.data.memories.map(m => m.id);
                }
            }
            // Need at least 2 memories to summarize
            if (memoryIds.length < 2) {
                logger.info('Not enough memories to summarize', {
                    stepId: step.id,
                    memoryCount: memoryIds.length
                });
                return { originalCount: memoryIds.length };
            }
            // Perform summarization
            const summaryResult = await this.memoryService.summarizeMemories(memoryIds, context.metadata.userId, 
            // @ts-ignore
            config.preserveDetails || false);
            if (!summaryResult.success) {
                logger.warn('Memory summarization failed', {
                    stepId: step.id,
                    error: summaryResult.error
                });
                return { originalCount: memoryIds.length };
            }
            // Store summary in context for potential use
            if (summaryResult.data?.summarized) {
                context.metadata.memorySummary = summaryResult.data.summarized.summary;
                logger.info('Memory summarization completed', {
                    stepId: step.id,
                    originalCount: summaryResult.data.summarized.original.length,
                    summaryId: summaryResult.data.summarized.summary.id
                });
                return {
                    originalCount: summaryResult.data.summarized.original.length,
                    summaryId: summaryResult.data.summarized.summary.id
                };
            }
            return { originalCount: memoryIds.length };
        }
        catch (error) {
            logger.error('Memory summarization failed', {
                stepId: step.id,
                error: error.message
            });
            // Don't throw - memory summarization shouldn't break the workflow
            return { originalCount: 0 };
        }
    }
    /**
     * Execute memory update step
     */
    async executeMemoryUpdate(step, context, llmsUsed) {
        const config = step.config?.memoryUpdate;
        if (!config?.enabled) {
            logger.info('Memory update step disabled, skipping');
            return { importance: 0 };
        }
        try {
            logger.info('Executing memory update', {
                stepId: step.id,
                deduplication: config.deduplication?.enabled,
                importance: config.importance?.auto
            });
            // Calculate importance if auto is enabled
            const importance = config.importance?.auto
                ? this.calculateMemoryImportance(context)
                : (config.importance?.manualValue || 0.5);
            // Prepare memory data
            const memoryRequest = {
                userId: context.metadata.userId,
                workflowId: context.metadata.workflowId,
                query: context.originalQuery,
                response: context.answer,
                metadata: {
                    importance,
                    type: 'conversation',
                    tags: this.extractTags(context),
                    confidence: context.confidence,
                    documentCount: context.documents.length,
                    rewrittenQueries: Array.from(context.rewrittenQueries.entries()),
                    stepId: step.id
                }
            };
            // @ts-ignore
            const memoryResult = await this.memoryService.storeMemory(memoryRequest);
            if (!memoryResult.success) {
                logger.warn('Memory storage failed', {
                    stepId: step.id,
                    error: memoryResult.error
                });
                return { importance };
            }
            // Handle deduplication if enabled
            if (config.deduplication?.enabled) {
                await this.handleMemoryDeduplication(context, config.deduplication, memoryResult.data?.stored?.id);
            }
            // Apply retention policies
            if (config.retention?.enableExpiration) {
                await this.memoryService.cleanup(context.metadata.userId, config.retention.maxMemories || 1000);
            }
            logger.info('Memory update completed successfully', {
                stepId: step.id,
                memoryId: memoryResult.data?.stored?.id,
                importance
            });
            // @ts-ignore
            return {
                memoryId: memoryResult.data?.stored?.id,
                importance
            };
        }
        catch (error) {
            logger.error('Memory update failed', {
                stepId: step.id,
                error: error.message
            });
            // Don't throw - memory update shouldn't break the workflow
            return { importance: 0 };
        }
    }
    /**
     * Calculate memory importance based on context
     */
    calculateMemoryImportance(context) {
        let importance = 0.5; // Default importance
        // Increase importance based on answer quality
        if (context.answer.length > 200)
            importance += 0.2;
        if (context.confidence > 0.8)
            importance += 0.2;
        if (context.documents.length > 3)
            importance += 0.1;
        // Decrease importance for very short answers
        if (context.answer.length < 50)
            importance -= 0.2;
        return Math.min(1.0, Math.max(0.1, importance));
    }
    /**
     * Extract tags from context for memory organization
     */
    extractTags(context) {
        const tags = [];
        // Add workflow-related tags
        tags.push(`workflow:${context.metadata.workflowId}`);
        // Add document count tag
        if (context.documents.length > 0) {
            tags.push(`documents:${context.documents.length}`);
        }
        // Add confidence level tag
        if (context.confidence > 0.8) {
            tags.push('high-confidence');
        }
        else if (context.confidence < 0.4) {
            tags.push('low-confidence');
        }
        return tags;
    }
    /**
     * Handle memory deduplication
     */
    async handleMemoryDeduplication(context, deduplicationConfig, currentMemoryId) {
        if (!currentMemoryId)
            return;
        try {
            // Search for similar memories
            const similarMemories = await this.memoryService.retrieveMemories({
                userId: context.metadata.userId,
                query: context.originalQuery,
                topK: 10,
                minScore: deduplicationConfig.similarityThreshold || 0.8
            });
            if (similarMemories.success && similarMemories.data?.memories) {
                const duplicates = similarMemories.data.memories
                    .filter(memory => memory.id !== currentMemoryId && memory.score > 0.8);
                if (duplicates.length > 0) {
                    logger.info('Found duplicate memories', {
                        count: duplicates.length,
                        currentMemoryId
                    });
                    if (deduplicationConfig.mergeStrategy === 'summarize') {
                        // Summarize and merge duplicates
                        const memoryIds = duplicates.map(m => m.id).concat(currentMemoryId);
                        await this.memoryService.summarizeMemories(memoryIds, context.metadata.userId, true // preserve details
                        );
                    }
                    else {
                        // Delete duplicates (default behavior)
                        for (const duplicate of duplicates) {
                            await this.memoryService.deleteMemoryFromVectorDB(duplicate.id);
                        }
                    }
                }
            }
        }
        catch (error) {
            logger.warn('Deduplication failed', { error: error.message });
        }
    }
    calculateConfidence(documents, answer) {
        if (documents.length === 0)
            return 0.3;
        const avgScore = documents.reduce((sum, doc) => sum + (doc.score || 0), 0) / documents.length;
        const hasSubstantialAnswer = answer.length > 50;
        const hasMultipleSources = documents.length > 1;
        let confidence = avgScore * 0.5;
        confidence += hasSubstantialAnswer ? 0.3 : 0.1;
        confidence += hasMultipleSources ? 0.2 : 0.1;
        return Math.min(0.95, Math.max(0.1, confidence));
    }
}
//# sourceMappingURL=workflow-executor.service.js.map