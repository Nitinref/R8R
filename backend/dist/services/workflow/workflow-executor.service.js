// workflow-executor.service.ts - FIXED VERSION
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
            const context = {
                originalQuery: query,
                currentQuery: query,
                rewrittenQuery: null, // ✅ NEW: Track the rewritten query separately
                documents: [],
                answer: '',
                confidence: 0,
                metadata: {}
            };
            await this.executeSteps(config.steps, context, llmsUsed, retrieversUsed);
            if (!context.answer || context.answer.trim().length === 0) {
                throw new Error('No answer generated. Please ensure your workflow includes an answer generation step.');
            }
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
                // @ts-ignore
                rewrittenQuery: context.rewrittenQuery // ✅ Include rewritten query in result
            };
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
        const hasRetrieval = config.steps.some(s => s.type === 'retrieval');
        if (hasRetrieval && !process.env.PINECONE_API_KEY) {
            errors.push('PINECONE_API_KEY required for retrieval steps');
        }
        if (errors.length > 0) {
            throw new Error(`Configuration errors: ${errors.join(', ')}`);
        }
    }
    async executeSteps(steps, context, llmsUsed, retrieversUsed) {
        if (steps.length === 0) {
            throw new Error('No steps defined in workflow');
        }
        const stepMap = new Map(steps.map(step => [step.id, step]));
        const visited = new Set();
        const executing = new Set();
        const entrySteps = this.findEntrySteps(steps);
        for (const entryStep of entrySteps) {
            await this.executeStepRecursive(entryStep, stepMap, visited, executing, context, llmsUsed, retrieversUsed);
        }
    }
    findEntrySteps(steps) {
        const hasIncoming = new Set();
        steps.forEach(step => {
            step.nextSteps?.forEach(nextId => {
                hasIncoming.add(nextId);
            });
        });
        const entrySteps = steps.filter(step => !hasIncoming.has(step.id));
        // @ts-ignore
        return entrySteps.length > 0 ? entrySteps : [steps[0]];
    }
    async executeStepRecursive(step, stepMap, visited, executing, context, llmsUsed, retrieversUsed) {
        if (executing.has(step.id)) {
            throw new Error(`Circular dependency detected at step: ${step.id}`);
        }
        if (visited.has(step.id)) {
            return;
        }
        executing.add(step.id);
        await this.executeSingleStep(step, context, llmsUsed, retrieversUsed);
        executing.delete(step.id);
        visited.add(step.id);
        if (step.nextSteps) {
            for (const nextStepId of step.nextSteps) {
                const nextStep = stepMap.get(nextStepId);
                if (!nextStep) {
                    logger.warn(`Next step not found: ${nextStepId}`);
                    continue;
                }
                await this.executeStepRecursive(nextStep, stepMap, visited, executing, context, llmsUsed, retrieversUsed);
            }
        }
    }
    async executeSingleStep(step, context, llmsUsed, retrieversUsed) {
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
        }
        catch (error) {
            logger.error(`Step execution failed: ${step.type}`, {
                stepId: step.id,
                error: error.message
            });
            throw error;
        }
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
                // ✅ Use the rewritten query if available, otherwise use current query
                const queryToUse = context.rewrittenQuery || context.currentQuery;
                const embedding = await this.vectorDB.getEmbedding(queryToUse);
                const results = await this.vectorDB.searchPinecone(indexName, embedding, topK, retrieverConfig.config?.filter);
                context.documents.push(...results);
                retrieversUsed.push(retrieverConfig.type);
                logger.info('Documents retrieved from Pinecone', {
                    count: results.length,
                    indexName,
                    queryUsed: queryToUse // ✅ Log which query was used
                });
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
        // ✅ Store the rewritten query separately
        context.rewrittenQuery = response.content.trim();
        llmsUsed.push(`${response.provider}:${response.model}`);
        logger.info('Query rewritten', {
            original: context.originalQuery,
            rewritten: context.rewrittenQuery
        });
    }
    async executeRerank(step, context, llmsUsed) {
        if (!step.config?.llm || context.documents.length === 0) {
            return;
        }
        // ✅ Use rewritten query if available for reranking context
        const queryForRerank = context.rewrittenQuery || context.currentQuery;
        const prompt = `Rank these documents by relevance to the query: "${queryForRerank}"\n\n${context.documents.map((doc, i) => `${i + 1}. ${doc.content.substring(0, 200)}`).join('\n\n')}\n\nReturn only the numbers in order of relevance (e.g., "3,1,2"):`;
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
        // ✅ FIXED: Use rewritten query for answer generation if available
        const queryForAnswer = context.rewrittenQuery || context.currentQuery;
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
        logger.info('Answer generated using enhanced query', {
            queryUsed: queryForAnswer,
            answerLength: context.answer.length,
            confidence: context.confidence,
            hasRewrittenQuery: context.rewrittenQuery !== null
        });
    }
    async executePostProcess(step, context) {
        if (context.answer) {
            context.answer = context.answer.trim();
            if (step.config?.addSourceAttribution && context.documents.length > 0) {
                context.answer += `\n\nSources: ${context.documents.length} document${context.documents.length > 1 ? 's' : ''}`;
            }
            // ✅ Optionally append the rewritten query info if it differs from original
            if (step.config?.showRewrittenQuery && context.rewrittenQuery && context.rewrittenQuery !== context.originalQuery) {
                context.answer += `\n\nOptimized Query: "${context.rewrittenQuery}"`;
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
}
//# sourceMappingURL=workflow-executor.service.js.map