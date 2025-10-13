// controllers/analytics.controller.ts - FIXED VERSION
import { prisma } from '../server.js';
import { AppError } from '../middleware/error-handler.middleware.js';
export const getWorkflowAnalytics = async (req, res, next) => {
    try {
        const { workflowId } = req.params;
        const userId = req.user.userId;
        const workflow = await prisma.workflow.findFirst({
            // @ts-ignore
            where: { id: workflowId, userId },
            include: { analytics: true }
        });
        if (!workflow) {
            throw new AppError('Workflow not found', 404);
        }
        // Get recent query trends using proper Prisma query
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const queryLogs = await prisma.queryLog.findMany({
            // @ts-ignore
            where: {
                workflowId,
                createdAt: { gte: sevenDaysAgo }
            },
            select: {
                createdAt: true,
                latency: true,
                confidence: true
            },
            orderBy: { createdAt: 'asc' }
        });
        // Group by date manually
        const dailyStatsMap = new Map();
        queryLogs.forEach(log => {
            const dateKey = log.createdAt.toISOString().split('T')[0];
            // @ts-ignore
            const existing = dailyStatsMap.get(dateKey) || {
                date: dateKey,
                query_count: 0,
                total_latency: 0,
                total_confidence: 0
            };
            existing.query_count++;
            existing.total_latency += log.latency;
            // @ts-ignore
            existing.total_confidence += log.confidence;
            // @ts-ignore
            dailyStatsMap.set(dateKey, existing);
        });
        const dailyStats = Array.from(dailyStatsMap.values()).map(stat => ({
            date: stat.date,
            query_count: stat.query_count,
            avg_latency: stat.total_latency / stat.query_count,
            avg_confidence: stat.total_confidence / stat.query_count
        }));
        res.json({
            // @ts-ignore
            analytics: workflow.analytics,
            dailyStats
        });
    }
    catch (error) {
        next(error);
    }
};
export const getDashboardStats = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const [totalWorkflows, activeWorkflows, totalQueries, recentQueries] = await Promise.all([
            prisma.workflow.count({ where: { userId } }),
            prisma.workflow.count({ where: { userId, status: 'active' } }),
            prisma.queryLog.count({ where: { userId } }),
            prisma.queryLog.count({
                where: {
                    userId,
                    createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                }
            })
        ]);
        const avgMetrics = await prisma.queryLog.aggregate({
            where: { userId },
            _avg: {
                latency: true,
                confidence: true
            }
        });
        res.json({
            totalWorkflows,
            activeWorkflows,
            totalQueries,
            recentQueries,
            avgLatency: avgMetrics._avg.latency || 0,
            avgConfidence: avgMetrics._avg.confidence || 0
        });
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=analytics.controller.js.map