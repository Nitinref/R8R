import type{ Request, Response } from 'express';
import { prisma } from '../server.js';
import { AppError } from '../middleware/error-handler.middleware.js';
import { WorkflowExecutor } from '../services/workflow/workflow-executor.service.js';
import type{ WorkflowConfig } from '../types/workflow.types.js';

export const executeQuery = async (req: Request, res: Response) => {
  try {
    const { workflowId, query, metadata } = req.body;
    const userId = req.user!.userId;

    if (!workflowId || !query) {
      throw new AppError('workflowId and query are required', 400);
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

    // Execute workflow
    const executor = new WorkflowExecutor();
    const result = await executor.executeWorkflow(
      workflow.configuration as unknown as WorkflowConfig,
      query,
      true
    );

    // Log query
    await prisma.queryLog.create({
        // @ts-ignore
      data: {
        workflowId,
        userId,
        query,
        rewrittenQuery: query, // Would be updated if query rewrite happened
        answer: result.answer,
        sources: result.sources as any,
        confidence: result.confidence,
        latency: result.latency,
        llmsUsed: result.llmsUsed as any,
        retrieversUsed: result.retrieversUsed as any,
        status: 'success',
        metadata: metadata as any
      }
    });

    // Update analytics
    await prisma.workflowAnalytics.update({
      where: { workflowId },
      data: {
        totalQueries: { increment: 1 },
        successfulQueries: { increment: 1 },
        avgLatency: {
          // Moving average calculation
          set: await calculateMovingAverage(workflowId, result.latency, 'latency')
        },
        avgConfidence: {
          set: await calculateMovingAverage(workflowId, result.confidence || 0, 'confidence')
        },
        lastQueryAt: new Date()
      }
    });

    res.json(result);

  } catch (error) {
    // Log failed query
    if (req.body.workflowId) {
      await prisma.queryLog.create({
        data: {
          workflowId: req.body.workflowId,
          userId: req.user!.userId,
          query: req.body.query,
          answer: '',
          sources: [] as any,
          latency: 0,
          llmsUsed: [] as any,
          retrieversUsed: [] as any,
          status: 'error',
        // @ts-ignore
          errorMessage: error.message
        }
      }).catch(() => {});

      await prisma.workflowAnalytics.update({
        where: { workflowId: req.body.workflowId },
        data: {
          totalQueries: { increment: 1 },
          failedQueries: { increment: 1 }
        }
      }).catch(() => {});
    }

    throw error;
  }
};

async function calculateMovingAverage(
  workflowId: string, 
  newValue: number, 
  field: 'latency' | 'confidence'
): Promise<number> {
  const analytics = await prisma.workflowAnalytics.findUnique({
    where: { workflowId }
  });

  if (!analytics) return newValue;

  const currentAvg = field === 'latency' ? analytics.avgLatency : analytics.avgConfidence;
  const totalQueries = analytics.totalQueries;

  // Calculate moving average
  return (currentAvg * totalQueries + newValue) / (totalQueries + 1);
}

export const getQueryHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { workflowId, limit = 50, offset = 0 } = req.query;

    const logs = await prisma.queryLog.findMany({
      where: {
        userId,
        ...(workflowId && { workflowId: workflowId as string })
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      select: {
        id: true,
        query: true,
        answer: true,
        confidence: true,
        latency: true,
        status: true,
        createdAt: true,
        workflow: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json({ logs });
  } catch (error) {
    throw error;
  }
};