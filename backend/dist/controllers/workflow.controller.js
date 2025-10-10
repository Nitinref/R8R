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
//# sourceMappingURL=workflow.controller.js.map