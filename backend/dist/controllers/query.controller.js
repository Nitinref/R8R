import { prisma } from '../server.js';
import { AppError } from '../middleware/error-handler.middleware.js';
import { WorkflowExecutor } from '../services/workflow/workflow-executor.service.js';
import { logger } from '../utils/logger.js';
// Execute a query against an active workflow
export const executeQuery = async (req, res) => {
    try {
        const { workflowId, query, metadata } = req.body;
        // @ts-ignore - Assuming user is attached to request by auth middleware
        const userId = req.user?.userId;
        if (!userId) {
            throw new AppError('Authentication required', 401);
        }
        if (!workflowId || !query) {
            throw new AppError('workflowId and query are required', 400);
        }
        if (typeof query !== 'string' || !query.trim()) {
            throw new AppError('Query cannot be empty', 400);
        }
        // Get workflow with proper typing
        const workflow = await prisma.workflow.findFirst({
            where: {
                id: workflowId,
                userId,
                status: 'active'
            }
        });
        if (!workflow) {
            throw new AppError('Workflow not found or not active', 404);
        }
        logger.info('Executing query', { workflowId, userId, queryLength: query.length });
        // Execute workflow
        const executor = new WorkflowExecutor();
        // @ts-ignore
        const workflowConfig = workflow.configuration;
        const result = await executor.executeWorkflow(workflowConfig, query.trim(), true // Use cache
        );
        // Log successful query with proper typing
        await prisma.queryLog.create({
            data: {
                workflowId,
                userId,
                query: query.trim(),
                rewrittenQuery: query.trim(), // This should come from the execution context
                answer: result.answer,
                sources: result.sources || [],
                confidence: result.confidence || 0,
                latency: result.latency,
                llmsUsed: result.llmsUsed || [],
                retrieversUsed: result.retrieversUsed || [],
                status: 'success',
                metadata: metadata || {}
            }
        });
        // Update analytics
        await updateWorkflowAnalytics(workflowId, result);
        res.json({
            ...result,
            workflowId,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        logger.error('Query execution failed', {
            error: errorMessage,
            workflowId: req.body.workflowId,
            userId: req.user?.userId
        });
        // Log failed query
        if (req.body.workflowId && req.user?.userId) {
            try {
                await prisma.queryLog.create({
                    data: {
                        workflowId: req.body.workflowId,
                        userId: req.user.userId,
                        query: req.body.query || '',
                        answer: '',
                        sources: [],
                        confidence: 0,
                        latency: 0,
                        llmsUsed: [],
                        retrieversUsed: [],
                        status: 'error',
                        errorMessage: errorMessage.substring(0, 500) // Limit error message length
                    }
                });
                await prisma.workflowAnalytics.update({
                    where: { workflowId: req.body.workflowId },
                    data: {
                        totalQueries: { increment: 1 },
                        failedQueries: { increment: 1 },
                        lastQueryAt: new Date()
                    }
                });
            }
            catch (logError) {
                logger.error('Failed to log error query', { error: logError });
            }
        }
        // Re-throw the error for the error handler middleware
        throw error;
    }
};
// TEST WORKFLOW - Execute without saving to DB
export const testWorkflow = async (req, res) => {
    try {
        const { configuration, query } = req.body;
        // @ts-ignore
        const userId = req.user?.userId;
        if (!userId) {
            throw new AppError('Authentication required', 401);
        }
        if (!configuration || !query) {
            throw new AppError('configuration and query are required', 400);
        }
        if (typeof query !== 'string' || !query.trim()) {
            throw new AppError('Query cannot be empty', 400);
        }
        // Validate configuration structure
        if (typeof configuration !== 'object' || !configuration.steps || !Array.isArray(configuration.steps)) {
            throw new AppError('Invalid workflow configuration', 400);
        }
        logger.info('Testing workflow', { userId, queryLength: query.length });
        // Execute workflow without caching
        const executor = new WorkflowExecutor();
        const result = await executor.executeWorkflow(configuration, query.trim(), false // Don't use cache for testing
        );
        res.json({
            ...result,
            message: 'Workflow test successful',
            cached: false,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        logger.error('Workflow test failed', {
            error: errorMessage,
            userId: req.user?.userId
        });
        throw error;
    }
};
// Get query history with filtering
export const getQueryHistory = async (req, res) => {
    try {
        // @ts-ignore
        const userId = req.user?.userId;
        if (!userId) {
            throw new AppError('Authentication required', 401);
        }
        const { workflowId, limit = 50, offset = 0, status, startDate, endDate } = req.query;
        // Validate and parse parameters
        const parsedLimit = Math.min(parseInt(limit) || 50, 100); // Max 100
        const parsedOffset = Math.max(parseInt(offset) || 0, 0);
        const where = { userId };
        if (workflowId) {
            where.workflowId = workflowId;
        }
        if (status && ['success', 'error'].includes(status)) {
            where.status = status;
        }
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                const start = new Date(startDate);
                if (isNaN(start.getTime())) {
                    throw new AppError('Invalid startDate format', 400);
                }
                where.createdAt.gte = start;
            }
            if (endDate) {
                const end = new Date(endDate);
                if (isNaN(end.getTime())) {
                    throw new AppError('Invalid endDate format', 400);
                }
                where.createdAt.lte = end;
            }
        }
        const [logs, total] = await Promise.all([
            prisma.queryLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: parsedLimit,
                skip: parsedOffset,
                select: {
                    id: true,
                    query: true,
                    answer: true,
                    confidence: true,
                    latency: true,
                    status: true,
                    errorMessage: true,
                    createdAt: true,
                    workflow: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            }),
            prisma.queryLog.count({ where })
        ]);
        res.json({
            logs,
            total,
            limit: parsedLimit,
            offset: parsedOffset,
            hasMore: total > parsedOffset + parsedLimit
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        logger.error('Failed to fetch query history', { error: errorMessage });
        throw error;
    }
};
// Get detailed query log
export const getQueryDetail = async (req, res) => {
    try {
        const { queryId } = req.params;
        // @ts-ignore
        const userId = req.user?.userId;
        if (!userId) {
            throw new AppError('Authentication required', 401);
        }
        if (!queryId) {
            throw new AppError('queryId is required', 400);
        }
        const queryLog = await prisma.queryLog.findFirst({
            where: {
                id: queryId,
                userId
            },
            include: {
                workflow: {
                    select: {
                        id: true,
                        name: true,
                        configuration: true
                    }
                }
            }
        });
        if (!queryLog) {
            throw new AppError('Query log not found', 404);
        }
        res.json({ queryLog });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        logger.error('Failed to fetch query detail', { error: errorMessage });
        throw error;
    }
};
// Helper function to update workflow analytics
async function updateWorkflowAnalytics(workflowId, result) {
    try {
        const analytics = await prisma.workflowAnalytics.findUnique({
            where: { workflowId }
        });
        const confidence = result.confidence || 0;
        const latency = result.latency;
        if (!analytics) {
            await prisma.workflowAnalytics.create({
                data: {
                    workflowId,
                    totalQueries: 1,
                    successfulQueries: 1,
                    failedQueries: 0,
                    avgLatency: latency,
                    avgConfidence: confidence,
                    lastQueryAt: new Date()
                }
            });
            return;
        }
        // Calculate moving averages
        const totalSuccessful = analytics.successfulQueries + 1;
        const totalAllQueries = analytics.totalQueries + 1;
        const newAvgLatency = (analytics.avgLatency * analytics.successfulQueries + latency) / totalSuccessful;
        const newAvgConfidence = (analytics.avgConfidence * analytics.successfulQueries + confidence) / totalSuccessful;
        await prisma.workflowAnalytics.update({
            where: { workflowId },
            data: {
                totalQueries: totalAllQueries,
                successfulQueries: totalSuccessful,
                avgLatency: newAvgLatency,
                avgConfidence: newAvgConfidence,
                lastQueryAt: new Date()
            }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        logger.error('Failed to update analytics', {
            error: errorMessage,
            workflowId
        });
        // Don't throw - analytics update shouldn't fail the query
    }
}
// Batch query execution
export const executeBatchQueries = async (req, res) => {
    try {
        const { workflowId, queries } = req.body;
        // @ts-ignore
        const userId = req.user?.userId;
        if (!userId) {
            throw new AppError('Authentication required', 401);
        }
        if (!workflowId || !queries || !Array.isArray(queries)) {
            throw new AppError('workflowId and queries array are required', 400);
        }
        if (queries.length === 0) {
            throw new AppError('Queries array cannot be empty', 400);
        }
        if (queries.length > 10) {
            throw new AppError('Maximum 10 queries per batch', 400);
        }
        // Validate all queries
        for (const query of queries) {
            if (typeof query !== 'string' || !query.trim()) {
                throw new AppError('All queries must be non-empty strings', 400);
            }
        }
        // Get workflow
        const workflow = await prisma.workflow.findFirst({
            where: {
                id: workflowId,
                userId,
                status: 'active'
            }
        });
        if (!workflow) {
            throw new AppError('Workflow not found or not active', 404);
        }
        const executor = new WorkflowExecutor();
        // @ts-ignore
        const workflowConfig = workflow.configuration;
        const results = [];
        // Execute queries sequentially to avoid overwhelming the system
        for (const query of queries) {
            try {
                const result = await executor.executeWorkflow(workflowConfig, query.trim(), true);
                results.push({
                    query,
                    success: true,
                    result
                });
                // Log successful query
                await prisma.queryLog.create({
                    data: {
                        workflowId,
                        userId,
                        query: query.trim(),
                        rewrittenQuery: query.trim(),
                        answer: result.answer,
                        sources: result.sources || [],
                        confidence: result.confidence || 0,
                        latency: result.latency,
                        llmsUsed: result.llmsUsed || [],
                        retrieversUsed: result.retrieversUsed || [],
                        status: 'success'
                    }
                });
                await updateWorkflowAnalytics(workflowId, result);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                results.push({
                    query,
                    success: false,
                    error: errorMessage
                });
                // Log failed query
                try {
                    await prisma.queryLog.create({
                        data: {
                            workflowId,
                            userId,
                            query: query.trim(),
                            answer: '',
                            sources: [],
                            confidence: 0,
                            latency: 0,
                            llmsUsed: [],
                            retrieversUsed: [],
                            status: 'error',
                            errorMessage: errorMessage.substring(0, 500)
                        }
                    });
                }
                catch (logError) {
                    logger.error('Failed to log batch error', { error: logError });
                }
            }
        }
        const successfulCount = results.filter(r => r.success).length;
        res.json({
            results,
            summary: {
                total: queries.length,
                successful: successfulCount,
                failed: queries.length - successfulCount,
                successRate: (successfulCount / queries.length) * 100
            },
            workflowId,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        logger.error('Batch query execution failed', {
            error: errorMessage,
            workflowId: req.body.workflowId,
            userId: req.user?.userId
        });
        throw error;
    }
};
//# sourceMappingURL=query.controller.js.map