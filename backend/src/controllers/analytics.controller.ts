
import express from 'express';
import { prisma } from '../server.js';

export const getWorkflowAnalytics = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { workflowId } = req.params;
    // @ts-ignore
    const userId = req.user!.userId;

    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, userId },
      include: { analytics: true }
    });

    if (!workflow) {
        // @ts-ignore
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Get recent query trends
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyStats = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as query_count,
        AVG(latency) as avg_latency,
        AVG(confidence) as avg_confidence
      FROM "QueryLog"
      WHERE workflow_id = ${workflowId}
        AND created_at >= ${sevenDaysAgo}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // @ts-ignore
    res.json({
      analytics: workflow.analytics,
      dailyStats
    });
  } catch (error) {
    throw error;
  }
};

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user!.userId;

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

    // @ts-ignore
    res.json({
      totalWorkflows,
      activeWorkflows,
      totalQueries,
      recentQueries,
      avgLatency: avgMetrics._avg.latency || 0,
      avgConfidence: avgMetrics._avg.confidence || 0
    });
  } catch (error) {
    throw error;
  }
};
