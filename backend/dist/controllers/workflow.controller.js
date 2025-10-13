import { prisma } from '../server.js';
import { AppError } from '../middleware/error-handler.middleware.js';
import { validateWorkflow } from '../services/workflow/workflow-validator.service.js';
export const createWorkflow = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { name, description, configuration } = req.body;
        // Validate workflow configuration
        const validation = validateWorkflow(configuration);
        if (!validation.valid) {
            throw new AppError(`Invalid workflow: ${validation.errors.join(', ')}`, 400);
        }
        const workflow = await prisma.workflow.create({
            // @ts-ignore
            data: {
                name,
                description,
                userId,
                configuration: configuration,
                status: 'draft'
            }
        });
        // Create analytics record
        await prisma.workflowAnalytics.create({
            data: {
                workflowId: workflow.id
            }
        });
        res.status(201).json({
            workflow,
            message: 'Workflow created successfully'
        });
    }
    catch (error) {
        throw error;
    }
};
export const listWorkflows = async (req, res) => {
    try {
        const userId = req.user.userId;
        const workflows = await prisma.workflow.findMany({
            where: { userId },
            include: {
                analytics: true
            },
            orderBy: { updatedAt: 'desc' }
        });
        res.json({ workflows });
    }
    catch (error) {
        throw error;
    }
};
export const getWorkflow = async (req, res) => {
    try {
        const { workflowId } = req.params;
        const userId = req.user.userId;
        const workflow = await prisma.workflow.findFirst({
            // @ts-ignore
            where: {
                id: workflowId,
                userId
            },
            include: {
                analytics: true
            }
        });
        if (!workflow) {
            throw new AppError('Workflow not found', 404);
        }
        res.json({ workflow });
    }
    catch (error) {
        throw error;
    }
};
export const updateWorkflow = async (req, res) => {
    try {
        const { workflowId } = req.params;
        const userId = req.user.userId;
        const { name, description, configuration, status } = req.body;
        if (configuration) {
            const validation = validateWorkflow(configuration);
            if (!validation.valid) {
                throw new AppError(`Invalid workflow: ${validation.errors.join(', ')}`, 400);
            }
        }
        const workflow = await prisma.workflow.updateMany({
            // @ts-ignore
            where: {
                id: workflowId,
                userId
            },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(configuration && { configuration: configuration }),
                ...(status && { status }),
                updatedAt: new Date()
            }
        });
        if (workflow.count === 0) {
            throw new AppError('Workflow not found', 404);
        }
        res.json({ message: 'Workflow updated successfully' });
    }
    catch (error) {
        throw error;
    }
};
export const deleteWorkflow = async (req, res) => {
    try {
        const { workflowId } = req.params;
        const userId = req.user.userId;
        const deleted = await prisma.workflow.deleteMany({
            // @ts-ignore
            where: {
                id: workflowId,
                userId
            }
        });
        if (deleted.count === 0) {
            throw new AppError('Workflow not found', 404);
        }
        res.json({ message: 'Workflow deleted successfully' });
    }
    catch (error) {
        throw error;
    }
};
export const cloneWorkflow = async (req, res) => {
    try {
        const { workflowId } = req.params;
        const userId = req.user.userId;
        const { name } = req.body;
        const originalWorkflow = await prisma.workflow.findFirst({
            // @ts-ignore
            where: {
                id: workflowId,
                userId
            }
        });
        if (!originalWorkflow) {
            throw new AppError('Workflow not found', 404);
        }
        const clonedWorkflow = await prisma.workflow.create({
            data: {
                name: name || `${originalWorkflow.name} (Copy)`,
                description: originalWorkflow.description,
                userId,
                // @ts-ignore
                configuration: originalWorkflow.configuration,
                status: 'draft'
            }
        });
        // Create analytics record
        await prisma.workflowAnalytics.create({
            data: {
                workflowId: clonedWorkflow.id
            }
        });
        res.status(201).json({
            workflow: clonedWorkflow,
            message: 'Workflow cloned successfully'
        });
    }
    catch (error) {
        throw error;
    }
};
// Activate workflow
export const activateWorkflow = async (req, res) => {
    try {
        const { workflowId } = req.params;
        const userId = req.user.userId;
        const workflow = await prisma.workflow.updateMany({
            // @ts-ignore
            where: {
                id: workflowId,
                userId
            },
            data: {
                status: 'active',
                updatedAt: new Date()
            }
        });
        if (workflow.count === 0) {
            throw new AppError('Workflow not found', 404);
        }
        res.json({ message: 'Workflow activated successfully' });
    }
    catch (error) {
        throw error;
    }
};
// Deactivate workflow
export const deactivateWorkflow = async (req, res) => {
    try {
        const { workflowId } = req.params;
        const userId = req.user.userId;
        const workflow = await prisma.workflow.updateMany({
            // @ts-ignore
            where: {
                id: workflowId,
                userId
            },
            data: {
                status: 'draft',
                updatedAt: new Date()
            }
        });
        if (workflow.count === 0) {
            throw new AppError('Workflow not found', 404);
        }
        res.json({ message: 'Workflow deactivated successfully' });
    }
    catch (error) {
        throw error;
    }
};
// Get workflow stats
export const getWorkflowStats = async (req, res) => {
    try {
        const { workflowId } = req.params;
        const userId = req.user.userId;
        const workflow = await prisma.workflow.findFirst({
            // @ts-ignore
            where: {
                id: workflowId,
                userId
            },
            include: {
                analytics: true
            }
        });
        if (!workflow) {
            throw new AppError('Workflow not found', 404);
        }
        // Get recent queries
        const recentQueries = await prisma.queryLog.findMany({
            // @ts-ignore
            where: { workflowId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
                id: true,
                query: true,
                answer: true,
                confidence: true,
                latency: true,
                status: true,
                createdAt: true
            }
        });
        // Get error rate
        const [totalQueries, errorQueries] = await Promise.all([
            // @ts-ignore
            prisma.queryLog.count({ where: { workflowId } }),
            // @ts-ignore
            prisma.queryLog.count({ where: { workflowId, status: 'error' } })
        ]);
        const errorRate = totalQueries > 0 ? (errorQueries / totalQueries) * 100 : 0;
        res.json({
            workflow: {
                id: workflow.id,
                name: workflow.name,
                status: workflow.status,
                createdAt: workflow.createdAt,
                updatedAt: workflow.updatedAt
            },
            // @ts-ignore
            analytics: workflow.analytics,
            errorRate: errorRate.toFixed(2),
            recentQueries
        });
    }
    catch (error) {
        throw error;
    }
};
//# sourceMappingURL=workflow.controller.js.map