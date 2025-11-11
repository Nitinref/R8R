// workflow-executor.service.ts - PRODUCTION READY WITH ALL FIXES
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
    validateConfiguration(config) {
        const errors = [];
        if (!config.steps || config.steps.length === 0) {
            errors.push('Workflow must include at least one step');
        }
        const llmProviders = new Set();
        config.steps.forEach(step => {
            if (step.config?.llm) {
                llmProviders.add(step.config.llm.provider);
                if (step.type === 'query_rewrite' && !step.config.llm.model) {
                    errors.push(`Query rewrite step ${step.id} must have LLM model configured`);
                }
                if (step.type === 'answer_generation' && !step.config.llm.model) {
                    errors.push(`Answer generation step ${step.id} must have LLM model configured`);
                }
            }
            if (step.type === 'retrieval' && !step.config?.retriever) {
                errors.push(`Retrieval step ${step.id} must have retriever configuration`);
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
     * FIXED: Better race condition handling
     */
    async executeWorkflowGraph(config, context, llmsUsed, retrieversUsed) {
        const steps = config.steps;
        if (steps.length === 0) {
            throw new Error('No steps defined in workflow');
        }
        const stepMap = new Map(steps.map(step => [step.id, step]));
        const completed = new Set();
        const inProgress = new Set(); // NEW: Track in-progress steps
        const entrySteps = this.findEntrySteps(steps);
        logger.info('Starting workflow execution', {
            totalSteps: steps.length,
            entrySteps: entrySteps.map(s => s.id),
            hasAnswerGeneration: steps.some(s => s.type === 'answer_generation')
        });
        await this.executeFromEntryPoints(entrySteps, stepMap, completed, inProgress, context, llmsUsed, retrieversUsed);
        logger.info('Workflow execution completed', {
            completedSteps: completed.size,
            totalSteps: steps.length,
            hasAnswer: !!context.answer,
            documentCount: context.documents.length,
            rewriteCount: context.rewrittenQueries.size
        });
    }
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
    async executeFromEntryPoints(entrySteps, stepMap, completed, inProgress, context, llmsUsed, retrieversUsed) {
        await Promise.all(entrySteps.map(step => this.executeStepWithDependencies(step, stepMap, completed, inProgress, context, llmsUsed, retrieversUsed)));
    }
    /**
     * FIXED: Better race condition handling with inProgress tracking
     */
    async executeStepWithDependencies(step, stepMap, completed, inProgress, context, llmsUsed, retrieversUsed) {
        // Check if already completed or in progress
        if (completed.has(step.id)) {
            logger.debug(`Step ${step.id} already completed, skipping`);
            return;
        }
        if (inProgress.has(step.id)) {
            // Wait for the in-progress execution to complete
            logger.debug(`Step ${step.id} already in progress, waiting...`);
            await this.waitForStepCompletion(step.id, completed, 30000);
            return;
        }
        // Mark as in progress
        inProgress.add(step.id);
        try {
            // Wait for all parent steps to complete
            await this.waitForParentSteps(step, stepMap, completed);
            // Double-check completion after waiting
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
                await Promise.all(nextSteps.map(nextStep => this.executeStepWithDependencies(nextStep, stepMap, completed, inProgress, context, llmsUsed, retrieversUsed)));
            }
        }
        finally {
            // Remove from in-progress
            inProgress.delete(step.id);
        }
    }
    /**
     * NEW: Wait for a specific step to complete
     */
    async waitForStepCompletion(stepId, completed, timeout) {
        const startTime = Date.now();
        const checkInterval = 50;
        while (!completed.has(stepId)) {
            if (Date.now() - startTime > timeout) {
                throw new Error(`Timeout waiting for step ${stepId} to complete`);
            }
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
    }
    async waitForParentSteps(step, stepMap, completed) {
        const parentSteps = [];
        stepMap.forEach((s, id) => {
            if (s.nextSteps?.includes(step.id)) {
                parentSteps.push(id);
            }
        });
        if (parentSteps.length === 0) {
            return;
        }
        const maxWaitTime = 30000;
        const startTime = Date.now();
        const checkInterval = 50;
        while (parentSteps.some(parentId => !completed.has(parentId))) {
            if (Date.now() - startTime > maxWaitTime) {
                const missingParents = parentSteps.filter(p => !completed.has(p));
                throw new Error(`Timeout waiting for parent steps: ${missingParents.join(', ')}`);
            }
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
        logger.debug(`All parents completed for step: ${step.id}`, { parentSteps });
    }
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
    // =====================================================
    // QUERY REWRITING WITH FULL QUERY PRESERVATION
    // =====================================================
    async executeQueryRewrite(step, context, llmsUsed) {
        if (!step.config?.llm) {
            throw new Error('No LLM config for query rewrite step');
        }
        const strategies = [
            { name: 'semantic_expansion', temperature: 0.3, maxTokens: 400 }, // Increased from 300
            { name: 'clarification', temperature: 0.4, maxTokens: 350 }, // Increased from 250
            { name: 'simplification', temperature: 0.2, maxTokens: 300 } // Increased from 200
        ];
        let rewrittenQuery = '';
        let usedStrategy = 'semantic_expansion';
        let bestQualityScore = 0;
        for (const strategy of strategies) {
            try {
                const prompt = step.config.prompt || this.getImprovedQueryRewritePrompt(context.currentQuery);
                const enhancedPrompt = this.addStrategyGuidance(prompt, strategy.name);
                // @ts-ignore
                const response = await this.llmOrchestrator.generateCompletion({
                    provider: step.config.llm.provider,
                    model: step.config.llm.model,
                    prompt: enhancedPrompt,
                    temperature: strategy.temperature,
                    maxTokens: strategy.maxTokens,
                    fallback: step.config.llm.fallback,
                    systemPrompt: "You are an expert at optimizing search queries for retrieval systems. Always respond with a single, well-formed, natural language query. Do not truncate or cut off your response."
                });
                let candidate = this.cleanQueryResponse(response.content);
                // Validate quality
                const quality = this.assessQueryQuality(candidate, context.currentQuery);
                // IMPROVED LOGGING - Don't truncate
                logger.debug('Query rewrite attempt', {
                    strategy: strategy.name,
                    quality: quality.score,
                    issues: quality.issues,
                    candidateLength: candidate.length,
                    candidate: candidate // Full query, no truncation
                });
                if (quality.score >= 0.6) {
                    rewrittenQuery = candidate;
                    usedStrategy = strategy.name;
                    bestQualityScore = quality.score;
                    llmsUsed.push(`${response.provider}:${response.model}`);
                    break;
                }
                if (quality.score > bestQualityScore) {
                    rewrittenQuery = candidate;
                    bestQualityScore = quality.score;
                    usedStrategy = strategy.name;
                }
            }
            catch (error) {
                logger.warn(`Query rewrite strategy ${strategy.name} failed`, {
                    error: error.message
                });
                continue;
            }
        }
        // Final fallback
        if (!rewrittenQuery || rewrittenQuery.length < 10 || bestQualityScore < 0.3) {
            rewrittenQuery = context.currentQuery;
            usedStrategy = 'no_rewrite_fallback';
            bestQualityScore = 0.5;
            logger.warn('All rewrite strategies produced poor quality, using original query');
        }
        // Store the COMPLETE rewritten query
        context.rewrittenQueries.set(step.id, rewrittenQuery);
        context.currentQuery = rewrittenQuery;
        // IMPROVED LOGGING - Show full queries
        logger.info('Query rewrite completed', {
            stepId: step.id,
            strategy: usedStrategy,
            qualityScore: bestQualityScore,
            originalLength: context.originalQuery.length,
            rewrittenLength: rewrittenQuery.length,
            original: context.originalQuery, // Full query
            rewritten: rewrittenQuery, // Full query
            improvement: rewrittenQuery !== context.originalQuery
        });
        return {
            originalQuery: context.originalQuery,
            rewrittenQuery: rewrittenQuery,
            strategy: usedStrategy,
            qualityScore: bestQualityScore
        };
    }
    getImprovedQueryRewritePrompt(originalQuery) {
        return `You are an expert query optimizer for semantic search and RAG (Retrieval-Augmented Generation) systems.

TASK: Transform the user's question into an optimized search query that will retrieve the most relevant documents from a knowledge base.

ORIGINAL QUESTION:
"${originalQuery}"

OPTIMIZATION RULES:
1. Expand abbreviations and implicit concepts into full terms
2. Add related technical terms, synonyms, and domain-specific vocabulary
3. Rephrase for clarity and specificity while preserving all key concepts
4. Use natural, grammatically correct language - NOT keyword lists
5. Keep the query focused on the main question (avoid sub-questions unless critical)
6. Make it semantic search friendly but human-readable
7. IMPORTANT: Write a COMPLETE query - do not truncate or cut it off

GOOD EXAMPLES:

Example 1:
❌ Bad: "AI ML bias fairness ethics algorithms data"
✅ Good: "How do machine learning and artificial intelligence algorithms introduce bias into decision-making systems, and what are the ethical considerations for ensuring fairness?"

Example 2:
❌ Bad: "quantum computing qubits superposition entanglement practical use"
✅ Good: "What are the fundamental principles of quantum computing including qubits, superposition, and entanglement, and what practical applications does this technology enable?"

Example 3:
❌ Bad: "climate change global warming greenhouse gases mitigation adaptation strategies"
✅ Good: "What are the primary causes and effects of climate change and global warming driven by greenhouse gases, and what mitigation and adaptation strategies are most effective?"

Example 4:
❌ Bad: "blockchain cryptocurrency decentralized finance DeFi smart contracts"
✅ Good: "How does blockchain technology enable cryptocurrency and decentralized finance (DeFi) systems, and what role do smart contracts play in these applications?"

YOUR OPTIMIZED QUERY (write as a clear, complete, natural question or statement - do NOT truncate):`;
    }
    addStrategyGuidance(basePrompt, strategy) {
        const guidance = {
            semantic_expansion: '\n\nSTRATEGY FOCUS: Expand the query with related concepts, synonyms, technical terms, and domain-specific vocabulary while maintaining natural language flow.',
            clarification: '\n\nSTRATEGY FOCUS: Clarify ambiguous terms, make implicit concepts explicit, and add specificity to vague phrases while keeping the query concise.',
            simplification: '\n\nSTRATEGY FOCUS: Simplify complex or convoluted phrasing while preserving all key concepts and maintaining semantic richness for better retrieval.'
        };
        return basePrompt + (guidance[strategy] || '');
    }
    cleanQueryResponse(response) {
        let cleaned = response.trim();
        // Remove common LLM artifacts
        cleaned = cleaned
            .replace(/^["'`]|["'`]$/g, '')
            .replace(/^(optimized query|improved query|enhanced query|rewritten query|search query|query|answer|response|result):?\s*/gi, '')
            .replace(/\n+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        // Handle multiple sentences intelligently
        const sentences = cleaned.split(/[.!?]\s+/);
        if (sentences.length > 4) {
            cleaned = sentences.slice(0, 3).join('. ').trim();
            if (!cleaned.match(/[.!?]$/)) {
                cleaned += '.';
            }
        }
        // Remove bullet points or numbering
        cleaned = cleaned.replace(/^[-•*\d]+[\.)]\s*/gm, '');
        return cleaned;
    }
    assessQueryQuality(rewritten, original) {
        const issues = [];
        let score = 1.0;
        if (!rewritten || rewritten.length < 10) {
            issues.push('too_short');
            return { score: 0, issues };
        }
        if (rewritten.length > 600) {
            issues.push('too_long');
            score -= 0.2; // Less penalty
        }
        const hasVerbs = /\b(is|are|was|were|do|does|did|can|could|will|would|should|have|has|had|be|been|being|define|explain|describe|analyze|compare|discuss|explore|examine|consider|understand|mean|means|relate|relates|affect|affects|impact|impacts|cause|causes|lead|leads|result|results|determine|determines|influence|influences|contribute|contributes|enable|enables|create|creates|provide|provides|support|supports|demonstrate|demonstrates|show|shows|indicate|indicates|suggest|suggests|involve|involves|include|includes|contain|contains|represent|represents|require|requires|depend|depends|differ|differs|vary|varies|change|changes|improve|improves|reduce|reduces|increase|increases|enhance|enhances)\b/i.test(rewritten);
        if (!hasVerbs && rewritten.split(/\s+/).length > 10) {
            issues.push('keyword_dumping_no_verbs');
            score -= 0.5;
        }
        const startsWithCapital = /^[A-Z]/.test(rewritten);
        const hasProperPunctuation = /[.?!]$/.test(rewritten);
        if (!startsWithCapital) {
            issues.push('no_capital');
            score -= 0.1;
        }
        if (!hasProperPunctuation && rewritten.length > 20) {
            issues.push('no_punctuation');
            score -= 0.1;
        }
        const originalConcepts = this.extractKeyConcepts(original.toLowerCase());
        const rewrittenConcepts = this.extractKeyConcepts(rewritten.toLowerCase());
        const preservedConcepts = originalConcepts.filter(concept => rewrittenConcepts.some(rc => this.conceptsAreSimilar(concept, rc)));
        const conceptRetention = originalConcepts.length > 0
            ? preservedConcepts.length / originalConcepts.length
            : 1;
        if (conceptRetention < 0.4) {
            issues.push('lost_key_concepts');
            score -= 0.4;
        }
        else if (conceptRetention < 0.6) {
            issues.push('weak_concept_retention');
            score -= 0.15; // Reduced penalty
        }
        const similarity = this.calculateStringSimilarity(original.toLowerCase(), rewritten.toLowerCase());
        if (similarity > 0.9) {
            issues.push('too_similar_no_improvement');
            score -= 0.2; // Reduced penalty
        }
        const addedConcepts = rewrittenConcepts.filter(concept => !originalConcepts.some(oc => this.conceptsAreSimilar(concept, oc)));
        if (addedConcepts.length > 0 && addedConcepts.length <= 15) {
            score += 0.2;
        }
        else if (addedConcepts.length > 25) {
            issues.push('over_expansion');
            score -= 0.1; // Reduced penalty
        }
        if (/^[-•*]\s/m.test(rewritten) || rewritten.split('\n').length > 3) {
            issues.push('list_format');
            score -= 0.4;
        }
        const hasConnectors = /\b(and|or|but|however|therefore|thus|because|since|while|when|where|which|that|who|what|how|why|with|without|through|using|by|for|from|into|about|regarding|concerning)\b/i.test(rewritten);
        if (rewritten.split(/\s+/).length > 15 && !hasConnectors) {
            issues.push('lacks_coherence');
            score -= 0.1;
        }
        if (/^(what|how|why|when|where|who|which|can|does|is|are)\b/i.test(rewritten) && rewritten.includes('?')) {
            score += 0.1;
        }
        score = Math.max(0, Math.min(1, score));
        return { score, issues };
    }
    calculateStringSimilarity(str1, str2) {
        const words1 = new Set(str1.toLowerCase().split(/\s+/).filter(w => w.length > 0));
        const words2 = new Set(str2.toLowerCase().split(/\s+/).filter(w => w.length > 0));
        const intersection = new Set([...words1].filter(w => words2.has(w)));
        const union = new Set([...words1, ...words2]);
        return union.size === 0 ? 0 : intersection.size / union.size;
    }
    extractKeyConcepts(text) {
        const words = text.split(/\s+/).map(w => w.toLowerCase());
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
            'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
            'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
            'can', 'must', 'shall', 'what', 'when', 'where', 'why', 'how', 'who',
            'which', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
            'we', 'they', 'them', 'their', 'my', 'your', 'his', 'her', 'its', 'our',
            'if', 'then', 'else', 'so', 'as', 'than', 'such', 'both', 'each', 'few',
            'more', 'most', 'other', 'some', 'any', 'all', 'no', 'not', 'only', 'own',
            'same', 'very', 'just', 'now', 'here', 'there', 'over', 'under', 'again',
            'once', 'also', 'too', 'even', 'much', 'well', 'back', 'before', 'after',
            'above', 'below', 'between', 'among', 'against', 'across', 'around', 'behind',
            'beside', 'beyond', 'near', 'off', 'onto', 'out', 'outside', 'within', 'without'
        ]);
        const concepts = words
            .filter(word => word.length > 2 && !stopWords.has(word))
            .filter((word, index, array) => array.indexOf(word) === index);
        return concepts;
    }
    conceptsAreSimilar(concept1, concept2) {
        if (concept1 === concept2)
            return true;
        const stem1 = concept1.replace(/s$|es$|ies$/i, '');
        const stem2 = concept2.replace(/s$|es$|ies$/i, '');
        if (stem1 === stem2 && stem1.length > 2)
            return true;
        const base1 = concept1.replace(/ing$/, '').replace(/e$/, '');
        const base2 = concept2.replace(/ing$/, '').replace(/e$/, '');
        if (base1 === base2 && base1.length > 2)
            return true;
        const synonymGroups = [
            ['person', 'individual', 'human', 'self', 'being'],
            ['identity', 'self', 'personhood', 'individuality', 'selfhood'],
            ['memory', 'memories', 'recollection', 'remembrance', 'recall'],
            ['body', 'physical', 'corporeal', 'biological', 'bodily'],
            ['mind', 'consciousness', 'mental', 'psychological', 'cognitive', 'cognition'],
            ['reality', 'existence', 'world', 'universe', 'being'],
            ['continuity', 'persistence', 'endurance', 'continuation'],
            ['artificial', 'machine', 'automated', 'algorithmic'],
            ['intelligence', 'smart', 'intelligent', 'cognitive'],
            ['algorithm', 'algorithms', 'method', 'procedure', 'process'],
            ['data', 'information', 'dataset', 'datasets'],
            ['model', 'models', 'system', 'systems'],
            ['neural', 'network', 'networks', 'deep'],
            ['training', 'learning', 'train', 'learn'],
            ['mathematical', 'quantitative', 'numeric', 'numerical', 'math'],
            ['quantum', 'quantized', 'quanta'],
            ['particle', 'particles', 'matter'],
            ['wave', 'waves', 'waveform'],
            ['energy', 'energetic', 'power'],
            ['force', 'forces', 'interaction'],
            ['multiverse', 'universes', 'parallel', 'alternate'],
            ['law', 'laws', 'rule', 'rules', 'principle'],
            ['physics', 'physical', 'natural'],
            ['scientific', 'science', 'empirical'],
            ['evidence', 'proof', 'data', 'observation'],
            ['theory', 'theories', 'hypothesis', 'theoretical'],
            ['change', 'changing', 'changes', 'alter', 'modify', 'transform'],
            ['create', 'creation', 'generate', 'produce'],
            ['effect', 'effects', 'impact', 'impacts', 'consequence'],
            ['cause', 'causes', 'reason', 'reasons'],
            ['method', 'methods', 'approach', 'technique', 'way'],
            ['problem', 'problems', 'issue', 'issues', 'challenge'],
            ['solution', 'solutions', 'answer', 'answers', 'resolution']
        ];
        for (const group of synonymGroups) {
            if (group.includes(concept1) && group.includes(concept2)) {
                return true;
            }
        }
        if (concept1.length > 4 && concept2.length > 4) {
            if (concept1.includes(concept2) || concept2.includes(concept1)) {
                return true;
            }
        }
        return false;
    }
    // =====================================================
    // OTHER WORKFLOW STEPS
    // =====================================================
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
                logger.info('Starting retrieval', {
                    stepId: step.id,
                    queryLength: queryToUse.length,
                    query: queryToUse, // Full query
                    topK: topK
                });
                const embedding = await this.vectorDB.getEmbedding(queryToUse);
                const results = await this.vectorDB.searchVectors(embedding, topK, retrieverConfig.config?.filter);
                context.documents.push(...results);
                // @ts-ignore
                retrieversUsed.push(`qdrant:${this.vectorDB.collectionName}`);
                logger.info('Documents retrieved from Qdrant', {
                    stepId: step.id,
                    count: results.length,
                    totalDocs: context.documents.length,
                    topScores: results.slice(0, 3).map(r => r.score)
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
            logger.error('Retrieval failed', {
                stepId: step.id,
                error: error.message
            });
            throw error;
        }
    }
    async executeRerank(step, context, llmsUsed) {
        if (!step.config?.llm) {
            logger.warn('Skipping rerank - no LLM config');
            return { selectedQuery: context.currentQuery, totalQueries: 1 };
        }
        const rewrittenQueries = Array.from(context.rewrittenQueries.values());
        if (rewrittenQueries.length === 0) {
            logger.warn('Skipping rerank - no rewritten queries available');
            return { selectedQuery: context.currentQuery, totalQueries: 1 };
        }
        if (rewrittenQueries.length === 1) {
            context.currentQuery = rewrittenQueries[0];
            logger.info('Only one query, skipping rerank', {
                stepId: step.id,
                selectedQuery: rewrittenQueries[0]
            });
            return { selectedQuery: rewrittenQueries[0], totalQueries: 1 };
        }
        // Rerank multiple queries
        const prompt = `You are evaluating query rewrites for retrieval quality.

ORIGINAL QUESTION: "${context.originalQuery}"

QUERY OPTIONS:
${rewrittenQueries.map((query, i) => `${i + 1}. "${query}"`).join('\n')}

Select the BEST query for document retrieval that:
- Most accurately captures the original question's intent
- Uses clear, natural language
- Contains all key concepts and terminology
- Would work effectively for semantic search

Return ONLY the number (1, 2, 3, etc.) of the best query:`;
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
                context.currentQuery = bestQuery;
                logger.info('Best query selected by rerank', {
                    stepId: step.id,
                    selectedIndex: selectedIndex + 1,
                    selectedQuery: bestQuery, // Full query
                    totalQueries: rewrittenQueries.length
                });
                return {
                    selectedQuery: bestQuery,
                    totalQueries: rewrittenQueries.length
                };
            }
        }
        catch (error) {
            logger.warn('Reranking failed, using first query', {
                stepId: step.id,
                error: error.message
            });
        }
        context.currentQuery = rewrittenQueries[0];
        return {
            selectedQuery: rewrittenQueries[0],
            totalQueries: rewrittenQueries.length
        };
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
        const memoryContext = context.metadata.memories
            ? `\n\nPrevious conversations:\n${context.metadata.memories.slice(0, 3).map(m => `- ${m.metadata.query}: ${m.metadata.response}`).join('\n')}`
            : '';
        const prompt = step.config.prompt || (hasContext
            ? `Answer this question using the context provided:\n\nQuestion: ${queryForAnswer}\n\nContext:\n${contextText}${memoryContext}\n\nProvide a comprehensive, accurate answer based on the context:`
            : `Answer this question:\n\nQuestion: ${queryForAnswer}${memoryContext}\n\nProvide a clear, informative answer:`);
        // @ts-ignore
        const response = await this.llmOrchestrator.generateCompletion({
            provider: step.config.llm.provider,
            model: step.config.llm.model,
            prompt,
            temperature: step.config.llm.temperature || 0.7,
            maxTokens: step.config.llm.maxTokens || 1000,
            systemPrompt: "You are a helpful assistant that provides accurate, well-structured answers based on available information.",
            fallback: step.config.llm.fallback
        });
        context.answer = response.content.trim();
        llmsUsed.push(`${response.provider}:${response.model}`);
        context.confidence = this.calculateConfidence(context.documents, context.answer);
        logger.info('Answer generated', {
            stepId: step.id,
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
    async executePostProcess(step, context) {
        const modifications = [];
        if (context.answer) {
            context.answer = context.answer.trim();
            modifications.push('trimmed_answer');
            if (step.config?.addSourceAttribution && context.documents.length > 0) {
                context.answer += `\n\nSources: ${context.documents.length} document${context.documents.length > 1 ? 's' : ''}`;
                modifications.push('added_source_attribution');
            }
            if (step.config?.showRewrittenQuery && context.rewrittenQueries.size > 0) {
                const queries = Array.from(context.rewrittenQueries.entries())
                    .map(([id, query]) => `Step ${id}: "${query}"`)
                    .join(', ');
                context.answer += `\n\n[Enhanced queries: ${queries}]`;
                modifications.push('added_rewritten_queries');
            }
            // @ts-ignore
            if (step.config?.showMemoryUsage && context.metadata.memories?.length > 0) {
                // @ts-ignore
                context.answer += `\n\n[Used ${context.metadata.memories.length} relevant memories from previous conversations]`;
                modifications.push('added_memory_usage');
            }
        }
        return { modifications };
    }
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
                context.metadata.memories = memories;
                const memoryContext = memories
                    .slice(0, 3)
                    .map(memory => `Previous conversation: ${memory.metadata.query} - ${memory.metadata.response}`)
                    .join('\n\n');
                if (memoryContext) {
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
            return { memoryCount: 0, hasContext: false };
        }
    }
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
            let memoryIds = [];
            if (Array.isArray(config.memoryIds) && config.memoryIds.length > 0) {
                memoryIds = config.memoryIds;
            }
            else if (config.similarityThreshold) {
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
            if (memoryIds.length < 2) {
                logger.info('Not enough memories to summarize', {
                    stepId: step.id,
                    memoryCount: memoryIds.length
                });
                return { originalCount: memoryIds.length };
            }
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
            return { originalCount: 0 };
        }
    }
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
            const importance = config.importance?.auto
                ? this.calculateMemoryImportance(context)
                : (config.importance?.manualValue || 0.5);
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
            if (config.deduplication?.enabled) {
                await this.handleMemoryDeduplication(context, config.deduplication, memoryResult.data?.stored?.id);
            }
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
            return { importance: 0 };
        }
    }
    calculateMemoryImportance(context) {
        let importance = 0.5;
        if (context.answer.length > 200)
            importance += 0.2;
        if (context.confidence > 0.8)
            importance += 0.2;
        if (context.documents.length > 3)
            importance += 0.1;
        if (context.answer.length < 50)
            importance -= 0.2;
        return Math.min(1.0, Math.max(0.1, importance));
    }
    extractTags(context) {
        const tags = [];
        tags.push(`workflow:${context.metadata.workflowId}`);
        if (context.documents.length > 0) {
            tags.push(`documents:${context.documents.length}`);
        }
        if (context.confidence > 0.8) {
            tags.push('high-confidence');
        }
        else if (context.confidence < 0.4) {
            tags.push('low-confidence');
        }
        return tags;
    }
    async handleMemoryDeduplication(context, deduplicationConfig, currentMemoryId) {
        if (!currentMemoryId)
            return;
        try {
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
                        const memoryIds = duplicates.map(m => m.id).concat(currentMemoryId);
                        await this.memoryService.summarizeMemories(memoryIds, context.metadata.userId, true);
                    }
                    else {
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