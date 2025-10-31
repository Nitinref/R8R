// services/telegram/telegram-bot.service.ts
import TelegramBot from 'node-telegram-bot-api';
import { prisma } from '../../server.js';
import { logger } from '../../utils/logger.js';
import { WorkflowExecutor } from '../workflow/workflow-executor.service.js';
import { v4 as uuidv4 } from 'uuid';
import { type } from 'os';
export class TelegramBotService {
    bot;
    sessions = new Map();
    userMapping = new Map();
    sessionTimeouts = new Map();
    userRateLimits = new Map();
    workflowExecutor;
    constructor(token) {
        const botToken = token || process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
            throw new Error('TELEGRAM_BOT_TOKEN not configured');
        }
        this.bot = new TelegramBot(botToken, { polling: true });
        this.workflowExecutor = new WorkflowExecutor();
        // Disable HTML parsing to prevent issues with special characters
        const originalSendMessage = this.bot.sendMessage.bind(this.bot);
        this.bot.sendMessage = (chatId, text, options = {}) => {
            return originalSendMessage(chatId, text, {
                ...options,
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            });
        };
        this.setupHandlers();
        this.startCleanupJobs();
        logger.info('Telegram bot initialized successfully');
    }
    setupHandlers() {
        // Start command
        this.bot.onText(/\/start/, async (msg) => {
            await this.handleStart(msg);
        });
        // Create workflow command
        this.bot.onText(/\/create/, async (msg) => {
            await this.handleCreateWorkflow(msg);
        });
        // List workflows command
        this.bot.onText(/\/list/, async (msg) => {
            await this.handleListWorkflows(msg);
        });
        // Run workflow command
        this.bot.onText(/\/run (.+)/, async (msg, match) => {
            await this.handleRunWorkflow(msg, match?.[1]);
        });
        // Query command
        this.bot.onText(/\/query (.+)/, async (msg, match) => {
            await this.handleDirectQuery(msg, match?.[1]);
        });
        // Cancel command
        this.bot.onText(/\/cancel/, async (msg) => {
            await this.handleCancelCreation(msg);
        });
        // Register command
        this.bot.onText(/\/register (.+) (.+) (.+)/, async (msg, match) => {
            await this.handleRegister(msg, match);
        });
        // Login command
        this.bot.onText(/\/login (.+) (.+)/, async (msg, match) => {
            await this.handleLogin(msg, match);
        });
        // Link account with API key
        this.bot.onText(/\/link (.+)/, async (msg, match) => {
            await this.handleLinkAccount(msg, match);
        });
        // Delete workflow command
        this.bot.onText(/\/delete (.+)/, async (msg, match) => {
            // @ts-ignore
            await this.handleDeleteWorkflow(msg, match?.[1]);
        });
        // Status command
        this.bot.onText(/\/status/, async (msg) => {
            await this.handleStatus(msg);
        });
        // Help command
        this.bot.onText(/\/help/, async (msg) => {
            await this.handleHelp(msg);
        });
        // Debug user command
        this.bot.onText(/\/debuguser (.+)/, async (msg, match) => {
            await this.handleDebugUser(msg, match);
        });
        // Handle text messages
        this.bot.on('message', async (msg) => {
            if (msg.text?.startsWith('/'))
                return;
            await this.handleMessage(msg);
        });
        // Error handling
        this.bot.on('polling_error', (error) => {
            logger.error('Telegram polling error:', error);
        });
        this.bot.on('error', (error) => {
            logger.error('Telegram bot error:', error);
        });
        logger.info('Telegram bot handlers registered');
    }
    startCleanupJobs() {
        // Clean up abandoned sessions every hour
        setInterval(() => {
            this.cleanupAbandonedSessions();
        }, 60 * 60 * 1000);
        // Clean up rate limits every hour
        setInterval(() => {
            this.cleanupOldRateLimits();
        }, 60 * 60 * 1000);
    }
    cleanupAbandonedSessions() {
        const now = Date.now();
        const abandonedTimeout = 2 * 60 * 60 * 1000; // 2 hours
        for (const [chatId, session] of this.sessions.entries()) {
            if (now - session.createdAt > abandonedTimeout) {
                this.cleanupSession(chatId);
                logger.info('Cleaned up abandoned session', { chatId });
            }
        }
    }
    cleanupOldRateLimits() {
        const now = Date.now();
        const rateLimitTimeout = 24 * 60 * 60 * 1000; // 24 hours
        for (const [chatId, rateLimit] of this.userRateLimits.entries()) {
            if (now - rateLimit.lastReset > rateLimitTimeout) {
                this.userRateLimits.delete(chatId);
            }
        }
    }
    cleanupSession(chatId) {
        this.sessions.delete(chatId);
        const timeout = this.sessionTimeouts.get(chatId);
        if (timeout) {
            clearTimeout(timeout);
            this.sessionTimeouts.delete(chatId);
        }
    }
    isRateLimited(chatId) {
        const now = Date.now();
        const userLimit = this.userRateLimits.get(chatId);
        // Reset counter every minute
        if (!userLimit || now - userLimit.lastReset > 60000) {
            this.userRateLimits.set(chatId, {
                count: 1,
                lastReset: now,
                lastMessageTime: now
            });
            return { limited: false };
        }
        // Check message frequency (max 1 message per second)
        if (now - userLimit.lastMessageTime < 1000) {
            return {
                limited: true,
                message: '⚠️ Please wait a moment between messages'
            };
        }
        userLimit.count++;
        userLimit.lastMessageTime = now;
        // Max 30 requests per minute
        if (userLimit.count > 30) {
            return {
                limited: true,
                message: '⚠️ Rate limit exceeded. Please wait a minute before sending more messages.'
            };
        }
        return { limited: false };
    }
    async handleDebugUser(msg, match) {
        const chatId = msg.chat.id;
        // Rate limiting
        const rateLimit = this.isRateLimited(chatId);
        if (rateLimit.limited) {
            await this.bot.sendMessage(chatId, rateLimit.message);
            return;
        }
        if (!match || !match[1]) {
            await this.bot.sendMessage(chatId, 'Usage: /debuguser <email>');
            return;
        }
        const email = match[1].trim();
        try {
            const user = await prisma.user.findUnique({
                where: { email },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    password: true,
                    createdAt: true,
                    workflows: { select: { id: true, name: true, status: true } },
                    apiKeys: { select: { name: true, createdAt: true } }
                }
            });
            if (!user) {
                await this.bot.sendMessage(chatId, `❌ User with email "${email}" not found in database`);
                return;
            }
            await this.bot.sendMessage(chatId, `🔍 *User Found:*\n` +
                `*ID:* ${user.id}\n` +
                `*Name:* ${user.name}\n` +
                `*Email:* ${user.email}\n` +
                `*Created:* ${user.createdAt.toLocaleDateString()}\n` +
                `*Workflows:* ${user.workflows.length}\n` +
                `*API Keys:* ${user.apiKeys.length}\n` +
                `*Password Hash:* ${user.password.substring(0, 20)}...\n` +
                `*Hash Length:* ${user.password.length} characters`);
        }
        catch (error) {
            logger.error('Debug user failed', { error, chatId });
            await this.bot.sendMessage(chatId, '❌ Debug failed');
        }
    }
    resetSessionTimeout(chatId) {
        const existingTimeout = this.sessionTimeouts.get(chatId);
        if (existingTimeout)
            clearTimeout(existingTimeout);
        const timeout = setTimeout(() => {
            this.sessions.delete(chatId);
            this.sessionTimeouts.delete(chatId);
            this.bot.sendMessage(chatId, '⏰ Workflow creation session expired due to inactivity. Use `/create` to start again.');
        }, 30 * 60 * 1000); // 30 minutes
        this.sessionTimeouts.set(chatId, timeout);
    }
    async handleStart(msg) {
        const chatId = msg.chat.id;
        // Rate limiting
        const rateLimit = this.isRateLimited(chatId);
        if (rateLimit.limited) {
            await this.bot.sendMessage(chatId, rateLimit.message);
            return;
        }
        await this.bot.sendMessage(chatId, `🤖 *Welcome to R8R Workflow Bot!*\n\n` +
            `I can help you create and manage AI workflows.\n\n` +
            `*Available Commands:*\n` +
            `*/register email password name* - Create account\n` +
            `*/login email password* - Login to your account\n` +
            `*/link api_key* - Link with existing account\n` +
            `*/create* - Create new workflow\n` +
            `*/list* - List your workflows\n` +
            `*/run workflow_name* - Execute workflow\n` +
            `*/delete workflow_name* - Delete workflow\n` +
            `*/query your_question* - Direct query to default workflow\n` +
            `*/status* - Check bot status\n` +
            `*/help* - Show help\n\n` +
            `Get started by logging in or linking your account!`);
    }
    async handleLinkAccount(msg, match) {
        const chatId = msg.chat.id;
        // Rate limiting
        const rateLimit = this.isRateLimited(chatId);
        if (rateLimit.limited) {
            await this.bot.sendMessage(chatId, rateLimit.message);
            return;
        }
        if (!match || !match[1]) {
            await this.bot.sendMessage(chatId, '🔗 *Link Your Account*\n\n' +
                'Usage: `/link <your_api_key>`\n\n' +
                'Get your API key from the website dashboard.');
            return;
        }
        const apiKey = match[1].trim();
        try {
            // Find user by API key from main system
            const apiKeyRecord = await prisma.apiKey.findFirst({
                where: { key: apiKey },
                include: { user: true }
            });
            if (!apiKeyRecord) {
                await this.bot.sendMessage(chatId, '❌ Invalid API key');
                return;
            }
            // Link Telegram chat ID to existing user
            this.userMapping.set(chatId, apiKeyRecord.user.id);
            await this.bot.sendMessage(chatId, `✅ *Account Linked Successfully!*\n\n` +
                `Welcome back, *${apiKeyRecord.user.name}*!\n\n` +
                `You can now use all workflow commands.`);
            logger.info('Account linked via Telegram', { userId: apiKeyRecord.user.id, chatId });
        }
        catch (error) {
            logger.error('Account linking failed', { error, chatId });
            await this.bot.sendMessage(chatId, '❌ Failed to link account');
        }
    }
    async handleRegister(msg, match) {
        const chatId = msg.chat.id;
        // Rate limiting
        const rateLimit = this.isRateLimited(chatId);
        if (rateLimit.limited) {
            await this.bot.sendMessage(chatId, rateLimit.message);
            return;
        }
        if (!match || match.length < 4) {
            await this.bot.sendMessage(chatId, '❌ *Usage:* `/register <email> <password> <name>`');
            return;
        }
        const [, email, password, name] = match;
        // Validate inputs
        // @ts-ignore
        if (!this.isValidEmail(email)) {
            await this.bot.sendMessage(chatId, '❌ Invalid email format');
            return;
        }
        // @ts-ignore
        if (password.length < 6) {
            await this.bot.sendMessage(chatId, '❌ Password must be at least 6 characters');
            return;
        }
        // @ts-ignore
        if (name.length < 2) {
            await this.bot.sendMessage(chatId, '❌ Name must be at least 2 characters');
            return;
        }
        try {
            // @ts-ignore
            const existing = await prisma.user.findUnique({ where: { email } });
            if (existing) {
                await this.bot.sendMessage(chatId, '❌ Email already registered!');
                return;
            }
            const bcrypt = await import('bcrypt');
            // @ts-ignore
            const hashedPassword = await bcrypt.hash(password, 12);
            // Create user in main system
            const user = await prisma.user.create({
                // @ts-ignore
                data: { email, password: hashedPassword, name }
            });
            const apiKey = `rag_${uuidv4().replace(/-/g, '')}`;
            await prisma.apiKey.create({
                data: {
                    key: apiKey,
                    name: 'Telegram Bot Key',
                    userId: user.id,
                    canRead: true,
                    canWrite: true
                }
            });
            this.userMapping.set(chatId, user.id);
            await this.bot.sendMessage(chatId, `✅ *Registration Successful!*\n\n` +
                `Welcome, *${name}*!\n\n` +
                `🔑 *Your API Key:* \`${apiKey}\`\n\n` +
                `Save this key securely. You can now create workflows!`);
            logger.info('User registered via Telegram', { userId: user.id, chatId });
        }
        catch (error) {
            logger.error('Registration failed', { error, chatId });
            await this.bot.sendMessage(chatId, '❌ Registration failed. Please try again.');
        }
    }
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    async handleLogin(msg, match) {
        const chatId = msg.chat.id;
        // Rate limiting
        const rateLimit = this.isRateLimited(chatId);
        if (rateLimit.limited) {
            await this.bot.sendMessage(chatId, rateLimit.message);
            return;
        }
        if (!match || match.length < 3) {
            await this.bot.sendMessage(chatId, '❌ Usage: `/login <email> <password>`');
            return;
        }
        const [, email, password] = match;
        // Log the attempt for debugging
        logger.info('Login attempt', {
            email,
            // @ts-ignore
            passwordLength: password.length
        });
        try {
            const user = await prisma.user.findUnique({
                // @ts-ignore
                where: { email },
                select: { id: true, email: true, name: true, password: true }
            });
            if (!user) {
                logger.warn('User not found for login', { email });
                await this.bot.sendMessage(chatId, '❌ User not found!');
                return;
            }
            logger.info('User found for login', { userId: user.id, name: user.name });
            // Use the same bcrypt as your website
            const bcrypt = await import('bcrypt');
            // @ts-ignore
            const valid = await bcrypt.compare(password, user.password);
            // @ts-ignore
            logger.info('Password comparison result', { valid, passwordLength: password.length });
            if (!valid) {
                await this.bot.sendMessage(chatId, '❌ Invalid password!');
                return;
            }
            this.userMapping.set(chatId, user.id);
            await this.bot.sendMessage(chatId, `✅ *Login Successful!*\n\n` +
                `Welcome back, *${user.name}*!`);
            logger.info('Login successful', { userId: user.id, email: user.email });
        }
        catch (error) {
            logger.error('Login failed', { error, chatId });
            await this.bot.sendMessage(chatId, '❌ Login failed. Please try again.');
        }
    }
    async handleCreateWorkflow(msg) {
        const chatId = msg.chat.id;
        const userId = this.userMapping.get(chatId);
        // Rate limiting
        const rateLimit = this.isRateLimited(chatId);
        if (rateLimit.limited) {
            await this.bot.sendMessage(chatId, rateLimit.message);
            return;
        }
        if (!userId) {
            await this.bot.sendMessage(chatId, '❌ Please login first using `/login <email> <password>` or `/link <api_key>`');
            return;
        }
        this.sessions.set(chatId, {
            userId,
            step: 'name',
            steps: [],
            configuration: {
                cacheEnabled: true,
                cacheTTL: 3600
            },
            createdAt: Date.now()
        });
        this.resetSessionTimeout(chatId);
        await this.bot.sendMessage(chatId, `🔧 *Let's create a new workflow!*\n\n` +
            `*Step 1/5:* What should we name this workflow?\n\n` +
            `*Example:* "Customer Support RAG"\n\n` +
            `Type \`/cancel\` at any time to abort.`);
    }
    async handleCancelCreation(msg) {
        const chatId = msg.chat.id;
        // Rate limiting
        const rateLimit = this.isRateLimited(chatId);
        if (rateLimit.limited) {
            await this.bot.sendMessage(chatId, rateLimit.message);
            return;
        }
        const session = this.sessions.get(chatId);
        if (session) {
            this.cleanupSession(chatId);
            await this.bot.sendMessage(chatId, '❌ Workflow creation cancelled.');
        }
        else {
            await this.bot.sendMessage(chatId, 'No active workflow creation session.');
        }
    }
    async handleListWorkflows(msg) {
        const chatId = msg.chat.id;
        const userId = this.userMapping.get(chatId);
        // Rate limiting
        const rateLimit = this.isRateLimited(chatId);
        if (rateLimit.limited) {
            await this.bot.sendMessage(chatId, rateLimit.message);
            return;
        }
        if (!userId) {
            await this.bot.sendMessage(chatId, '❌ Please login first');
            return;
        }
        try {
            // List main workflows from Workflow table
            const workflows = await prisma.workflow.findMany({
                where: { userId },
                include: {
                    queryLogs: {
                        take: 5,
                        orderBy: { createdAt: 'desc' }
                    },
                    analytics: true
                },
                orderBy: { createdAt: 'desc' }
            });
            if (workflows.length === 0) {
                await this.bot.sendMessage(chatId, '📋 You have no workflows yet. Create one with `/create`');
                return;
            }
            let message = '📋 *Your Workflows:*\n\n';
            workflows.forEach((wf, i) => {
                message += `*${i + 1}. ${wf.name}*\n`;
                message += `   Status: ${wf.status}\n`;
                message += `   Version: ${wf.version}\n`;
                message += `   Queries: ${wf.queryLogs.length}\n`;
                if (wf.analytics) {
                    const successRate = wf.analytics.totalQueries > 0
                        ? ((wf.analytics.successfulQueries / wf.analytics.totalQueries) * 100).toFixed(1)
                        : '0.0';
                    message += `   Success Rate: ${successRate}%\n`;
                }
                message += `   Created: ${wf.createdAt.toLocaleDateString()}\n`;
                message += `\n`;
            });
            message += `*Usage:*\n`;
            message += `Run workflow: \`/run <workflow_name>\`\n`;
            message += `Delete workflow: \`/delete <workflow_name>\`\n`;
            message += `Quick query: \`/query <your_question>\``;
            await this.bot.sendMessage(chatId, message);
        }
        catch (error) {
            logger.error('Failed to list workflows', { error, userId });
            await this.bot.sendMessage(chatId, '❌ Failed to list workflows');
        }
    }
    async handleDeleteWorkflow(workflowName, msg) {
        if (!msg)
            return;
        const chatId = msg.chat.id;
        const userId = this.userMapping.get(chatId);
        // Rate limiting
        const rateLimit = this.isRateLimited(chatId);
        if (rateLimit.limited) {
            await this.bot.sendMessage(chatId, rateLimit.message);
            return;
        }
        if (!userId) {
            await this.bot.sendMessage(chatId, '❌ Please login first');
            return;
        }
        if (!workflowName) {
            await this.bot.sendMessage(chatId, '❌ Usage: `/delete <workflow_name>`');
            return;
        }
        try {
            // Find and delete workflow
            const workflow = await prisma.workflow.findFirst({
                where: {
                    userId,
                    name: workflowName
                }
            });
            if (!workflow) {
                await this.bot.sendMessage(chatId, `❌ Workflow "${workflowName}" not found`);
                return;
            }
            // Delete related records first to maintain referential integrity
            await prisma.queryLog.deleteMany({
                where: { workflowId: workflow.id }
            });
            await prisma.workflowAnalytics.deleteMany({
                where: { workflowId: workflow.id }
            });
            await prisma.workflow.delete({
                where: { id: workflow.id }
            });
            await this.bot.sendMessage(chatId, `🗑️ *Workflow Deleted Successfully!*\n\n` +
                `*Name:* ${workflow.name}\n` +
                `*ID:* ${workflow.id}\n\n` +
                `All related data has been removed.`);
            logger.info('Workflow deleted via Telegram', { workflowId: workflow.id, userId });
        }
        catch (error) {
            logger.error('Failed to delete workflow', { error, workflowName, userId });
            await this.bot.sendMessage(chatId, '❌ Failed to delete workflow');
        }
    }
    async handleStatus(msg) {
        const chatId = msg.chat.id;
        // Rate limiting
        const rateLimit = this.isRateLimited(chatId);
        if (rateLimit.limited) {
            await this.bot.sendMessage(chatId, rateLimit.message);
            return;
        }
        const userId = this.userMapping.get(chatId);
        const session = this.sessions.get(chatId);
        let statusMessage = `🤖 *Bot Status*\n\n`;
        if (userId) {
            statusMessage += `✅ *Logged In:* Yes\n`;
            try {
                const user = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { name: true, email: true, workflows: { select: { id: true } } }
                });
                if (user) {
                    statusMessage += `*User:* ${user.name}\n`;
                    statusMessage += `*Email:* ${user.email}\n`;
                    statusMessage += `*Workflows:* ${user.workflows.length}\n`;
                }
            }
            catch (error) {
                statusMessage += `*User Info:* Error fetching\n`;
            }
        }
        else {
            statusMessage += `❌ *Logged In:* No\n`;
        }
        if (session) {
            statusMessage += `\n🔄 *Active Session:* Yes\n`;
            statusMessage += `*Step:* ${session.step}\n`;
            statusMessage += `*Workflow:* ${session.workflowName || 'Not set'}\n`;
        }
        else {
            statusMessage += `\n⏸️ *Active Session:* No\n`;
        }
        statusMessage += `\n*Session Stats:*\n`;
        statusMessage += `Active Sessions: ${this.sessions.size}\n`;
        statusMessage += `Logged In Users: ${this.userMapping.size}\n`;
        await this.bot.sendMessage(chatId, statusMessage);
    }
    async handleRunWorkflow(msg, workflowName) {
        const chatId = msg.chat.id;
        const userId = this.userMapping.get(chatId);
        // Rate limiting
        const rateLimit = this.isRateLimited(chatId);
        if (rateLimit.limited) {
            await this.bot.sendMessage(chatId, rateLimit.message);
            return;
        }
        if (!userId) {
            await this.bot.sendMessage(chatId, '❌ Please login first');
            return;
        }
        if (!workflowName) {
            await this.bot.sendMessage(chatId, '❌ Usage: `/run <workflow_name>`');
            return;
        }
        try {
            // Find workflow from main Workflow table
            const workflow = await prisma.workflow.findFirst({
                where: {
                    userId,
                    name: workflowName
                }
            });
            if (!workflow) {
                await this.bot.sendMessage(chatId, `❌ Workflow "${workflowName}" not found`);
                return;
            }
            // Store workflow ID for query execution
            this.sessions.set(chatId, {
                userId,
                step: 'confirm',
                workflowName: workflow.name,
                configuration: { workflowId: workflow.id },
                steps: [],
                createdAt: Date.now()
            });
            this.resetSessionTimeout(chatId);
            await this.bot.sendMessage(chatId, `🚀 *Ready to execute:* ${workflow.name}\n\n` +
                `Send me your query and I'll process it through the workflow...\n\n` +
                `Or type \`/cancel\` to abort.`);
        }
        catch (error) {
            logger.error('Workflow execution setup failed', { error, workflowName });
            await this.bot.sendMessage(chatId, '❌ Failed to setup workflow execution');
        }
    }
    async handleDirectQuery(msg, query) {
        const chatId = msg.chat.id;
        const userId = this.userMapping.get(chatId);
        // Rate limiting
        const rateLimit = this.isRateLimited(chatId);
        if (rateLimit.limited) {
            await this.bot.sendMessage(chatId, rateLimit.message);
            return;
        }
        if (!userId) {
            await this.bot.sendMessage(chatId, '❌ Please login first');
            return;
        }
        if (!query) {
            await this.bot.sendMessage(chatId, '❌ Usage: `/query <your_question>`');
            return;
        }
        try {
            // Find user's default or first workflow
            const workflow = await prisma.workflow.findFirst({
                where: { userId },
                orderBy: { createdAt: 'desc' }
            });
            if (!workflow) {
                await this.bot.sendMessage(chatId, '❌ No workflows found. Create one with `/create` first');
                return;
            }
            await this.executeWorkflowQuery(chatId, userId, workflow.id, query);
        }
        catch (error) {
            logger.error('Direct query failed', { error, query });
            await this.bot.sendMessage(chatId, '❌ Failed to process query');
        }
    }
    // @ts-ignore
    executeWorkflowQuery(chatId, userId, id, query) {
        throw new Error('Method not implemented.');
    }
    async handleHelp(msg) {
        const chatId = msg.chat.id;
        // Rate limiting
        const rateLimit = this.isRateLimited(chatId);
        if (rateLimit.limited) {
            await this.bot.sendMessage(chatId, rateLimit.message);
            return;
        }
        await this.bot.sendMessage(chatId, `📚 *R8R Workflow Bot Help*\n\n` +
            `*Account Management:*\n` +
            `\`/register email password name\` - Create account\n` +
            `\`/login email password\` - Login\n` +
            `\`/link api_key\` - Link with existing account\n\n` +
            `*Workflow Management:*\n` +
            `\`/create\` - Create new workflow\n` +
            `\`/list\` - List all workflows\n` +
            `\`/run name\` - Execute specific workflow\n` +
            `\`/delete name\` - Delete workflow\n` +
            `\`/query question\` - Quick query to default workflow\n` +
            `\`/status\` - Check bot status\n` +
            `\`/cancel\` - Cancel current operation\n\n` +
            `*Workflow Types Available:*\n` +
            `• *Standard RAG* - Basic retrieval & answer\n` +
            `• *Advanced RAG* - With query rewrite & reranking\n` +
            `• *Memory RAG* - With conversation memory\n` +
            `• *Fast RAG* - Direct retrieval & answer\n\n` +
            `*Need help?* Contact support.`);
    }
    async handleMessage(msg) {
        const chatId = msg.chat.id;
        // Rate limiting
        const rateLimit = this.isRateLimited(chatId);
        if (rateLimit.limited) {
            await this.bot.sendMessage(chatId, rateLimit.message);
            return;
        }
        const session = this.sessions.get(chatId);
        if (!session || !msg.text)
            return;
        const text = msg.text.trim();
        this.resetSessionTimeout(chatId);
        try {
            switch (session.step) {
                case 'name':
                    await this.handleWorkflowName(chatId, session, text);
                    break;
                case 'description':
                    await this.handleWorkflowDescription(chatId, session, text);
                    break;
                case 'steps':
                    await this.handleWorkflowSteps(chatId, session, text);
                    break;
                case 'config':
                    await this.handleWorkflowConfig(chatId, session, text);
                    break;
                case 'confirm':
                    await this.handleWorkflowConfig(chatId, session, text);
                    break;
            }
        }
        catch (error) {
            logger.error('Message handling failed', { error, chatId, step: session.step });
            await this.bot.sendMessage(chatId, '❌ Failed to process message. Please try again.');
        }
    }
    async handleWorkflowName(chatId, session, text) {
        if (text.length < 3) {
            await this.bot.sendMessage(chatId, '❌ Workflow name must be at least 3 characters');
            return;
        }
        session.workflowName = text;
        session.step = 'description';
        await this.bot.sendMessage(chatId, `✅ *Workflow name set:* ${text}\n\n` +
            `*Step 2/5:* Add a description (or type "skip")`);
    }
    async handleWorkflowDescription(chatId, session, text) {
        // @ts-ignore
        session.workflowDescription = text === 'skip' ? undefined : text;
        session.step = 'steps';
        await this.bot.sendMessage(chatId, `*Step 3/5: Workflow Type Selection*\n\n` +
            `Choose your workflow type:\n\n` +
            `1. 🔄 *Standard RAG* - Basic retrieval and generation\n` +
            `2. 🚀 *Advanced RAG* - With query rewrite and reranking\n` +
            `3. 🧠 *Memory RAG* - With conversation memory\n` +
            `4. ⚡ *Fast RAG* - Direct retrieval and answer\n\n` +
            `Reply with 1, 2, 3, or 4:`);
    }
    async handleWorkflowSteps(chatId, session, text) {
        let workflowType = '';
        let workflowDescription = '';
        switch (text.trim()) {
            case '1':
                workflowType = 'standard';
                workflowDescription = 'Standard RAG workflow';
                session.steps = this.getStandardRAGWorkflow();
                break;
            case '2':
                workflowType = 'advanced';
                workflowDescription = 'Advanced RAG with query optimization';
                session.steps = this.getAdvancedRAGWorkflow();
                break;
            case '3':
                workflowType = 'memory';
                workflowDescription = 'RAG with conversation memory';
                session.steps = this.getMemoryRAGWorkflow();
                break;
            case '4':
                workflowType = 'fast';
                workflowDescription = 'Fast direct RAG';
                session.steps = this.getFastRAGWorkflow();
                break;
            default:
                await this.bot.sendMessage(chatId, `❌ Please choose 1, 2, 3, or 4\n\n` +
                    `1. Standard RAG\n` +
                    `2. Advanced RAG\n` +
                    `3. Memory RAG\n` +
                    `4. Fast RAG`);
                return;
        }
        // Validate workflow configuration
        const validation = this.validateWorkflowConfiguration(session.steps);
        if (!validation.valid) {
            await this.bot.sendMessage(chatId, `❌ Invalid workflow configuration: ${validation.error}`);
            return;
        }
        session.step = 'config';
        await this.bot.sendMessage(chatId, `✅ *${workflowDescription} configured!*\n\n` +
            `*Step 4/5: Basic Configuration*\n\n` +
            `Workflow includes:\n${this.getWorkflowStepsDescription(session.steps)}\n\n` +
            `Set vector index name (or type "skip"):\n\n` +
            `*Example:* my-documents-index\n` +
            `Or type: skip`);
    }
    validateWorkflowConfiguration(steps) {
        if (!steps || steps.length === 0) {
            return { valid: false, error: 'Workflow must have at least one step' };
        }
        for (const step of steps) {
            if (!step.id || !step.type) {
                return { valid: false, error: `Step missing id or type` };
            }
            // Validate step configuration based on type
            switch (step.type) {
                case 'retrieval':
                    if (!step.config?.retriever?.type) {
                        return { valid: false, error: `Retrieval step missing retriever configuration` };
                    }
                    break;
                case 'answer_generation':
                    if (!step.config?.llm?.provider) {
                        return { valid: false, error: `Answer generation step missing LLM configuration` };
                    }
                    break;
                case 'query_rewrite':
                case 'rerank':
                    if (!step.config?.llm?.provider) {
                        return { valid: false, error: `${step.type} step missing LLM configuration` };
                    }
                    break;
            }
        }
        return { valid: true };
    }
    getWorkflowStepsDescription(steps) {
        return steps.map(step => {
            switch (step.type) {
                case 'query_rewrite': return '• 🔄 Query Rewrite (LLM)';
                case 'retrieval': return '• 📚 Document Retrieval (Vector DB)';
                case 'rerank': return '• 🎯 Rerank & Filter (LLM)';
                case 'memory_retrieve': return '• 🧠 Memory Retrieval';
                case 'answer_generation': return '• 🤖 Answer Generation (LLM)';
                case 'memory_update': return '• 💾 Memory Update';
                default: return `• ${step.type}`;
            }
        }).join('\n');
    }
    getStandardRAGWorkflow() {
        return [
            {
                id: 'retrieval_1',
                type: 'retrieval',
                config: {
                    retriever: {
                        type: 'qdrant',
                        config: { topK: 10 }
                    }
                },
                nextSteps: ['answer_1']
            },
            {
                id: 'answer_1',
                type: 'answer_generation',
                config: {
                    llm: {
                        provider: 'openai',
                        model: 'gpt-3.5-turbo',
                        temperature: 0.7,
                        maxTokens: 1000
                    },
                    prompt: 'Answer the question using the provided context.'
                }
            }
        ];
    }
    getAdvancedRAGWorkflow() {
        return [
            {
                id: 'query_rewrite_1',
                type: 'query_rewrite',
                config: {
                    llm: {
                        provider: 'openai',
                        model: 'gpt-3.5-turbo',
                        temperature: 0.3,
                        maxTokens: 200
                    },
                    prompt: 'Improve this search query for better document retrieval. Return only the improved query.'
                },
                nextSteps: ['retrieval_1']
            },
            {
                id: 'retrieval_1',
                type: 'retrieval',
                config: {
                    retriever: {
                        type: 'qdrant',
                        config: { topK: 15 }
                    }
                },
                nextSteps: ['rerank_1']
            },
            {
                id: 'rerank_1',
                type: 'rerank',
                config: {
                    llm: {
                        provider: 'openai',
                        model: 'gpt-3.5-turbo',
                        temperature: 0.1,
                        maxTokens: 50
                    }
                },
                nextSteps: ['answer_1']
            },
            {
                id: 'answer_1',
                type: 'answer_generation',
                config: {
                    llm: {
                        provider: 'openai',
                        model: 'gpt-3.5-turbo',
                        temperature: 0.7,
                        maxTokens: 1000
                    },
                    prompt: 'Answer the question using the provided context from the reranked documents.'
                }
            }
        ];
    }
    getMemoryRAGWorkflow() {
        return [
            {
                id: 'query_rewrite_1',
                type: 'query_rewrite',
                config: {
                    llm: {
                        provider: 'openai',
                        model: 'gpt-3.5-turbo',
                        temperature: 0.3,
                        maxTokens: 200
                    }
                },
                nextSteps: ['retrieval_1', 'memory_retrieve_1']
            },
            {
                id: 'retrieval_1',
                type: 'retrieval',
                config: {
                    retriever: {
                        type: 'qdrant',
                        config: { topK: 10 }
                    }
                },
                nextSteps: ['rerank_1']
            },
            {
                id: 'memory_retrieve_1',
                type: 'memory_retrieve',
                config: {
                    memoryRetrieve: {
                        enabled: true,
                        topK: 5,
                        minScore: 0.7
                    }
                },
                nextSteps: ['answer_1']
            },
            {
                id: 'rerank_1',
                type: 'rerank',
                config: {
                    llm: {
                        provider: 'openai',
                        model: 'gpt-3.5-turbo',
                        temperature: 0.1
                    }
                },
                nextSteps: ['answer_1']
            },
            {
                id: 'answer_1',
                type: 'answer_generation',
                config: {
                    llm: {
                        provider: 'openai',
                        model: 'gpt-3.5-turbo',
                        temperature: 0.7,
                        maxTokens: 1000
                    },
                    prompt: 'Answer the question using the provided context and any relevant memories from previous conversations.'
                },
                nextSteps: ['memory_update_1']
            },
            {
                id: 'memory_update_1',
                type: 'memory_update',
                config: {
                    memoryUpdate: {
                        enabled: true,
                        importance: { auto: true },
                        deduplication: { enabled: true, similarityThreshold: 0.8 }
                    }
                }
            }
        ];
    }
    getFastRAGWorkflow() {
        return [
            {
                id: 'retrieval_1',
                type: 'retrieval',
                config: {
                    retriever: {
                        type: 'qdrant',
                        config: { topK: 5 }
                    }
                },
                nextSteps: ['answer_1']
            },
            {
                id: 'answer_1',
                type: 'answer_generation',
                config: {
                    llm: {
                        provider: 'openai',
                        model: 'gpt-3.5-turbo',
                        temperature: 0.7,
                        maxTokens: 500
                    },
                    prompt: 'Provide a concise answer based on the context.'
                }
            }
        ];
    }
    async handleWorkflowConfig(chatId, session, text) {
        // Store configuration
        session.configuration = {
            ...session.configuration,
            vectorIndexName: text === 'skip' ? undefined : text,
            vectorNamespace: text === 'skip' ? undefined : `${text}-namespace`
        };
        session.step = 'confirm';
        let summary = `*Workflow Summary:*\n\n`;
        summary += `*Name:* ${session.workflowName}\n`;
        if (session.workflowDescription) {
            summary += `*Description:* ${session.workflowDescription}\n`;
        }
        summary += `*Type:* ${this.getWorkflowTypeName(session.steps)}\n`;
        summary += `*Steps:* ${session.steps.length} steps\n`;
        summary += `\n*Workflow Flow:*\n${this.getWorkflowFlowDescription(session.steps)}\n`;
        if (session.configuration.vectorIndexName) {
            summary += `*Vector Index:* ${session.configuration.vectorIndexName}\n`;
        }
        summary += `\nType \`confirm\` to create or \`cancel\` to abort.`;
        await this.bot.sendMessage(chatId, summary);
    }
    getWorkflowTypeName(steps) {
        const hasRewrite = steps.some(s => s.type === 'query_rewrite');
        const hasRerank = steps.some(s => s.type === 'rerank');
        const hasMemory = steps.some(s => s.type === 'memory_retrieve' || s.type === 'memory_update');
        if (hasMemory && hasRerank)
            return 'Memory RAG with Optimization';
        if (hasMemory)
            return 'Memory RAG';
        if (hasRewrite && hasRerank)
            return 'Advanced RAG';
        if (steps.length === 2)
            return 'Fast RAG';
        return 'Standard RAG';
    }
    getWorkflowFlowDescription(steps) {
        const stepMap = new Map(steps.map(step => [step.id, step]));
        let description = '';
        steps.forEach(step => {
            const stepName = this.getStepDisplayName(step.type);
            description += `→ ${stepName}`;
            if (step.nextSteps && step.nextSteps.length > 0) {
                if (step.nextSteps.length > 1) {
                    // @ts-ignore
                    description += ` → [Parallel: ${step.nextSteps.map(id => this.getStepDisplayName(stepMap.get(id)?.type)).join(', ')}]`;
                }
                else {
                    description += ` → ${this.getStepDisplayName(stepMap.get(step.nextSteps[0])?.type)}`;
                }
            }
            description += '\n';
        });
        return description;
    }
    getStepDisplayName(stepType) {
        const names = {
            'query_rewrite': 'Query Rewrite',
            'retrieval': 'Retrieval',
            'rerank': 'Rerank',
            'memory_retrieve': 'Memory Retrieve',
            'answer_generation': 'Answer Generation',
            'memory_update': 'Memory Update'
        };
        return names[stepType] || stepType;
    }
    async handleWorkflowConfirm(chatId, session, text) {
        if (text.toLowerCase() === 'cancel') {
            this.cleanupSession(chatId);
            await this.bot.sendMessage(chatId, '❌ Workflow creation cancelled');
            return;
        }
        if (text.toLowerCase() !== 'confirm') {
            // This is a query for workflow execution
            if (session.configuration.workflowId) {
                await this.executeWorkflowQuery(chatId, session.userId, session.configuration.workflowId, text);
            }
            return;
        }
        // Create the main workflow in Workflow table
        try {
            const workflow = await prisma.workflow.create({
                // @ts-ignore
                data: {
                    name: session.workflowName,
                    description: session.workflowDescription,
                    userId: session.userId,
                    configuration: {
                        ...session.configuration,
                        steps: session.steps,
                        cacheEnabled: true,
                        cacheTTL: 3600
                    },
                    status: 'active',
                    version: 1
                }
            });
            this.cleanupSession(chatId);
            await this.bot.sendMessage(chatId, `✅ *Workflow Created Successfully!*\n\n` +
                `*Name:* ${workflow.name}\n` +
                `*ID:* ${workflow.id}\n` +
                `*Type:* ${this.getWorkflowTypeName(session.steps)}\n` +
                `*Steps:* ${session.steps.length} steps\n\n` +
                `Run it with: \`/run ${workflow.name}\`\n` +
                `Or use quick query: \`/query <your_question>\`\n\n` +
                `Now send me a query to test it!`);
            logger.info('Workflow created via Telegram', {
                workflowId: workflow.id,
                userId: session.userId,
                chatId
            });
        }
        catch (error) {
            logger.error('Failed to create workflow', { error, chatId, session });
            await this.bot.sendMessage(chatId, '❌ Failed to create workflow. Please try again.');
        }
    }
    async sendNotification(chatId, message) {
        try {
            await this.bot.sendMessage(chatId, message);
        }
        catch (error) {
            logger.error('Failed to send Telegram notification', { error, chatId });
        }
    }
    getBot() {
        return this.bot;
    }
    // Utility method to get bot statistics
    getStats() {
        return {
            activeSessions: this.sessions.size,
            loggedInUsers: this.userMapping.size,
            rateLimitedUsers: this.userRateLimits.size
        };
    }
    // Method to gracefully shutdown the bot
    async shutdown() {
        logger.info('Shutting down Telegram bot...');
        // Clear all timeouts
        for (const timeout of this.sessionTimeouts.values()) {
            clearTimeout(timeout);
        }
        // Clear all intervals from cleanup jobs
        // Note: In a real implementation, you'd need to store interval IDs
        // Stop the bot
        this.bot.stopPolling();
        logger.info('Telegram bot shutdown complete');
    }
}
let telegramBotInstance = null;
export function getTelegramBot() {
    if (!telegramBotInstance) {
        telegramBotInstance = new TelegramBotService();
    }
    return telegramBotInstance;
}
export function destroyTelegramBot() {
    if (telegramBotInstance) {
        telegramBotInstance.shutdown();
        telegramBotInstance = null;
    }
}
//# sourceMappingURL=telegram-bot.service.js.map