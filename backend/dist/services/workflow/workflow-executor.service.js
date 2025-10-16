// workflow-executor.service.ts - FIXED VERSION FOR PARALLEL EXECUTION
import { LLMOrchestrator } from '../llm/llm-orchestrator.service.js';
import { VectorDBService } from '../retrieval/vector-db.service.js';
import { CacheService } from '../cache.service.js';
import { logger } from '../../utils/logger.js';
export class WorkflowExecutor {
    llmOrchestrator;
    vectorDB;
    cache;
    constructor() {
        this.llmOrchestrator = new LLMOrchestrator();
        this.vectorDB = new VectorDBService();
        this.cache = new CacheService();
    }
    async executeWorkflow(config, query, useCache = true) {
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
                rewrittenQueries: new Map(), // Store multiple rewritten queries
                documents: [],
                answer: '',
                confidence: 0,
                metadata: {},
                stepResults: new Map(),
                stepOutputs: new Map() // Store outputs from each step
            };
            // Execute workflow graph
            await this.executeWorkflowGraph(config, context, llmsUsed, retrieversUsed);
            if (!context.answer || context.answer.trim().length === 0) {
                throw new Error('No answer generated. Ensure workflow includes answer generation step.');
            }
            // @ts-ignore
            const result = {
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
                cached: false,
                rewrittenQuery: Array.from(context.rewrittenQueries.entries()).reduce((acc, [key, value]) => {
                    acc[key] = value;
                    return acc;
                }, {})
            };
            // Cache result
            if (useCache && config.cacheEnabled && context.answer) {
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
            entrySteps: entrySteps.map(s => s.id)
        });
        // Execute from entry points - REMOVED inProgress tracking
        await this.executeFromEntryPoints(entrySteps, stepMap, completed, context, llmsUsed, retrieversUsed);
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
        // If no clear entry points, use first step
        // @ts-ignore
        return entrySteps.length > 0 ? entrySteps : [steps[0]];
    }
    /**
     * Execute workflow starting from entry points
     */
    async executeFromEntryPoints(entrySteps, stepMap, completed, context, llmsUsed, retrieversUsed) {
        // Execute all entry steps in parallel
        await Promise.all(entrySteps.map(step => this.executeStepWithDependencies(step, stepMap, completed, context, llmsUsed, retrieversUsed)));
    }
    /**
     * Execute a step and all its downstream dependencies - FIXED VERSION
     */
    /**
    * Execute a step and all its downstream dependencies - FIXED VERSION
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
        await this.executeSingleStep(step, context, llmsUsed, retrieversUsed);
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
     * Wait for all parent steps to complete - FIXED VERSION
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
     * Execute a single step
     */
    async executeSingleStep(step, context, llmsUsed, retrieversUsed) {
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
            // Store step result
            context.stepResults.set(step.id, {
                completed: true,
                timestamp: Date.now()
            });
        }
        catch (error) {
            logger.error(`Step execution failed: ${step.type}`, {
                stepId: step.id,
                error: error.message
            });
            throw error;
        }
    }
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
        // Simple approach: use the last one, or implement merging logic
        context.currentQuery = rewrittenQuery;
        llmsUsed.push(`${response.provider}:${response.model}`);
        logger.info('Query rewritten', {
            stepId: step.id,
            original: context.originalQuery,
            rewritten: rewrittenQuery
        });
    }
    async executeRetrieval(step, context, retrieversUsed) {
        if (!step.config?.retriever) {
            throw new Error('No retriever config for retrieval step');
        }
        const retrieverConfig = step.config.retriever;
        const topK = retrieverConfig.config?.topK || 10;
        try {
            if (retrieverConfig.type === 'pinecone') {
                const indexName = retrieverConfig.config?.indexName;
                if (!indexName) {
                    throw new Error('Pinecone index name required');
                }
                // Use the current query (could be rewritten by any of the parallel steps)
                const queryToUse = context.currentQuery;
                const embedding = await this.vectorDB.getEmbedding(queryToUse);
                const results = await this.vectorDB.searchPinecone(indexName, embedding, topK, retrieverConfig.config?.filter);
                // Merge with existing documents (for parallel retrievals)
                context.documents.push(...results);
                retrieversUsed.push(`${retrieverConfig.type}:${indexName}`);
                logger.info('Documents retrieved from Pinecone', {
                    count: results.length,
                    indexName,
                    totalDocs: context.documents.length
                });
            }
            else if (retrieverConfig.type === 'keyword') {
                // Implement keyword search
                logger.info('Keyword search not yet implemented');
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
    async executeRerank(step, context, llmsUsed) {
        if (!step.config?.llm || context.documents.length === 0) {
            logger.warn('Skipping rerank - no LLM config or no documents');
            return;
        }
        const queryForRerank = context.currentQuery;
        const prompt = `Rank these documents by relevance to: "${queryForRerank}"\n\n${context.documents.map((doc, i) => `${i + 1}. ${doc.content.substring(0, 200)}`).join('\n\n')}\n\nReturn only the numbers in order of relevance (e.g., "3,1,2"):`;
        try {
            // @ts-ignore
            const response = await this.llmOrchestrator.generateCompletion({
                provider: step.config.llm.provider,
                model: step.config.llm.model,
                prompt,
                temperature: 0.1,
                maxTokens: 100,
                fallback: step.config.llm.fallback
            });
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
        }
        catch (error) {
            logger.warn('Reranking failed, keeping original order', {
                error: error.message
            });
        }
    }
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
        const prompt = step.config.prompt || (hasContext
            ? `Answer this question using the context provided:\n\nQuestion: ${queryForAnswer}\n\nContext:\n${contextText}\n\nAnswer:`
            : `Answer this question:\n\nQuestion: ${queryForAnswer}\n\nAnswer:`);
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
            documentsUsed: context.documents.length
        });
    }
    async executePostProcess(step, context) {
        if (context.answer) {
            context.answer = context.answer.trim();
            if (step.config?.addSourceAttribution && context.documents.length > 0) {
                context.answer += `\n\nSources: ${context.documents.length} document${context.documents.length > 1 ? 's' : ''}`;
            }
            // Show all rewritten queries if available
            if (step.config?.showRewrittenQuery && context.rewrittenQueries.size > 0) {
                const queries = Array.from(context.rewrittenQueries.entries())
                    .map(([id, query]) => `Step ${id}: "${query}"`)
                    .join(', ');
                context.answer += `\n\n[Enhanced queries: ${queries}]`;
            }
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
    validateConfiguration(config) {
        const errors = [];
        const hasAnswerStep = config.steps.some(s => s.type === 'answer_generation');
        if (!hasAnswerStep) {
            errors.push('Workflow must include an answer generation step');
        }
        const llmProviders = new Set();
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
        if (errors.length > 0) {
            throw new Error(`Configuration errors: ${errors.join(', ')}`);
        }
    }
}
//# sourceMappingURL=workflow-executor.service.js.map