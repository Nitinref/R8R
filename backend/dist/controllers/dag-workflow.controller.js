import { WorkflowDagExecutor } from '../services/workflow/dag-executor.service.js';
import { prisma } from '../server.js';
import { logger } from '../utils/logger.js';
export class DAGWorkflowController {
    executor;
    constructor() {
        this.executor = new WorkflowDagExecutor();
    }
    async createWorkflow(req, res) {
        try {
            const { name, description, userId, nodes, connections } = req.body;
            if (!name || !userId) {
                return res.status(400).json({
                    success: false,
                    error: 'Name and userId are required'
                });
            }
            const workflow = await prisma.workflowDag.create({
                data: {
                    name,
                    description,
                    userId,
                    status: 'DRAFT'
                }
            });
            // Create nodes if provided
            if (nodes && Array.isArray(nodes)) {
                for (let i = 0; i < nodes.length; i++) {
                    const node = nodes[i];
                    await prisma.workflowDagNode.create({
                        data: {
                            name: node.name,
                            type: node.type,
                            config: node.config || {},
                            workflowId: workflow.id,
                            order: i
                        }
                    });
                }
            }
            // Create connections if provided
            if (connections && Array.isArray(connections)) {
                const workflowNodes = await prisma.workflowDagNode.findMany({
                    where: { workflowId: workflow.id }
                });
                const nodeMap = new Map(workflowNodes.map(n => [n.name, n.id]));
                for (const connection of connections) {
                    const fromId = nodeMap.get(connection.from);
                    const toId = nodeMap.get(connection.to);
                    if (fromId && toId) {
                        await prisma.workflowDagConnection.create({
                            data: {
                                fromId,
                                toId
                            }
                        });
                    }
                }
            }
            const fullWorkflow = await prisma.workflowDag.findUnique({
                where: { id: workflow.id },
                include: {
                    nodes: {
                        include: {
                            fromEdges: true,
                            toEdges: true
                        }
                    }
                }
            });
            res.json({
                success: true,
                workflow: fullWorkflow,
                message: 'Workflow created successfully'
            });
        }
        catch (error) {
            logger.error('Failed to create workflow', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    async getWorkflows(req, res) {
        try {
            const { userId } = req.query;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'userId query parameter is required'
                });
            }
            const workflows = await prisma.workflowDag.findMany({
                where: { userId: userId },
                include: {
                    nodes: {
                        include: {
                            fromEdges: true,
                            toEdges: true
                        }
                    },
                    runs: {
                        orderBy: { createdAt: 'desc' },
                        take: 5
                    },
                    _count: {
                        select: {
                            nodes: true,
                            runs: true
                        }
                    }
                },
                orderBy: { updatedAt: 'desc' }
            });
            res.json({
                success: true,
                workflows
            });
        }
        catch (error) {
            logger.error('Failed to get workflows', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    async getWorkflow(req, res) {
        try {
            const { id } = req.params;
            const workflow = await prisma.workflowDag.findUnique({
                // @ts-ignore
                where: { id },
                include: {
                    nodes: {
                        include: {
                            fromEdges: true,
                            toEdges: true
                        }
                    },
                    runs: {
                        orderBy: { createdAt: 'desc' },
                        take: 10,
                        include: {
                            nodeRuns: {
                                include: {
                                    node: true
                                }
                            }
                        }
                    }
                }
            });
            if (!workflow) {
                return res.status(404).json({
                    success: false,
                    error: 'Workflow not found'
                });
            }
            res.json({
                success: true,
                workflow
            });
        }
        catch (error) {
            logger.error('Failed to get workflow', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    async executeWorkflow(req, res) {
        try {
            const { workflowId } = req.params;
            const { telegramChatId } = req.body;
            if (!telegramChatId) {
                return res.status(400).json({
                    success: false,
                    error: 'telegramChatId is required for execution'
                });
            }
            // @ts-ignore
            const runId = await this.executor.executeWorkflow(workflowId, parseInt(telegramChatId));
            res.json({
                success: true,
                runId,
                message: 'Workflow execution started'
            });
        }
        catch (error) {
            logger.error('Failed to execute workflow', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    async getWorkflowRun(req, res) {
        try {
            const { runId } = req.params;
            const workflowRun = await prisma.workflowDagRun.findUnique({
                // @ts-ignore
                where: { id: runId },
                include: {
                    workflow: true,
                    nodeRuns: {
                        include: {
                            node: true
                        },
                        orderBy: { startedAt: 'asc' }
                    }
                }
            });
            if (!workflowRun) {
                return res.status(404).json({
                    success: false,
                    error: 'Workflow run not found'
                });
            }
            res.json({
                success: true,
                workflowRun
            });
        }
        catch (error) {
            logger.error('Failed to get workflow run', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    async getWorkflowRuns(req, res) {
        try {
            const { workflowId } = req.params;
            const { limit = 20, offset = 0 } = req.query;
            const runs = await prisma.workflowDagRun.findMany({
                // @ts-ignore
                where: { workflowId },
                include: {
                    nodeRuns: {
                        include: {
                            node: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit),
                skip: parseInt(offset)
            });
            res.json({
                success: true,
                runs
            });
        }
        catch (error) {
            logger.error('Failed to get workflow runs', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    async createExampleWorkflow(req, res) {
        try {
            const { userId, name = 'Customer Support Pipeline' } = req.body;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'userId is required'
                });
            }
            const exampleWorkflow = {
                name,
                description: 'Automated customer query processing with R8R',
                userId,
                nodes: [
                    {
                        name: 'Parse Query',
                        type: 'DATA_PROCESSING',
                        config: {
                            operation: 'transform',
                            data: { "customer_query": "{{input}}" }
                        }
                    },
                    {
                        name: 'Check Memory',
                        type: 'MEMORY_QUERY',
                        config: {
                            query: "{{node1.result.data.customer_query}}",
                            topK: 3
                        }
                    },
                    {
                        name: 'Generate Response',
                        type: 'LLM_QUERY',
                        config: {
                            provider: 'openai',
                            model: 'gpt-4-turbo-preview',
                            prompt: "Customer: {{node1.result.data.customer_query}}\nContext: {{node2.result.memories}}"
                        }
                    },
                    {
                        name: 'Store Interaction',
                        type: 'MEMORY_STORE',
                        config: {
                            query: "{{node1.result.data.customer_query}}",
                            response: "{{node3.result.answer}}",
                            importance: 0.7,
                            type: 'conversation'
                        }
                    },
                    {
                        name: 'Send Notification',
                        type: 'NOTIFICATION',
                        config: {
                            message: "Customer query processed successfully! Response: {{node3.result.answer}}"
                        }
                    }
                ],
                connections: [
                    { from: 'Parse Query', to: 'Check Memory' },
                    { from: 'Check Memory', to: 'Generate Response' },
                    { from: 'Generate Response', to: 'Store Interaction' },
                    { from: 'Store Interaction', to: 'Send Notification' }
                ]
            };
            const result = await this.createWorkflow({ body: exampleWorkflow }, { json: (data) => data });
            res.json(result);
        }
        catch (error) {
            logger.error('Failed to create example workflow', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    async updateWorkflow(req, res) {
        try {
            const { id } = req.params;
            const { name, description, status } = req.body;
            const workflow = await prisma.workflowDag.update({
                // @ts-ignore
                where: { id },
                data: {
                    ...(name && { name }),
                    ...(description && { description }),
                    ...(status && { status })
                }
            });
            res.json({
                success: true,
                workflow,
                message: 'Workflow updated successfully'
            });
        }
        catch (error) {
            logger.error('Failed to update workflow', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    async deleteWorkflow(req, res) {
        try {
            const { id } = req.params;
            await prisma.workflowDag.delete({
                // @ts-ignore
                where: { id }
            });
            res.json({
                success: true,
                message: 'Workflow deleted successfully'
            });
        }
        catch (error) {
            logger.error('Failed to delete workflow', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    async createNode(req, res) {
        try {
            const { workflowId } = req.params;
            const { name, type, config } = req.body;
            const node = await prisma.workflowDagNode.create({
                // @ts-ignore
                data: {
                    name,
                    type,
                    config: config || {},
                    workflowId
                }
            });
            res.json({
                success: true,
                node,
                message: 'Node created successfully'
            });
        }
        catch (error) {
            logger.error('Failed to create node', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    async updateNode(req, res) {
        try {
            const { nodeId } = req.params;
            const { name, config } = req.body;
            const node = await prisma.workflowDagNode.update({
                // @ts-ignore
                where: { id: nodeId },
                data: {
                    ...(name && { name }),
                    ...(config && { config })
                }
            });
            res.json({
                success: true,
                node,
                message: 'Node updated successfully'
            });
        }
        catch (error) {
            logger.error('Failed to update node', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    async deleteNode(req, res) {
        try {
            const { nodeId } = req.params;
            await prisma.workflowDagNode.delete({
                // @ts-ignore
                where: { id: nodeId }
            });
            res.json({
                success: true,
                message: 'Node deleted successfully'
            });
        }
        catch (error) {
            logger.error('Failed to delete node', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    async createConnection(req, res) {
        try {
            const { workflowId } = req.params;
            const { fromId, toId } = req.body;
            const connection = await prisma.workflowDagConnection.create({
                data: {
                    fromId,
                    toId
                }
            });
            res.json({
                success: true,
                connection,
                message: 'Connection created successfully'
            });
        }
        catch (error) {
            logger.error('Failed to create connection', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    async deleteConnection(req, res) {
        try {
            const { connectionId } = req.params;
            await prisma.workflowDagConnection.delete({
                // @ts-ignore
                where: { id: connectionId }
            });
            res.json({
                success: true,
                message: 'Connection deleted successfully'
            });
        }
        catch (error) {
            logger.error('Failed to delete connection', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}
//# sourceMappingURL=dag-workflow.controller.js.map