// services/workflow/dag-executor.service.ts
import { prisma } from '../../server.js';
import { logger } from '../../utils/logger.js';
import { getTelegramBot } from '../telegram/telegram-bot.service.js';
import { WorkflowNodeType, WorkflowNodeRunStatus } from '../../../generated/prisma/index.js';
export class WorkflowDagExecutor {
    telegramBot;
    maxConcurrency = 3;
    constructor(telegramBot) {
        this.telegramBot = telegramBot || getTelegramBot();
    }
    async executeWorkflow(workflowId, telegramChatId) {
        const startTime = Date.now();
        try {
            const workflow = await prisma.workflowDag.findUnique({
                where: { id: workflowId },
                include: {
                    nodes: {
                        include: {
                            fromEdges: true,
                            toEdges: true
                        }
                    },
                    user: {
                        select: { id: true }
                    }
                }
            });
            if (!workflow) {
                throw new Error('Workflow not found');
            }
            const userId = workflow.user.id;
            logger.info('Starting DAG workflow execution', {
                workflowId,
                name: workflow.name,
                nodeCount: workflow.nodes.length,
                userId
            });
            await this.telegramBot.sendNotification(telegramChatId, `🚀 *Workflow Started*\n\nName: ${workflow.name}\nNodes: ${workflow.nodes.length}`, 'Markdown');
            const workflowRun = await prisma.workflowDagRun.create({
                data: {
                    workflowId,
                    status: 'RUNNING',
                    startedAt: new Date()
                }
            });
            const executionGraph = this.buildExecutionGraph(workflow.nodes, userId);
            const startNodes = Array.from(executionGraph.values())
                .filter(node => node.dependencies.length === 0);
            if (startNodes.length === 0) {
                throw new Error('No start nodes found. Workflow must have at least one node with no incoming edges.');
            }
            logger.info('Execution graph built', {
                totalNodes: executionGraph.size,
                startNodes: startNodes.length
            });
            const result = await this.executeDAG(executionGraph, startNodes, workflowRun.id, telegramChatId);
            await prisma.workflowDagRun.update({
                where: { id: workflowRun.id },
                data: {
                    status: result.status,
                    finishedAt: new Date(),
                    //   @ts-ignore
                    result: result
                }
            });
            const duration = Date.now() - startTime;
            if (result.status === 'COMPLETED') {
                await this.telegramBot.sendNotification(telegramChatId, `✅ *Workflow Completed Successfully!*\n\n` +
                    `Name: ${workflow.name}\n` +
                    `Duration: ${duration}ms\n` +
                    `Nodes Executed: ${result.nodesExecuted}`, 'Markdown');
            }
            else {
                await this.telegramBot.sendNotification(telegramChatId, `❌ *Workflow Failed!*\n\n` +
                    `Name: ${workflow.name}\n` +
                    `Duration: ${duration}ms\n` +
                    `Error: ${result.error}`, 'Markdown');
            }
            logger.info('Workflow execution completed', {
                workflowId,
                status: result.status,
                duration
            });
            return { ...result, duration };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            logger.error('Workflow execution failed', { error, workflowId });
            await this.telegramBot.sendNotification(telegramChatId, `❌ *Workflow Execution Error*\n\n${error.message}`, 'Markdown');
            return {
                status: 'FAILED',
                duration,
                nodesExecuted: 0,
                error: error.message
            };
        }
    }
    async executeDAG(graph, startNodes, workflowRunId, telegramChatId) {
        const completedNodes = new Set();
        const failedNodes = new Set();
        const readyQueue = [...startNodes];
        const runningNodes = new Map();
        let nodesExecuted = 0;
        while (readyQueue.length > 0 || runningNodes.size > 0) {
            while (readyQueue.length > 0 && runningNodes.size < this.maxConcurrency) {
                const node = readyQueue.shift();
                const executionPromise = this.executeNode(node, graph, workflowRunId, telegramChatId).then(success => {
                    if (success) {
                        completedNodes.add(node.nodeId);
                        nodesExecuted++;
                        const readyDependents = this.getReadyDependents(node, graph, completedNodes, failedNodes);
                        readyQueue.push(...readyDependents);
                    }
                    else {
                        failedNodes.add(node.nodeId);
                        this.markDownstreamAsFailed(node, graph, failedNodes);
                    }
                    runningNodes.delete(node.nodeId);
                }).catch(error => {
                    logger.error('Node execution threw error', { nodeId: node.nodeId, error });
                    failedNodes.add(node.nodeId);
                    runningNodes.delete(node.nodeId);
                });
                runningNodes.set(node.nodeId, executionPromise);
            }
            if (runningNodes.size > 0) {
                await Promise.race(Array.from(runningNodes.values()));
            }
            if (readyQueue.length === 0 && runningNodes.size === 0) {
                break;
            }
        }
        const totalNodes = graph.size;
        const status = failedNodes.size > 0
            ? 'FAILED'
            : completedNodes.size === totalNodes
                ? 'COMPLETED'
                : 'FAILED';
        //   @ts-ignore
        return {
            status,
            duration: 0,
            nodesExecuted,
            error: failedNodes.size > 0
                ? `${failedNodes.size} node(s) failed`
                : undefined
        };
    }
    async executeNode(node, graph, workflowRunId, telegramChatId) {
        const startTime = Date.now();
        try {
            logger.info('Starting node execution', {
                nodeId: node.nodeId,
                name: node.name,
                type: node.type
            });
            await this.telegramBot.sendNotification(telegramChatId, `⚙️ *Node Started*\n\nName: ${node.name}\nType: ${node.type}`, 'Markdown');
            const nodeRun = await prisma.workflowDagNodeRun.create({
                data: {
                    nodeId: node.nodeId,
                    workflowRunId,
                    status: 'RUNNING',
                    startedAt: new Date(),
                    logs: [`Node started at ${new Date().toISOString()}`]
                }
            });
            let result;
            let success = true;
            try {
                result = await this.executeNodeByType(node, graph);
                await prisma.workflowDagNodeRun.update({
                    where: { id: nodeRun.id },
                    data: {
                        status: 'COMPLETED',
                        finishedAt: new Date(),
                        result,
                        logs: {
                            push: [
                                `Node completed successfully at ${new Date().toISOString()}`,
                                `Duration: ${Date.now() - startTime}ms`
                            ]
                        }
                    }
                });
                node.status = 'COMPLETED';
                node.result = result;
                node.finishedAt = new Date();
                await this.telegramBot.sendNotification(telegramChatId, `✅ *Node Completed*\n\nName: ${node.name}\nDuration: ${Date.now() - startTime}ms`, 'Markdown');
                logger.info('Node execution completed', {
                    nodeId: node.nodeId,
                    name: node.name,
                    duration: Date.now() - startTime
                });
            }
            catch (error) {
                success = false;
                const errorMessage = error.message;
                await prisma.workflowDagNodeRun.update({
                    where: { id: nodeRun.id },
                    data: {
                        status: 'FAILED',
                        finishedAt: new Date(),
                        error: errorMessage,
                        logs: {
                            push: [
                                `Node failed at ${new Date().toISOString()}`,
                                `Error: ${errorMessage}`
                            ]
                        }
                    }
                });
                node.status = 'FAILED';
                node.error = errorMessage;
                node.finishedAt = new Date();
                await this.telegramBot.sendNotification(telegramChatId, `❌ *Node Failed*\n\nName: ${node.name}\nError: ${errorMessage}`, 'Markdown');
                logger.error('Node execution failed', {
                    nodeId: node.nodeId,
                    name: node.name,
                    error: errorMessage
                });
            }
            return success;
        }
        catch (error) {
            logger.error('Node execution error', { error, nodeId: node.nodeId });
            return false;
        }
    }
    async executeNodeByType(node, graph) {
        switch (node.type) {
            case 'LLM_QUERY':
                return await this.executeLLMQuery(node);
            case 'MEMORY_QUERY':
                return await this.executeMemoryQuery(node);
            case 'MEMORY_STORE':
                return await this.executeMemoryStore(node);
            case 'DOCUMENT_RETRIEVAL':
                return await this.executeDocumentRetrieval(node);
            case 'API_CALL':
                return await this.executeApiCall(node);
            case 'CONDITIONAL':
                return await this.executeConditional(node, graph);
            case 'NOTIFICATION':
                return await this.executeNotification(node);
            case 'DATA_PROCESSING':
                return await this.executeDataProcessing(node);
            case 'CUSTOM_SCRIPT':
                return await this.executeCustomScript(node);
            case 'DELAY':
                return await this.executeDelay(node);
            case 'WEBHOOK':
                return await this.executeWebhook(node);
            default:
                throw new Error(`Unsupported node type: ${node.type}`);
        }
    }
    async executeLLMQuery(node) {
        const { provider, model, prompt, temperature = 0.7 } = node.config;
        logger.info('Executing LLM query', { provider, model });
        // Simulate LLM call for now
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
            response: `Simulated response for: ${prompt}`,
            model,
            provider,
            tokensUsed: 150
        };
    }
    async executeMemoryQuery(node) {
        const { query, topK = 5, userId } = node.config;
        if (!userId) {
            throw new Error('User ID required for memory query');
        }
        try {
            const memories = await prisma.memory.findMany({
                where: {
                    userId,
                    OR: [
                        { query: { contains: query, mode: 'insensitive' } },
                        { response: { contains: query, mode: 'insensitive' } }
                    ]
                },
                orderBy: {
                    importance: 'desc',
                    lastAccessed: 'desc'
                },
                take: topK
            });
            if (memories.length > 0) {
                await prisma.memory.updateMany({
                    where: { id: { in: memories.map(m => m.id) } },
                    data: {
                        accessCount: { increment: 1 },
                        lastAccessed: new Date()
                    }
                });
            }
            return {
                memories: memories.map(m => ({
                    id: m.id,
                    query: m.query,
                    response: m.response.substring(0, 200) + '...',
                    importance: m.importance,
                    type: m.type
                })),
                count: memories.length,
                query
            };
        }
        catch (error) {
            logger.error('Memory query failed', { error, userId, query });
            throw new Error(`Memory query failed: ${error.message}`);
        }
    }
    async executeMemoryStore(node) {
        const { query, response, userId, importance = 0.5, type = 'conversation' } = node.config;
        if (!userId) {
            throw new Error('User ID required for memory storage');
        }
        try {
            const memory = await prisma.memory.create({
                data: {
                    userId,
                    workflowId: node.config.workflowId,
                    query,
                    response,
                    importance,
                    type,
                    embedding: []
                }
            });
            return {
                memoryId: memory.id,
                storedAt: new Date().toISOString(),
                importance,
                type
            };
        }
        catch (error) {
            logger.error('Memory storage failed', { error, userId });
            throw new Error(`Memory storage failed: ${error.message}`);
        }
    }
    async executeDocumentRetrieval(node) {
        const { query, topK = 10 } = node.config;
        logger.info('Executing document retrieval', { query, topK });
        // Simulate document retrieval
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
            documents: [
                {
                    id: 'doc_1',
                    filename: 'example.pdf',
                    content: `Relevant content about: ${query}`,
                    score: 0.85
                }
            ],
            count: 1,
            query
        };
    }
    async executeApiCall(node) {
        const { url, method = 'GET', headers = {}, body } = node.config;
        logger.info('Executing API call', { url, method });
        try {
            //   @ts-ignore
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                body: body ? JSON.stringify(body) : undefined
            });
            if (!response.ok) {
                throw new Error(`API call failed: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            return {
                data,
                status: response.status,
                url
            };
        }
        catch (error) {
            throw new Error(`API call error: ${error.message}`);
        }
    }
    async executeConditional(node, graph) {
        const { condition } = node.config;
        const dependencyResults = node.dependencies.map(depId => {
            const dep = graph.get(depId);
            return {
                nodeId: depId,
                nodeName: dep?.name,
                success: dep?.status === 'COMPLETED',
                result: dep?.result
            };
        });
        let conditionMet = false;
        if (condition === 'all_success') {
            conditionMet = dependencyResults.every(dep => dep.success);
        }
        else if (condition === 'any_success') {
            conditionMet = dependencyResults.some(dep => dep.success);
        }
        else {
            conditionMet = dependencyResults.every(dep => dep.success);
        }
        return {
            conditionMet,
            conditionType: condition,
            totalDependencies: dependencyResults.length,
            successfulDependencies: dependencyResults.filter(dep => dep.success).length
        };
    }
    async executeNotification(node) {
        const { message, chatId } = node.config;
        if (chatId) {
            await this.telegramBot.sendNotification(chatId, `📢 ${message}`);
            return { sent: true, type: 'telegram', message };
        }
        return { sent: false };
    }
    async executeDataProcessing(node) {
        const { operation, data } = node.config;
        logger.info('Executing data processing', { operation });
        switch (operation) {
            case 'transform':
                return { processed: true, original: data, timestamp: new Date().toISOString() };
            case 'filter':
                return { filtered: Array.isArray(data) ? data.filter(item => item) : data };
            default:
                return { data };
        }
    }
    async executeCustomScript(node) {
        const { script } = node.config;
        logger.info('Executing custom script');
        // In production, use a proper sandboxed environment
        // This is just a simulation
        await new Promise(resolve => setTimeout(resolve, 300));
        return {
            executed: true,
            result: 'Custom script executed successfully',
            scriptLength: script.length
        };
    }
    async executeDelay(node) {
        const { duration = 1000 } = node.config;
        logger.info('Executing delay', { duration });
        await new Promise(resolve => setTimeout(resolve, duration));
        return { delayed: duration };
    }
    async executeWebhook(node) {
        const { url, payload } = node.config;
        logger.info('Executing webhook', { url });
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return {
                status: response.status,
                success: response.ok,
                url
            };
        }
        catch (error) {
            throw new Error(`Webhook error: ${error.message}`);
        }
    }
    buildExecutionGraph(nodes, userId) {
        const graph = new Map();
        for (const node of nodes) {
            const nodeConfig = {
                ...node.config,
                userId,
                workflowId: node.workflowId
            };
            graph.set(node.id, {
                nodeId: node.id,
                name: node.name,
                type: node.type,
                config: nodeConfig,
                dependencies: node.toEdges.map((e) => e.fromId),
                dependents: node.fromEdges.map((e) => e.toId),
                status: 'PENDING'
            });
        }
        this.validateDAG(graph);
        return graph;
    }
    validateDAG(graph) {
        const visited = new Set();
        const recursionStack = new Set();
        const hasCycle = (nodeId) => {
            if (recursionStack.has(nodeId))
                return true;
            if (visited.has(nodeId))
                return false;
            visited.add(nodeId);
            recursionStack.add(nodeId);
            const node = graph.get(nodeId);
            if (node) {
                for (const dependentId of node.dependents) {
                    if (hasCycle(dependentId))
                        return true;
                }
            }
            recursionStack.delete(nodeId);
            return false;
        };
        for (const nodeId of graph.keys()) {
            if (hasCycle(nodeId)) {
                throw new Error('Cycle detected in workflow DAG');
            }
        }
    }
    getReadyDependents(node, graph, completedNodes, failedNodes) {
        const ready = [];
        for (const dependentId of node.dependents) {
            const dependent = graph.get(dependentId);
            if (!dependent)
                continue;
            if (completedNodes.has(dependentId) || failedNodes.has(dependentId)) {
                continue;
            }
            const allDepsCompleted = dependent.dependencies.every(depId => completedNodes.has(depId));
            const anyDepFailed = dependent.dependencies.some(depId => failedNodes.has(depId));
            if (allDepsCompleted && !anyDepFailed) {
                ready.push(dependent);
            }
        }
        return ready;
    }
    markDownstreamAsFailed(node, graph, failedNodes) {
        const queue = [...node.dependents];
        const visited = new Set();
        while (queue.length > 0) {
            const nodeId = queue.shift();
            if (visited.has(nodeId))
                continue;
            visited.add(nodeId);
            failedNodes.add(nodeId);
            const dependent = graph.get(nodeId);
            if (dependent) {
                queue.push(...dependent.dependents);
            }
        }
    }
}
//# sourceMappingURL=dag-executor.service.js.map