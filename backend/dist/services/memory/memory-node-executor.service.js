// services/memory/memory-node-executor.service.ts
import { getMemoryService } from './memory.service.js';
import { logger } from '../../utils/logger.js';
import { LLMOrchestrator } from '../llm/llm-orchestrator.service.js';
export class MemoryNodeExecutor {
    memoryService = getMemoryService();
    llmOrchestrator = new LLMOrchestrator();
    /**
     * Execute Memory Retrieve Node
     */
    async executeMemoryRetrieve(config, context, userId, workflowId) {
        try {
            logger.info('Executing memory retrieve node', {
                userId,
                workflowId,
                query: context.currentQuery
            });
            if (!config.enabled) {
                logger.info('Memory retrieve disabled');
                return context;
            }
            // Use rewritten query if available, otherwise use current query
            const queryToUse = context.rewrittenQuery || context.currentQuery;
            // Choose search strategy
            let result;
            if (config.retrieval.useHybridSearch) {
                result = await this.memoryService.hybridSearch(
                // @ts-ignore
                {
                    userId,
                    workflowId: config.retrieval.includeMetadata ? workflowId : undefined,
                    query: queryToUse,
                    topK: config.retrieval.topK || 5,
                    minScore: config.retrieval.minScore || 0.7,
                    filters: config.filters
                }, config.retrieval.keywordWeight || 0.3);
            }
            else {
                result = await this.memoryService.retrieveMemories(
                // @ts-ignore
                {
                    userId,
                    workflowId: config.retrieval.includeMetadata ? workflowId : undefined,
                    query: queryToUse,
                    topK: config.retrieval.topK || 5,
                    minScore: config.retrieval.minScore || 0.7,
                    filters: config.filters
                }, config);
            }
            if (!result.success || !result.data?.memories) {
                logger.warn('No memories retrieved', { userId, workflowId });
                return {
                    ...context,
                    retrievedMemories: [],
                    metadata: {
                        ...context.metadata,
                        memoriesUsed: 0,
                        memoryRelevance: 0,
                        memoryRetrievalStrategy: config.retrieval.useHybridSearch ? 'hybrid' : 'vector'
                    }
                };
            }
            const memories = result.data.memories;
            // Calculate average relevance
            const avgRelevance = memories.length > 0
                // @ts-ignore
                ? memories.reduce((sum, m) => sum + m.score, 0) / memories.length
                : 0;
            // Optionally rerank memories
            let finalMemories = memories;
            if (config.retrieval.useReranking && memories.length > 1) {
                finalMemories = await this.rerankMemories(memories, context.currentQuery);
            }
            // Apply relevance threshold if specified
            if (config.retrieval.relevanceThreshold) {
                // @ts-ignore
                finalMemories = finalMemories.filter(m => m.score >= config.retrieval.relevanceThreshold);
            }
            logger.info('Memories retrieved successfully', {
                count: finalMemories.length,
                avgRelevance,
                topScore: finalMemories[0]?.score || 0,
                strategy: config.retrieval.useHybridSearch ? 'hybrid' : 'vector'
            });
            return {
                ...context,
                retrievedMemories: finalMemories,
                metadata: {
                    ...context.metadata,
                    memoriesUsed: finalMemories.length,
                    memoryRelevance: avgRelevance,
                    memoryRetrievalTime: result.stats?.totalTime || 0,
                    memoryRetrievalStrategy: config.retrieval.useHybridSearch ? 'hybrid' : 'vector',
                    topMemoryScore: finalMemories[0]?.score || 0
                }
            };
        }
        catch (error) {
            logger.error('Memory retrieve execution failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId
            });
            return {
                ...context,
                retrievedMemories: [],
                metadata: {
                    ...context.metadata,
                    memoriesUsed: 0,
                    memoryRelevance: 0,
                    memoryError: error instanceof Error ? error.message : 'Unknown error',
                    memoryRetrievalStrategy: 'failed'
                }
            };
        }
    }
    /**
     * Execute Memory Update Node
     */
    async executeMemoryUpdate(config, context, userId, workflowId) {
        try {
            logger.info('Executing memory update node', {
                userId,
                workflowId,
                hasAnswer: !!context.answer
            });
            if (!config.enabled || !context.answer) {
                logger.info('Memory update skipped - disabled or no answer');
                return context;
            }
            // Validate memory content before storing
            const validation = this.validateMemoryContent(context.currentQuery, context.answer);
            if (!validation.valid) {
                logger.warn('Memory validation failed', { reasons: validation.reasons });
                return {
                    ...context,
                    metadata: {
                        ...context.metadata,
                        memoryStored: false,
                        memoryValidationFailed: true,
                        memoryValidationErrors: validation.reasons
                    }
                };
            }
            // Calculate importance score
            let importance = config.importance.baseScore || 0.5;
            if (config.importance.auto) {
                importance = this.calculateAutoImportance(context.currentQuery, context.answer, context.confidence || 0, context.metadata);
            }
            // Apply importance boost based on context
            importance = this.applyContextualImportanceBoost(importance, context);
            // Check for duplicates if deduplication is enabled
            if (config.deduplication.enabled) {
                const duplicates = await this.findDuplicateMemories(userId, workflowId, context.currentQuery, context.answer, config.deduplication.similarityThreshold);
                if (duplicates.length > 0) {
                    logger.info('Found duplicate memories', {
                        count: duplicates.length,
                        strategy: config.deduplication.mergeStrategy
                    });
                    // Handle duplicates based on strategy
                    const shouldStore = await this.handleDuplicateMemories(duplicates, context, userId, importance, config.deduplication.mergeStrategy);
                    if (!shouldStore) {
                        logger.info('Skipping memory storage due to duplicate handling');
                        return {
                            ...context,
                            metadata: {
                                ...context.metadata,
                                memoryStored: false,
                                duplicateFound: true,
                                duplicatesCount: duplicates.length
                            }
                        };
                    }
                }
            }
            // Classify memory type and extract tags
            const memoryType = this.classifyMemoryType(context.currentQuery, context.answer);
            const tags = this.extractTags(context.currentQuery, context.answer);
            // Store the memory
            const result = await this.memoryService.storeMemory({
                userId,
                workflowId,
                query: context.currentQuery,
                response: context.answer,
                metadata: {
                    importance,
                    type: memoryType,
                    tags,
                    confidence: context.confidence,
                    sourceWorkflow: workflowId,
                    retrievalContext: context.retrievedMemories.length > 0 ? {
                        // @ts-ignore
                        usedMemories: context.retrievedMemories.map(m => m.id),
                        relevanceScore: context.metadata.memoryRelevance
                    } : undefined
                }
            });
            if (result.success) {
                logger.info('Memory stored successfully', {
                    memoryId: result.data?.stored?.id,
                    importance,
                    type: memoryType,
                    tags: tags.join(', ')
                });
                // Cleanup old memories if retention limit is set
                if (config.retention.maxMemories) {
                    await this.memoryService.cleanup(userId, config.retention.maxMemories);
                }
                // Apply expiration if enabled
                if (config.retention.enableExpiration && config.retention.expirationDays) {
                    await this.applyMemoryExpiration(userId, config.retention.expirationDays);
                }
            }
            return {
                ...context,
                // @ts-ignore
                metadata: {
                    ...context.metadata,
                    memoryStored: result.success,
                    memoryId: result.data?.stored?.id,
                    memoryImportance: importance,
                    memoryType,
                    memoryTags: tags,
                    storageTime: result.stats?.totalTime || 0
                }
            };
        }
        catch (error) {
            logger.error('Memory update execution failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId
            });
            return {
                ...context,
                metadata: {
                    ...context.metadata,
                    memoryStored: false,
                    memoryError: error instanceof Error ? error.message : 'Unknown error'
                }
            };
        }
    }
    /**
     * Execute Memory Summarize Node
     */
    async executeMemorySummarize(config, context, userId, workflowId) {
        try {
            logger.info('Executing memory summarize node', {
                userId,
                workflowId,
                memoryCount: context.retrievedMemories.length
            });
            if (!config.enabled) {
                logger.info('Memory summarize disabled');
                return context;
            }
            const memories = context.retrievedMemories;
            // Check if summarization should be triggered
            if (memories.length < config.triggers.minMemories) {
                logger.info('Not enough memories to summarize', {
                    count: memories.length,
                    required: config.triggers.minMemories
                });
                return context;
            }
            // Group similar memories
            const groups = this.groupSimilarMemories(memories, config.triggers.maxSimilarity);
            // Filter groups that meet the minimum size requirement
            //   @ts-ignore
            const eligibleGroups = groups.filter(group => group.length >= config.triggers.minGroupSize || 2);
            logger.info('Grouped memories for summarization', {
                totalGroups: groups.length,
                eligibleGroups: eligibleGroups.length,
                groupSizes: eligibleGroups.map(g => g.length)
            });
            if (eligibleGroups.length === 0) {
                logger.info('No eligible groups for summarization');
                return context;
            }
            // Summarize each group
            let summarizedCount = 0;
            const summarizationResults = [];
            for (const group of eligibleGroups) {
                try {
                    const result = await this.memoryService.summarizeMemories(group.map(m => m.id), userId, config.strategy.preserveDetails);
                    if (result.success) {
                        summarizedCount++;
                        summarizationResults.push({
                            originalCount: group.length,
                            summaryId: result.data?.summarized?.summary.id,
                            //   @ts-ignore
                            groupId: group[0].id // Use first memory ID as group identifier
                        });
                        logger.info('Memory group summarized', {
                            originalCount: group.length,
                            summaryId: result.data?.summarized?.summary.id
                        });
                    }
                }
                catch (groupError) {
                    logger.error('Failed to summarize memory group', {
                        groupSize: group.length,
                        error: groupError instanceof Error ? groupError.message : 'Unknown error'
                    });
                }
            }
            return {
                ...context,
                metadata: {
                    ...context.metadata,
                    memoriesSummarized: summarizedCount > 0,
                    groupsProcessed: eligibleGroups.length,
                    summarizedCount,
                    summarizationResults,
                    compressionRatio: summarizedCount > 0 ?
                        (summarizedCount / memories.length) : 0
                }
            };
        }
        catch (error) {
            logger.error('Memory summarize execution failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId
            });
            return {
                ...context,
                metadata: {
                    ...context.metadata,
                    memoriesSummarized: false,
                    memoryError: error instanceof Error ? error.message : 'Unknown error'
                }
            };
        }
    }
    // ==================== ENHANCED HELPER METHODS ====================
    async rerankMemories(memories, query) {
        // Enhanced reranking with multiple factors
        return memories.sort((a, b) => {
            const scoreA = this.calculateRerankScore(a, query);
            const scoreB = this.calculateRerankScore(b, query);
            return scoreB - scoreA;
        });
    }
    calculateRerankScore(memory, query) {
        const baseScore = memory.score * 0.5;
        const importanceScore = memory.metadata.importance * 0.2;
        const recencyScore = this.getRecencyScore(memory.metadata.timestamp) * 0.15;
        const engagementScore = this.getEngagementScore(memory.metadata.accessCount) * 0.1;
        const lengthScore = this.getLengthScore(memory.metadata.query + memory.metadata.response) * 0.05;
        return baseScore + importanceScore + recencyScore + engagementScore + lengthScore;
    }
    getRecencyScore(timestamp) {
        const ageInDays = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60 * 24);
        // Exponential decay for recency
        if (ageInDays < 1)
            return 1.0;
        if (ageInDays < 3)
            return 0.9;
        if (ageInDays < 7)
            return 0.7;
        if (ageInDays < 30)
            return 0.4;
        return 0.1;
    }
    getEngagementScore(accessCount) {
        // Logarithmic scaling for engagement
        return Math.min(Math.log10(accessCount + 1) / 2, 1);
    }
    getLengthScore(content) {
        const length = content.length;
        if (length < 100)
            return 0.3;
        if (length < 500)
            return 0.7;
        if (length < 1000)
            return 0.9;
        return 1.0; // Very detailed memories get highest score
    }
    calculateAutoImportance(query, answer, confidence, metadata) {
        let importance = 0.5;
        // Length-based factors (logarithmic scaling)
        const totalLength = query.length + answer.length;
        if (totalLength > 200)
            importance += 0.1;
        if (totalLength > 500)
            importance += 0.1;
        if (totalLength > 1000)
            importance += 0.1;
        // Confidence-based factor
        importance += confidence * 0.2;
        // Complexity indicators
        const hasCode = /```[\s\S]*?```/.test(query) || /```[\s\S]*?```/.test(answer);
        if (hasCode)
            importance += 0.15;
        const hasStructuredData = /\{.*\}/.test(answer) || /\[.*\]/.test(answer);
        if (hasStructuredData)
            importance += 0.1;
        const hasNumbers = /\d{3,}/.test(answer);
        if (hasNumbers)
            importance += 0.05;
        // Question complexity
        const questionCount = (query.match(/\?/g) || []).length;
        importance += Math.min(questionCount * 0.03, 0.1);
        // Answer structure
        const hasBulletPoints = /[-*•]\s/.test(answer);
        const hasNumberedList = /\d+\.\s/.test(answer);
        if (hasBulletPoints || hasNumberedList)
            importance += 0.05;
        return Math.min(Math.max(importance, 0.1), 1.0); // Ensure between 0.1 and 1.0
    }
    applyContextualImportanceBoost(baseImportance, context) {
        let boostedImportance = baseImportance;
        // Boost if this memory was influenced by previous memories
        if (context.retrievedMemories.length > 0) {
            boostedImportance += 0.05;
        }
        // Boost for high-confidence responses
        if (context.confidence && context.confidence > 0.8) {
            boostedImportance += 0.05;
        }
        // Slight boost for complex queries
        const queryComplexity = context.currentQuery.split(/\s+/).length;
        if (queryComplexity > 10) {
            boostedImportance += 0.03;
        }
        return Math.min(boostedImportance, 1.0);
    }
    async findDuplicateMemories(userId, workflowId, query, answer, threshold) {
        // FIXED: Use the actual query, not the answer as query parameter
        const result = await this.memoryService.retrieveMemories({
            userId,
            workflowId,
            query: query, // Use the query, not answer
            topK: 5,
            minScore: threshold
        });
        return result.data?.memories || [];
    }
    async handleDuplicateMemories(duplicates, context, userId, newImportance, strategy) {
        switch (strategy) {
            case 'summarize':
                // Include the new content in summarization
                const memoryIds = duplicates.map(d => d.id);
                // Note: We can't include the new memory ID since it doesn't exist yet
                // This would need to be handled differently in a real implementation
                logger.info('Summarize strategy selected for duplicates', {
                    duplicateCount: duplicates.length
                });
                // For now, we'll store the new memory and let periodic summarization handle it
                return true;
            case 'keep_recent':
                const mostRecent = duplicates.reduce((latest, current) => current.metadata.timestamp > latest.metadata.timestamp ? current : latest);
                const currentTime = new Date();
                const daysSinceRecent = (currentTime.getTime() - mostRecent.metadata.timestamp.getTime()) / (1000 * 60 * 60 * 24);
                // Only skip if recent duplicate is less than 7 days old
                return daysSinceRecent > 7;
            case 'keep_important':
                const maxImportance = Math.max(...duplicates.map(d => d.metadata.importance));
                return newImportance > maxImportance;
            case 'merge_metadata':
                // Enhanced strategy: merge metadata and update existing
                //   @ts-ignore
                await this.mergeMemoryMetadata(duplicates[0].id, {
                    mergedFrom: duplicates.map(d => d.id),
                    lastUpdated: new Date().toISOString(),
                    //   @ts-ignore
                    mergeCount: duplicates[0].metadata.mergeCount + 1 || 1
                });
                return false;
            default:
                return true;
        }
    }
    async mergeMemoryMetadata(memoryId, metadata) {
        // This would update the memory with merged metadata
        // Implementation depends on your memory service capabilities
        logger.info('Merging memory metadata', { memoryId, metadata });
    }
    validateMemoryContent(query, answer) {
        const reasons = [];
        if (!query.trim())
            reasons.push('Query is empty');
        if (!answer.trim())
            reasons.push('Answer is empty');
        if (query.length < 3)
            reasons.push('Query too short');
        if (answer.length < 5)
            reasons.push('Answer too short');
        if (query.length > 10000)
            reasons.push('Query too long');
        if (answer.length > 20000)
            reasons.push('Answer too long');
        // Check for meaningless content
        const meaninglessPatterns = [
            /^\s*(ok|yes|no|thanks?|thank you|hello|hi)\s*$/i,
            /^\s*\.*\s*$/,
            /test\s+test/i
        ];
        if (meaninglessPatterns.some(pattern => pattern.test(query) || pattern.test(answer))) {
            reasons.push('Content appears to be meaningless or test data');
        }
        return {
            valid: reasons.length === 0,
            reasons
        };
    }
    classifyMemoryType(query, answer) {
        const lowerQuery = query.toLowerCase();
        const lowerAnswer = answer.toLowerCase();
        if (lowerQuery.includes('how to') || lowerQuery.includes('step by step') ||
            lowerAnswer.includes('first,') || lowerAnswer.includes('then,')) {
            return 'instruction';
        }
        if (lowerQuery.includes('prefer') || lowerQuery.includes('like') ||
            lowerQuery.includes('want') || lowerAnswer.includes('preference') ||
            lowerAnswer.includes('i recommend')) {
            return 'preference';
        }
        if (lowerQuery.includes('should') || lowerQuery.includes('decide') ||
            lowerQuery.includes('choose') || lowerAnswer.includes('recommend') ||
            lowerAnswer.includes('better option')) {
            return 'decision';
        }
        if (lowerQuery.includes('what is') || lowerQuery.includes('define') ||
            lowerQuery.includes('explain') || lowerAnswer.includes('is a') ||
            lowerAnswer.includes('refers to')) {
            return 'fact';
        }
        if (lowerQuery.includes('why') || lowerQuery.includes('how does') ||
            lowerAnswer.includes('because') || lowerAnswer.includes('reason is')) {
            return 'explanation';
        }
        return 'conversation';
    }
    extractTags(query, answer) {
        const tags = new Set();
        const text = `${query} ${answer}`.toLowerCase();
        // Enhanced domain tags
        const domains = [
            'code', 'programming', 'database', 'api', 'frontend', 'backend',
            'security', 'performance', 'testing', 'deployment', 'design',
            'analytics', 'machine learning', 'ai', 'data', 'cloud', 'devops',
            'mobile', 'web', 'architecture', 'framework', 'library'
        ];
        for (const domain of domains) {
            if (text.includes(domain))
                tags.add(domain);
        }
        // Enhanced language tags
        const languages = [
            'javascript', 'typescript', 'python', 'java', 'go', 'rust', 'c#', 'c++',
            'react', 'vue', 'angular', 'node', 'sql', 'mongodb', 'postgresql',
            'docker', 'kubernetes', 'aws', 'azure', 'gcp'
        ];
        for (const lang of languages) {
            if (text.includes(lang))
                tags.add(lang);
        }
        // Extract potential custom tags from content
        const words = text.split(/\s+/).filter(word => word.length > 4 &&
            !this.isCommonWord(word) &&
            /^[a-z]+$/.test(word));
        // Add top 2 unique words as tags
        words.slice(0, 2).forEach(word => tags.add(word));
        return Array.from(tags).slice(0, 8); // Increased limit for better categorization
    }
    isCommonWord(word) {
        const commonWords = new Set([
            'this', 'that', 'with', 'from', 'have', 'what', 'when', 'where',
            'which', 'there', 'their', 'about', 'would', 'could', 'should'
        ]);
        return commonWords.has(word);
    }
    groupSimilarMemories(memories, similarityThreshold) {
        const groups = [];
        const used = new Set();
        for (const memory of memories) {
            if (used.has(memory.id))
                continue;
            const group = [memory];
            used.add(memory.id);
            for (const other of memories) {
                if (used.has(other.id))
                    continue;
                const similarity = this.calculateMemorySimilarity(memory, other);
                if (similarity >= similarityThreshold) {
                    group.push(other);
                    used.add(other.id);
                }
            }
            if (group.length > 0) {
                groups.push(group);
            }
        }
        return groups;
    }
    calculateMemorySimilarity(m1, m2) {
        let similarity = 0;
        // Tag overlap
        const tags1 = new Set(m1.metadata.tags);
        const tags2 = new Set(m2.metadata.tags);
        const intersection = new Set([...tags1].filter(t => tags2.has(t)));
        const union = new Set([...tags1, ...tags2]);
        const tagSimilarity = union.size > 0 ? intersection.size / union.size : 0;
        similarity += tagSimilarity * 0.4;
        // Type match
        if (m1.metadata.type === m2.metadata.type) {
            similarity += 0.3;
        }
        // Temporal proximity (more forgiving)
        const timeDiff = Math.abs(m1.metadata.timestamp.getTime() - m2.metadata.timestamp.getTime());
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
        const temporalSimilarity = Math.max(0, 1 - daysDiff / 30); // 30-day window
        similarity += temporalSimilarity * 0.3;
        return similarity;
    }
    async applyMemoryExpiration(userId, expirationDays) {
        // This would be implemented based on your database capabilities
        // For now, we rely on the cleanup mechanism
        logger.info('Memory expiration would be applied', { userId, expirationDays });
    }
}
// Export singleton instance
let memoryNodeExecutorInstance = null;
export function getMemoryNodeExecutor() {
    if (!memoryNodeExecutorInstance) {
        memoryNodeExecutorInstance = new MemoryNodeExecutor();
    }
    return memoryNodeExecutorInstance;
}
//# sourceMappingURL=memory-node-executor.service.js.map