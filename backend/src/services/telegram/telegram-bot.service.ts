// services/telegram/telegram-bot-enhanced.service.ts
// PRODUCTION-READY TELEGRAM BOT WITH FULL WORKFLOW CREATION CAPABILITIES

import TelegramBot from 'node-telegram-bot-api';
import { prisma } from '../../server.js';
import { logger } from '../../utils/logger.js';
import { WorkflowExecutor } from '../workflow/workflow-executor.service.js';
import { v4 as uuidv4 } from 'uuid';
import type { WorkflowConfig, WorkflowStep } from '../../types/workflow.types.js';
import { create } from 'domain';
import { link } from 'fs';
import { register } from 'module';

// =====================================================
// WORKFLOW NODE TYPES & CONFIGURATIONS
// =====================================================

interface NodeTemplate {
  id: string;
  type: string;
  name: string;
  description: string;
  emoji: string;
  requiredConfig: string[];
  optionalConfig: string[];
  defaultConfig: any;
}

const AVAILABLE_NODES: NodeTemplate[] = [
  {
    id: 'query_rewrite',
    type: 'query_rewrite',
    name: 'Query Rewrite',
    emoji: '🔄',
    description: 'Optimize and enhance the user query using LLM',
    requiredConfig: ['llm.provider', 'llm.model'],
    optionalConfig: ['llm.temperature', 'llm.maxTokens', 'prompt'],
    defaultConfig: {
      llm: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        temperature: 0.3,
        maxTokens: 400
      }
    }
  },
  {
    id: 'retrieval',
    type: 'retrieval',
    name: 'Document Retrieval',
    emoji: '📚',
    description: 'Retrieve relevant documents from vector database',
    requiredConfig: ['retriever.type', 'retriever.config.topK'],
    optionalConfig: ['retriever.config.filter', 'retriever.config.threshold'],
    defaultConfig: {
      retriever: {
        type: 'qdrant',
        config: { topK: 10 }
      }
    }
  },
  {
    id: 'rerank',
    type: 'rerank',
    name: 'Rerank & Filter',
    emoji: '🎯',
    description: 'Rerank and filter retrieved documents',
    requiredConfig: ['llm.provider', 'llm.model'],
    optionalConfig: ['llm.temperature', 'topK'],
    defaultConfig: {
      llm: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        temperature: 0.1,
        maxTokens: 50
      }
    }
  },
  {
    id: 'answer_generation',
    type: 'answer_generation',
    name: 'Answer Generation',
    emoji: '🤖',
    description: 'Generate answer using LLM with context',
    requiredConfig: ['llm.provider', 'llm.model'],
    optionalConfig: ['llm.temperature', 'llm.maxTokens', 'prompt'],
    defaultConfig: {
      llm: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 1000
      }
    }
  },
  {
    id: 'memory_retrieve',
    type: 'memory_retrieve',
    name: 'Memory Retrieval',
    emoji: '🧠',
    description: 'Retrieve relevant memories from past conversations',
    requiredConfig: ['memoryRetrieve.enabled'],
    optionalConfig: ['memoryRetrieve.topK', 'memoryRetrieve.minScore'],
    defaultConfig: {
      memoryRetrieve: {
        enabled: true,
        topK: 5,
        minScore: 0.7
      }
    }
  },
  {
    id: 'memory_update',
    type: 'memory_update',
    name: 'Memory Update',
    emoji: '💾',
    description: 'Store conversation in memory for future context',
    requiredConfig: ['memoryUpdate.enabled'],
    optionalConfig: ['memoryUpdate.importance', 'memoryUpdate.deduplication'],
    defaultConfig: {
      memoryUpdate: {
        enabled: true,
        importance: { auto: true },
        deduplication: { enabled: true, similarityThreshold: 0.8 }
      }
    }
  },
  {
    id: 'memory_summarize',
    type: 'memory_summarize',
    name: 'Memory Summarization',
    emoji: '📝',
    description: 'Summarize multiple memories into concise summaries',
    requiredConfig: ['memorySummarize.enabled'],
    optionalConfig: ['memorySummarize.topK', 'memorySummarize.preserveDetails'],
    defaultConfig: {
      memorySummarize: {
        enabled: true,
        topK: 10,
        preserveDetails: false
      }
    }
  },
  {
    id: 'post_process',
    type: 'post_process',
    name: 'Post Processing',
    emoji: '✨',
    description: 'Format and enhance the final output',
    requiredConfig: [],
    optionalConfig: ['addSourceAttribution', 'showRewrittenQuery', 'showMemoryUsage'],
    defaultConfig: {
      addSourceAttribution: true,
      showRewrittenQuery: false,
      showMemoryUsage: false
    }
  }
];

// =====================================================
// WORKFLOW BUILDER SESSION INTERFACE
// =====================================================

interface WorkflowNode {
  id: string;
  type: string;
  config: any;
  nextSteps?: string[];
  position?: number;
}

interface WorkflowBuilderSession {
  userId: string;
  mode: 'visual' | 'guided' | 'template';
  step: 
    | 'mode_selection'
    | 'name'
    | 'description'
    | 'node_selection'
    | 'node_config'
    | 'connection'
    | 'advanced_config'
    | 'confirm'
    | 'template_selection';
  workflowName?: string;
  workflowDescription?: string;
  nodes: Map<string, WorkflowNode>;
  currentNodeId?: string;
  pendingConnections: Array<{ from: string; to: string }>;
  configuration: {
    cacheEnabled: boolean;
    cacheTTL: number;
    vectorIndexName?: string;
    vectorNamespace?: string;
  };
  createdAt: number;
}

interface UserRateLimit {
  count: number;
  lastReset: number;
  lastMessageTime: number;
}

// =====================================================
// ENHANCED TELEGRAM BOT SERVICE
// =====================================================

export class EnhancedTelegramBotService {
  private bot: TelegramBot;
  private sessions: Map<number, WorkflowBuilderSession> = new Map();
  private userMapping: Map<number, string> = new Map();
  private sessionTimeouts: Map<number, NodeJS.Timeout> = new Map();
  private userRateLimits: Map<number, UserRateLimit> = new Map();
  private workflowExecutor: WorkflowExecutor;

  constructor(token?: string) {
    const botToken = token || process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    this.bot = new TelegramBot(botToken, { polling: true });
    this.workflowExecutor = new WorkflowExecutor();

    this.setupHandlers();
    this.startCleanupJobs();
    logger.info('Enhanced Telegram bot initialized successfully');
  }

  // =====================================================
  // SAFE MESSAGE SENDER
  // =====================================================

  private async safeSendMessage(
    chatId: number,
    text: string,
    options: any = {}
  ): Promise<TelegramBot.Message> {
    try {
      return await this.bot.sendMessage(chatId, text, {
        ...options,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });
    } catch (error: any) {
      if (error.code === 'ETELEGRAM' && error.message.includes('parse entities')) {
        try {
          const htmlText = this.convertToHtml(text);
          return await this.bot.sendMessage(chatId, htmlText, {
            ...options,
            parse_mode: 'HTML',
            disable_web_page_preview: true
          });
        } catch (htmlError) {
          logger.warn('Both Markdown and HTML parsing failed, using plain text', {
            chatId,
            markdownError: error.message,
            htmlError: (htmlError as Error).message
          });
          return await this.bot.sendMessage(chatId, text, {
            ...options,
            parse_mode: undefined,
            disable_web_page_preview: true
          });
        }
      }
      throw error;
    }
  }

  private convertToHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.*?)\*/g, '<i>$1</i>')
      .replace(/__(.*?)__/g, '<u>$1</u>')
      .replace(/~~(.*?)~~/g, '<s>$1</s>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/```([\s\S]*?)```/g, '<pre>$1</pre>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }

  // =====================================================
  // COMMAND HANDLERS
  // =====================================================

  private setupHandlers() {
    // Start command
    this.bot.onText(/\/start/, async (msg) => {
      await this.handleStart(msg);
    });

    // NEW: Visual workflow builder
    this.bot.onText(/\/build/, async (msg) => {
      await this.handleBuildWorkflow(msg);
    });

    // NEW: List available nodes
    this.bot.onText(/\/nodes/, async (msg) => {
      await this.handleListNodes(msg);
    });

    // NEW: Node details
    this.bot.onText(/\/node (.+)/, async (msg, match) => {
      await this.handleNodeDetails(msg, match?.[1]);
    });

    // Existing commands
    this.bot.onText(/\/create/, async (msg) => {
      await this.handleCreateWorkflow(msg);
    });

    this.bot.onText(/\/list/, async (msg) => {
      await this.handleListWorkflows(msg);
    });

    this.bot.onText(/\/run (.+)/, async (msg, match) => {
      await this.handleRunWorkflow(msg, match?.[1]);
    });

    this.bot.onText(/\/query (.+)/, async (msg, match) => {
      await this.handleDirectQuery(msg, match?.[1]);
    });

    this.bot.onText(/\/delete (.+)/, async (msg, match) => {
      await this.handleDeleteWorkflow(msg, match?.[1]);
    });

    // NEW: View workflow structure
    this.bot.onText(/\/view (.+)/, async (msg, match) => {
      await this.handleViewWorkflow(msg, match?.[1]);
    });

    // NEW: Clone workflow
    this.bot.onText(/\/clone (.+)/, async (msg, match) => {
      await this.handleCloneWorkflow(msg, match?.[1]);
    });

    // Account management
    this.bot.onText(/\/register (.+) (.+) (.+)/, async (msg, match) => {
      await this.handleRegister(msg, match);
    });

    this.bot.onText(/\/login (.+) (.+)/, async (msg, match) => {
      await this.handleLogin(msg, match);
    });

    this.bot.onText(/\/link (.+)/, async (msg, match) => {
      await this.handleLinkAccount(msg, match);
    });

    this.bot.onText(/\/cancel/, async (msg) => {
      await this.handleCancelCreation(msg);
    });

    this.bot.onText(/\/status/, async (msg) => {
      await this.handleStatus(msg);
    });

    this.bot.onText(/\/help/, async (msg) => {
      await this.handleHelp(msg);
    });

    // Handle text messages
    this.bot.on('message', async (msg) => {
      if (msg.text?.startsWith('/')) return;
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

  // =====================================================
  // NEW: VISUAL WORKFLOW BUILDER
  // =====================================================

  private async handleBuildWorkflow(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const userId = this.userMapping.get(chatId);

    const rateLimit = this.isRateLimited(chatId);
    if (rateLimit.limited) {
      await this.safeSendMessage(chatId, rateLimit.message!);
      return;
    }

    if (!userId) {
      await this.safeSendMessage(
        chatId,
        '❌ Please login first using `/login <email> <password>` or `/link <api_key>`'
      );
      return;
    }

    // Initialize builder session
    this.sessions.set(chatId, {
      userId,
      mode: 'visual',
      step: 'mode_selection',
      nodes: new Map(),
      pendingConnections: [],
      configuration: {
        cacheEnabled: true,
        cacheTTL: 3600
      },
      createdAt: Date.now()
    });

    this.resetSessionTimeout(chatId);

    await this.safeSendMessage(
      chatId,
      `🏗️ *Workflow Builder*\n\n` +
      `Choose your workflow creation mode:\n\n` +
      `1️⃣ *Visual Builder* - Build node by node with connections\n` +
      `2️⃣ *Guided Setup* - Step-by-step wizard\n` +
      `3️⃣ *Templates* - Start from pre-built templates\n\n` +
      `Reply with: \`1\`, \`2\`, or \`3\`\n\n` +
      `Type \`/cancel\` to abort`
    );
  }

  private async handleListNodes(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;

    const rateLimit = this.isRateLimited(chatId);
    if (rateLimit.limited) {
      await this.safeSendMessage(chatId, rateLimit.message!);
      return;
    }

    let message = `🧩 *Available Workflow Nodes:*\n\n`;

    AVAILABLE_NODES.forEach((node, index) => {
      message += `${index + 1}. ${node.emoji} *${node.name}*\n`;
      message += `   Type: \`${node.type}\`\n`;
      message += `   ${node.description}\n\n`;
    });

    message += `\n*Usage:*\n`;
    message += `• View node details: \`/node <type>\`\n`;
    message += `• Build workflow: \`/build\`\n`;
    message += `• Templates: \`/create\` (guided mode)`;

    await this.safeSendMessage(chatId, message);
  }

  private async handleNodeDetails(msg: TelegramBot.Message, nodeType?: string) {
    const chatId = msg.chat.id;

    const rateLimit = this.isRateLimited(chatId);
    if (rateLimit.limited) {
      await this.safeSendMessage(chatId, rateLimit.message!);
      return;
    }

    if (!nodeType) {
      await this.safeSendMessage(chatId, '❌ Usage: `/node <node_type>`\n\nExample: `/node query_rewrite`');
      return;
    }

    const node = AVAILABLE_NODES.find(n => n.type === nodeType || n.id === nodeType);

    if (!node) {
      await this.safeSendMessage(
        chatId,
        `❌ Node type "${nodeType}" not found.\n\nUse \`/nodes\` to see all available nodes.`
      );
      return;
    }

    let message = `${node.emoji} *${node.name}*\n\n`;
    message += `*Type:* \`${node.type}\`\n`;
    message += `*Description:* ${node.description}\n\n`;

    if (node.requiredConfig.length > 0) {
      message += `*Required Config:*\n`;
      node.requiredConfig.forEach(cfg => {
        message += `  • \`${cfg}\`\n`;
      });
      message += `\n`;
    }

    if (node.optionalConfig.length > 0) {
      message += `*Optional Config:*\n`;
      node.optionalConfig.forEach(cfg => {
        message += `  • \`${cfg}\`\n`;
      });
      message += `\n`;
    }

    message += `*Default Configuration:*\n`;
    message += `\`\`\`json\n${JSON.stringify(node.defaultConfig, null, 2)}\n\`\`\`\n\n`;
    message += `Use \`/build\` to add this node to your workflow`;

    await this.safeSendMessage(chatId, message);
  }

  // =====================================================
  // WORKFLOW BUILDER MESSAGE HANDLER
  // =====================================================

  private async handleMessage(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;

    const rateLimit = this.isRateLimited(chatId);
    if (rateLimit.limited) {
      await this.safeSendMessage(chatId, rateLimit.message!);
      return;
    }

    const session = this.sessions.get(chatId);

    if (!session || !msg.text) return;

    const text = msg.text.trim();
    this.resetSessionTimeout(chatId);

    try {
      switch (session.step) {
        case 'mode_selection':
          await this.handleModeSelection(chatId, session, text);
          break;
        case 'template_selection':
          await this.handleTemplateSelection(chatId, session, text);
          break;
        case 'name':
          await this.handleWorkflowName(chatId, session, text);
          break;
        case 'description':
          await this.handleWorkflowDescription(chatId, session, text);
          break;
        case 'node_selection':
          await this.handleNodeSelection(chatId, session, text);
          break;
        case 'node_config':
          await this.handleNodeConfiguration(chatId, session, text);
          break;
        case 'connection':
          await this.handleNodeConnection(chatId, session, text);
          break;
        case 'advanced_config':
          await this.handleAdvancedConfig(chatId, session, text);
          break;
        case 'confirm':
          await this.handleWorkflowConfirm(chatId, session, text);
          break;
        default:
          logger.warn('Unknown session step', { chatId, step: session.step });
          await this.safeSendMessage(chatId, '❌ Unknown session state. Use /cancel and restart.');
          this.cleanupSession(chatId);
      }
    } catch (error: any) {
      logger.error('Message handling failed', {
        chatId,
        step: session.step,
        error: error.message,
        stack: error.stack
      });
      await this.safeSendMessage(chatId, '❌ Failed to process message. Please try again.');
    }
  }

  // =====================================================
  // WORKFLOW BUILDER STEPS
  // =====================================================

  private async handleModeSelection(
    chatId: number,
    session: WorkflowBuilderSession,
    text: string
  ) {
    const choice = text.trim();

    switch (choice) {
      case '1':
        session.mode = 'visual';
        session.step = 'name';
        await this.safeSendMessage(
          chatId,
          `🎨 *Visual Builder Mode*\n\n` +
          `Let's build your workflow node by node!\n\n` +
          `*Step 1:* What's your workflow name?`
        );
        break;

      case '2':
        session.mode = 'guided';
        session.step = 'template_selection';
        await this.handleTemplateSelection(chatId, session, '');
        break;

      case '3':
        session.mode = 'template';
        session.step = 'template_selection';
        await this.handleTemplateSelection(chatId, session, '');
        break;

      default:
        await this.safeSendMessage(
          chatId,
          `❌ Please choose 1, 2, or 3\n\n` +
          `1️⃣ Visual Builder\n` +
          `2️⃣ Guided Setup\n` +
          `3️⃣ Templates`
        );
    }
  }

  private async handleTemplateSelection(
    chatId: number,
    session: WorkflowBuilderSession,
    text: string
  ) {
    if (!text) {
      await this.safeSendMessage(
        chatId,
        `📋 *Workflow Templates:*\n\n` +
        `1️⃣ *Standard RAG* - Basic retrieval + answer\n` +
        `2️⃣ *Advanced RAG* - Query rewrite + rerank + answer\n` +
        `3️⃣ *Memory RAG* - Conversational with memory\n` +
        `4️⃣ *Fast RAG* - Minimal latency retrieval\n` +
        `5️⃣ *Custom* - Build from scratch\n\n` +
        `Reply with: \`1\`, \`2\`, \`3\`, \`4\`, or \`5\``
      );
      return;
    }

    let workflowType = '';
    let nodes: WorkflowNode[] = [];

    switch (text.trim()) {
      case '1':
        workflowType = 'Standard RAG';
        nodes = this.buildStandardRAGNodes();
        break;
      case '2':
        workflowType = 'Advanced RAG';
        nodes = this.buildAdvancedRAGNodes();
        break;
      case '3':
        workflowType = 'Memory RAG';
        nodes = this.buildMemoryRAGNodes();
        break;
      case '4':
        workflowType = 'Fast RAG';
        nodes = this.buildFastRAGNodes();
        break;
      case '5':
        session.step = 'name';
        await this.safeSendMessage(
          chatId,
          `🔧 *Custom Workflow*\n\n` +
          `Let's build your custom workflow!\n\n` +
          `*Step 1:* What's your workflow name?`
        );
        return;
      default:
        await this.safeSendMessage(chatId, '❌ Please choose 1, 2, 3, 4, or 5');
        return;
    }

    // Load template nodes
    nodes.forEach(node => {
      session.nodes.set(node.id, node);
    });

    session.step = 'name';
    await this.safeSendMessage(
      chatId,
      `✅ *${workflowType} Template Loaded*\n\n` +
      `Nodes: ${nodes.length}\n` +
      `Flow: ${this.visualizeWorkflowFlow(nodes)}\n\n` +
      `*Step 1:* What's your workflow name?`
    );
  }

  private async handleWorkflowName(
    chatId: number,
    session: WorkflowBuilderSession,
    text: string
  ) {
    if (text.length < 3) {
      await this.safeSendMessage(chatId, '❌ Workflow name must be at least 3 characters');
      return;
    }

    session.workflowName = text;
    session.step = 'description';

    await this.safeSendMessage(
      chatId,
      `✅ *Workflow name:* ${text}\n\n` +
      `*Step 2:* Add a description (or type "skip")`
    );
  }

  private async handleWorkflowDescription(
    chatId: number,
    session: WorkflowBuilderSession,
    text: string
  ) {
    // @ts-ignore
    session.workflowDescription = text === 'skip' ? undefined : text;

    if (session.nodes.size > 0) {
      // Template mode - go to confirmation
      session.step = 'advanced_config';
      await this.safeSendMessage(
        chatId,
        `*Step 3:* Advanced Configuration\n\n` +
        `Set vector index name (or type "skip"):\n\n` +
        `Example: \`my-documents-index\`\n` +
        `Or type: \`skip\``
      );
    } else {
      // Visual builder mode - start adding nodes
      session.step = 'node_selection';
      await this.showNodeSelectionMenu(chatId);
    }
  }

  private async showNodeSelectionMenu(chatId: number) {
    let message = `🧩 *Add Nodes to Workflow*\n\n`;
    message += `Select a node type to add:\n\n`;

    AVAILABLE_NODES.forEach((node, index) => {
      message += `${index + 1}. ${node.emoji} *${node.name}*\n`;
      message += `   ${node.description}\n\n`;
    });

    message += `Reply with node number (1-${AVAILABLE_NODES.length})\n`;
    message += `Or type \`done\` when finished adding nodes`;

    await this.safeSendMessage(chatId, message);
  }

  private async handleNodeSelection(
    chatId: number,
    session: WorkflowBuilderSession,
    text: string
  ) {
    if (text.toLowerCase() === 'done') {
      if (session.nodes.size === 0) {
        await this.safeSendMessage(
          chatId,
          '❌ You must add at least one node!\n\nSelect a node number to add.'
        );
        return;
      }

      session.step = 'connection';
      await this.showConnectionMenu(chatId, session);
      return;
    }

    const nodeIndex = parseInt(text) - 1;

    if (isNaN(nodeIndex) || nodeIndex < 0 || nodeIndex >= AVAILABLE_NODES.length) {
      await this.safeSendMessage(
        chatId,
        `❌ Invalid node number. Choose 1-${AVAILABLE_NODES.length} or type \`done\``
      );
      return;
    }

    const nodeTemplate = AVAILABLE_NODES[nodeIndex]!;
    const nodeId = `${nodeTemplate.type}_${uuidv4().substring(0, 8)}`;

    const newNode: WorkflowNode = {
      id: nodeId,
      type: nodeTemplate.type,
      config: JSON.parse(JSON.stringify(nodeTemplate.defaultConfig)),
      position: session.nodes.size
    };

    session.nodes.set(nodeId, newNode);
    session.currentNodeId = nodeId;
    session.step = 'node_config';

    await this.safeSendMessage(
      chatId,
      `✅ *Added: ${nodeTemplate.emoji} ${nodeTemplate.name}*\n\n` +
      `*Configure this node:*\n\n` +
      `Current config:\n\`\`\`json\n${JSON.stringify(newNode.config, null, 2)}\n\`\`\`\n\n` +
      `Options:\n` +
      `• Type \`keep\` to use defaults\n` +
      `• Type \`edit <key> <value>\` to modify\n` +
      `• Type \`done\` to finish configuring\n\n` +
      `Example: \`edit llm.temperature 0.5\``
    );
  }

  private async handleNodeConfiguration(
    chatId: number,
    session: WorkflowBuilderSession,
    text: string
  ) {
    if (!session.currentNodeId) {
      await this.safeSendMessage(chatId, '❌ No node selected');
      return;
    }

    const node = session.nodes.get(session.currentNodeId);
    if (!node) {
      await this.safeSendMessage(chatId, '❌ Node not found');
      return;
    }

    if (text.toLowerCase() === 'keep' || text.toLowerCase() === 'done') {
      session.step = 'node_selection';
      // @ts-ignore
      session.currentNodeId = undefined;

      await this.safeSendMessage(
        chatId,
        `✅ *Node configured!*\n\n` +
        `Current workflow: ${session.nodes.size} node(s)\n\n` +
        `Add another node or type \`done\` to connect nodes`
      );
      await this.showNodeSelectionMenu(chatId);
      return;
    }

    if (text.startsWith('edit ')) {
      const parts = text.substring(5).split(' ');
      if (parts.length < 2) {
        await this.safeSendMessage(
          chatId,
          '❌ Invalid format. Use: `edit <key> <value>`\n\nExample: `edit llm.temperature 0.5`'
        );
        return;
      }

      const key = parts[0]!;
      const value = parts.slice(1).join(' ');

      try {
        this.setNestedProperty(node.config, key, this.parseValue(value));
        
        await this.safeSendMessage(
          chatId,
          `✅ *Updated ${key}*\n\n` +
          `New config:\n\`\`\`json\n${JSON.stringify(node.config, null, 2)}\n\`\`\`\n\n` +
          `Continue editing or type \`done\``
        );
      } catch (error) {
        await this.safeSendMessage(
          chatId,
          `❌ Failed to update config: ${(error as Error).message}`
        );
      }
      return;
    }

    await this.safeSendMessage(
      chatId,
      '❌ Unknown command. Use:\n• `keep` - Keep defaults\n• `edit <key> <value>` - Modify config\n• `done` - Finish'
    );
  }

  private async showConnectionMenu(chatId: number, session: WorkflowBuilderSession) {
    const nodesList = Array.from(session.nodes.values());

    if (nodesList.length === 1) {
      // Single node - no connections needed
      session.step = 'advanced_config';
      await this.safeSendMessage(
        chatId,
        `✅ *Workflow structure complete!*\n\n` +
        `Single node workflow (no connections needed)\n\n` +
        `*Step 4:* Advanced Configuration\n\n` +
        `Set vector index name (or type "skip"):`
      );
      return;
    }

    let message = `🔗 *Connect Your Nodes*\n\n`;
    message += `Current nodes:\n`;

    nodesList.forEach((node, index) => {
      const nodeTemplate = AVAILABLE_NODES.find(n => n.type === node.type);
      message += `${index + 1}. ${nodeTemplate?.emoji} ${nodeTemplate?.name} (ID: \`${node.id}\`)\n`;
    });

    message += `\n*Create connections:*\n`;
    message += `Format: \`connect <from> <to>\`\n`;
    message += `Example: \`connect 1 2\`\n\n`;
    message += `Or type \`auto\` for automatic sequential connections\n`;
    message += `Type \`done\` when finished`;

    await this.safeSendMessage(chatId, message);
  }

  private async handleNodeConnection(
    chatId: number,
    session: WorkflowBuilderSession,
    text: string
  ) {
    if (text.toLowerCase() === 'done') {
      if (session.nodes.size > 1 && session.pendingConnections.length === 0) {
        await this.safeSendMessage(
          chatId,
          '⚠️ No connections defined! Type `auto` for automatic connections or create manual connections.'
        );
        return;
      }

      // Apply connections
      this.applyConnections(session);

      session.step = 'advanced_config';
      await this.safeSendMessage(
        chatId,
        `✅ *Connections applied!*\n\n` +
        `Flow: ${this.visualizeWorkflowFlow(Array.from(session.nodes.values()))}\n\n` +
        `*Step 5:* Advanced Configuration\n\n` +
        `Set vector index name (or type "skip"):`
      );
      return;
    }

    if (text.toLowerCase() === 'auto') {
      // Auto-connect nodes sequentially
      const nodesList = Array.from(session.nodes.values()).sort((a, b) => 
        (a.position || 0) - (b.position || 0)
      );

      session.pendingConnections = [];
      for (let i = 0; i < nodesList.length - 1; i++) {
        session.pendingConnections.push({
          from: nodesList[i]!.id,
          to: nodesList[i + 1]!.id
        });
      }

      this.applyConnections(session);

      await this.safeSendMessage(
        chatId,
        `✅ *Auto-connected ${session.pendingConnections.length} node(s) sequentially!*\n\n` +
        `Flow: ${this.visualizeWorkflowFlow(nodesList)}\n\n` +
        `Type \`done\` to continue or add more connections`
      );
      return;
    }

    if (text.startsWith('connect ')) {
      const parts = text.substring(8).split(' ');
      if (parts.length !== 2) {
        await this.safeSendMessage(
          chatId,
          '❌ Invalid format. Use: `connect <from> <to>`\n\nExample: `connect 1 2`'
        );
        return;
      }

      const fromIndex = parseInt(parts[0]!) - 1;
      const toIndex = parseInt(parts[1]!) - 1;
      const nodesList = Array.from(session.nodes.values());

      if (
        isNaN(fromIndex) || isNaN(toIndex) ||
        fromIndex < 0 || fromIndex >= nodesList.length ||
        toIndex < 0 || toIndex >= nodesList.length
      ) {
        await this.safeSendMessage(
          chatId,
          `❌ Invalid node indices. Choose between 1-${nodesList.length}`
        );
        return;
      }

      const fromNode = nodesList[fromIndex]!;
      const toNode = nodesList[toIndex]!;

      session.pendingConnections.push({
        from: fromNode.id,
        to: toNode.id
      });

      await this.safeSendMessage(
        chatId,
        `✅ *Connection added:* ${fromIndex + 1} → ${toIndex + 1}\n\n` +
        `Total connections: ${session.pendingConnections.length}\n\n` +
        `Add more connections or type \`done\``
      );
      return;
    }

    await this.safeSendMessage(
      chatId,
      '❌ Unknown command. Use:\n• `connect <from> <to>` - Connect nodes\n• `auto` - Auto-connect\n• `done` - Finish'
    );
  }

  private applyConnections(session: WorkflowBuilderSession) {
    session.pendingConnections.forEach(conn => {
      const fromNode = session.nodes.get(conn.from);
      if (fromNode) {
        if (!fromNode.nextSteps) {
          fromNode.nextSteps = [];
        }
        if (!fromNode.nextSteps.includes(conn.to)) {
          fromNode.nextSteps.push(conn.to);
        }
      }
    });
  }

  private async handleAdvancedConfig(
    chatId: number,
    session: WorkflowBuilderSession,
    text: string
  ) {
    if (text.toLowerCase() !== 'skip') {
      session.configuration.vectorIndexName = text;
      session.configuration.vectorNamespace = `${text}-namespace`;
    }

    session.step = 'confirm';

    const nodesList = Array.from(session.nodes.values());

    let summary = `📋 *Workflow Summary*\n\n`;
    summary += `*Name:* ${session.workflowName}\n`;
    if (session.workflowDescription) {
      summary += `*Description:* ${session.workflowDescription}\n`;
    }
    summary += `*Mode:* ${session.mode}\n`;
    summary += `*Nodes:* ${nodesList.length}\n\n`;

    summary += `*Workflow Structure:*\n`;
    summary += this.visualizeWorkflowFlow(nodesList);
    summary += `\n\n`;

    if (session.configuration.vectorIndexName) {
      summary += `*Vector Index:* ${session.configuration.vectorIndexName}\n`;
    }
    summary += `*Cache:* ${session.configuration.cacheEnabled ? 'Enabled' : 'Disabled'}\n`;
    summary += `*Cache TTL:* ${session.configuration.cacheTTL}s\n\n`;

    summary += `Type \`confirm\` to create or \`cancel\` to abort\n`;
    summary += `Type \`edit nodes\` to modify nodes\n`;
    summary += `Type \`edit connections\` to modify connections`;

    await this.safeSendMessage(chatId, summary);
  }

  private async handleWorkflowConfirm(
    chatId: number,
    session: WorkflowBuilderSession,
    text: string
  ) {
    if (text.toLowerCase() === 'cancel') {
      this.cleanupSession(chatId);
      await this.safeSendMessage(chatId, '❌ Workflow creation cancelled');
      return;
    }

    if (text.toLowerCase() === 'edit nodes') {
      session.step = 'node_selection';
      await this.showNodeSelectionMenu(chatId);
      return;
    }

    if (text.toLowerCase() === 'edit connections') {
      session.step = 'connection';
      await this.showConnectionMenu(chatId, session);
      return;
    }

    if (text.toLowerCase() !== 'confirm') {
      // If workflow has answer_generation node, treat as query
      const hasAnswerGen = Array.from(session.nodes.values()).some(
        n => n.type === 'answer_generation'
      );

      if (hasAnswerGen && session.configuration.vectorIndexName) {
        // Create workflow first, then execute query
        try {
          const workflowConfig = this.buildWorkflowConfig(session);
          const workflow = await prisma.workflow.create({
            data: {
              name: session.workflowName!,
              description: session.workflowDescription || 'Created via Telegram Bot',
              userId: session.userId,
              configuration: workflowConfig as any,
              status: 'active',
              version: 1
            }
          });

          await this.executeWorkflowQuery(chatId, session.userId, workflow.id, text);
          this.cleanupSession(chatId);
          return;
        } catch (error) {
          logger.error('Auto-create and execute failed', { error });
        }
      }

      await this.safeSendMessage(
        chatId,
        '❌ Please type:\n• `confirm` - Create workflow\n• `edit nodes` - Modify nodes\n• `edit connections` - Modify connections\n• `cancel` - Abort'
      );
      return;
    }

    // CREATE WORKFLOW
    try {
      const workflowConfig = this.buildWorkflowConfig(session);

      const workflow = await prisma.workflow.create({
        data: {
          name: session.workflowName!,
          description: session.workflowDescription || 'Created via Telegram Bot',
          userId: session.userId,
          configuration: workflowConfig as any,
          status: 'active',
          version: 1
        }
      });

      this.cleanupSession(chatId);

      const nodesList = Array.from(session.nodes.values());

      await this.safeSendMessage(
        chatId,
        `✅ *Workflow Created Successfully!*\n\n` +
        `*Name:* ${workflow.name}\n` +
        `*ID:* \`${workflow.id}\`\n` +
        `*Nodes:* ${nodesList.length}\n` +
        `*Connections:* ${this.countConnections(nodesList)}\n\n` +
        `*Structure:*\n${this.visualizeWorkflowFlow(nodesList)}\n\n` +
        `*Usage:*\n` +
        `• Run: \`/run ${workflow.name}\`\n` +
        `• Query: \`/query <question>\`\n` +
        `• View: \`/view ${workflow.name}\`\n` +
        `• Clone: \`/clone ${workflow.name}\``
      );

      logger.info('Workflow created via Telegram Builder', {
        workflowId: workflow.id,
        userId: session.userId,
        chatId,
        nodes: nodesList.length,
        mode: session.mode
      });

    } catch (error: any) {
      logger.error('Failed to create workflow', {
        error: error.message,
        chatId,
        session
      });
      await this.safeSendMessage(
        chatId,
        '❌ Failed to create workflow. Please try again.'
      );
    }
  }

  // =====================================================
  // VIEW WORKFLOW STRUCTURE
  // =====================================================

  private async handleViewWorkflow(msg: TelegramBot.Message, workflowName?: string) {
    const chatId = msg.chat.id;
    const userId = this.userMapping.get(chatId);

    const rateLimit = this.isRateLimited(chatId);
    if (rateLimit.limited) {
      await this.safeSendMessage(chatId, rateLimit.message!);
      return;
    }

    if (!userId) {
      await this.safeSendMessage(chatId, '❌ Please login first');
      return;
    }

    if (!workflowName) {
      await this.safeSendMessage(chatId, '❌ Usage: `/view <workflow_name>`');
      return;
    }

    try {
      const workflow = await prisma.workflow.findFirst({
        where: { userId, name: workflowName }
      });

      if (!workflow) {
        await this.safeSendMessage(chatId, `❌ Workflow "${workflowName}" not found`);
        return;
      }

      const config = workflow.configuration as any;
      const steps = config.steps || [];

      let message = `🔍 *Workflow Details*\n\n`;
      message += `*Name:* ${workflow.name}\n`;
      message += `*ID:* \`${workflow.id}\`\n`;
      message += `*Status:* ${workflow.status}\n`;
      message += `*Version:* ${workflow.version}\n`;
      if (workflow.description) {
        message += `*Description:* ${workflow.description}\n`;
      }
      message += `*Created:* ${workflow.createdAt.toLocaleDateString()}\n\n`;

      message += `*Nodes:* ${steps.length}\n`;
      message += `*Structure:*\n${this.visualizeWorkflowFlow(steps)}\n\n`;

      message += `*Configuration:*\n`;
      if (config.vectorIndexName) {
        message += `• Vector Index: \`${config.vectorIndexName}\`\n`;
      }
      message += `• Cache: ${config.cacheEnabled ? 'Enabled' : 'Disabled'}\n`;
      if (config.cacheTTL) {
        message += `• Cache TTL: ${config.cacheTTL}s\n`;
      }

      message += `\n*Actions:*\n`;
      message += `• Run: \`/run ${workflow.name}\`\n`;
      message += `• Clone: \`/clone ${workflow.name}\`\n`;
      message += `• Delete: \`/delete ${workflow.name}\``;

      await this.safeSendMessage(chatId, message);

    } catch (error) {
      logger.error('Failed to view workflow', { error, workflowName, userId });
      await this.safeSendMessage(chatId, '❌ Failed to retrieve workflow details');
    }
  }

  // =====================================================
  // CLONE WORKFLOW
  // =====================================================

  private async handleCloneWorkflow(msg: TelegramBot.Message, workflowName?: string) {
    const chatId = msg.chat.id;
    const userId = this.userMapping.get(chatId);

    const rateLimit = this.isRateLimited(chatId);
    if (rateLimit.limited) {
      await this.safeSendMessage(chatId, rateLimit.message!);
      return;
    }

    if (!userId) {
      await this.safeSendMessage(chatId, '❌ Please login first');
      return;
    }

    if (!workflowName) {
      await this.safeSendMessage(chatId, '❌ Usage: `/clone <workflow_name>`');
      return;
    }

    try {
      const sourceWorkflow = await prisma.workflow.findFirst({
        where: { userId, name: workflowName }
      });

      if (!sourceWorkflow) {
        await this.safeSendMessage(chatId, `❌ Workflow "${workflowName}" not found`);
        return;
      }

      const clonedName = `${workflowName} (Copy)`;

      const clonedWorkflow = await prisma.workflow.create({
        data: {
          name: clonedName,
          description: sourceWorkflow.description,
          userId: userId,
          // @ts-ignore
          configuration: sourceWorkflow.configuration,
          status: 'draft',
          version: 1
        }
      });

      const config = clonedWorkflow.configuration as any;
      const steps = config.steps || [];

      await this.safeSendMessage(
        chatId,
        `✅ *Workflow Cloned Successfully!*\n\n` +
        `*Original:* ${workflowName}\n` +
        `*Clone:* ${clonedName}\n` +
        `*ID:* \`${clonedWorkflow.id}\`\n` +
        `*Nodes:* ${steps.length}\n` +
        `*Status:* draft (activate to use)\n\n` +
        `Use \`/run ${clonedName}\` to test it`
      );

      logger.info('Workflow cloned via Telegram', {
        sourceId: sourceWorkflow.id,
        cloneId: clonedWorkflow.id,
        userId,
        chatId
      });

    } catch (error) {
      logger.error('Failed to clone workflow', { error, workflowName, userId });
      await this.safeSendMessage(chatId, '❌ Failed to clone workflow');
    }
  }

  // =====================================================
  // HELPER FUNCTIONS
  // =====================================================

  private buildWorkflowConfig(session: WorkflowBuilderSession): WorkflowConfig {
    const steps = Array.from(session.nodes.values()).map(node => ({
      id: node.id,
      type: node.type as any,
      config: node.config,
      nextSteps: node.nextSteps
    }));

    return {
      id: uuidv4(),
      name: session.workflowName!,
      // @ts-ignore
      steps: steps,
      cacheEnabled: session.configuration.cacheEnabled,
      cacheTTL: session.configuration.cacheTTL,
      vectorIndexName: session.configuration.vectorIndexName,
      vectorNamespace: session.configuration.vectorNamespace
    };
  }

  private visualizeWorkflowFlow(nodes: WorkflowNode[]): string {
    if (nodes.length === 0) return 'No nodes';

    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const visited = new Set<string>();
    const lines: string[] = [];

    const getNodeEmoji = (type: string): string => {
      const template = AVAILABLE_NODES.find(n => n.type === type);
      return template?.emoji || '📦';
    };

    const getNodeName = (type: string): string => {
      const template = AVAILABLE_NODES.find(n => n.type === type);
      return template?.name || type;
    };

    const buildFlow = (nodeId: string, indent: string = '', isLast: boolean = true): void => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = nodeMap.get(nodeId);
      if (!node) return;

      const prefix = indent + (isLast ? '└─ ' : '├─ ');
      const emoji = getNodeEmoji(node.type);
      const name = getNodeName(node.type);
      
      lines.push(`${prefix}${emoji} ${name}`);

      if (node.nextSteps && node.nextSteps.length > 0) {
        const childIndent = indent + (isLast ? '   ' : '│  ');
        node.nextSteps.forEach((nextId, index) => {
          const isLastChild = index === node.nextSteps!.length - 1;
          buildFlow(nextId, childIndent, isLastChild);
        });
      }
    };

    // Find entry nodes (nodes with no incoming connections)
    const hasIncoming = new Set<string>();
    nodes.forEach(node => {
      node.nextSteps?.forEach(nextId => hasIncoming.add(nextId));
    });

    const entryNodes = nodes.filter(n => !hasIncoming.has(n.id));

    if (entryNodes.length === 0 && nodes.length > 0) {
      buildFlow(nodes[0]!.id);
    } else {
      entryNodes.forEach((node, index) => {
        buildFlow(node.id, '', index === entryNodes.length - 1);
      });
    }

    return lines.join('\n');
  }

  private countConnections(nodes: WorkflowNode[]): number {
    return nodes.reduce((count, node) => count + (node.nextSteps?.length || 0), 0);
  }

  private setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]!;
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]!] = value;
  }

  private parseValue(value: string): any {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (!isNaN(Number(value)) && value.trim() !== '') return Number(value);
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private buildStandardRAGNodes(): WorkflowNode[] {
    return [
      {
        id: 'retrieval_1',
        type: 'retrieval',
        config: {
          retriever: { type: 'qdrant', config: { topK: 10 } }
        },
        nextSteps: ['answer_1'],
        position: 0
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
          }
        },
        position: 1
      }
    ];
  }

  private buildAdvancedRAGNodes(): WorkflowNode[] {
    return [
      {
        id: 'query_rewrite_1',
        type: 'query_rewrite',
        config: {
          llm: {
            provider: 'openai',
            model: 'gpt-3.5-turbo',
            temperature: 0.3,
            maxTokens: 400
          }
        },
        nextSteps: ['retrieval_1'],
        position: 0
      },
      {
        id: 'retrieval_1',
        type: 'retrieval',
        config: {
          retriever: { type: 'qdrant', config: { topK: 15 } }
        },
        nextSteps: ['rerank_1'],
        position: 1
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
        nextSteps: ['answer_1'],
        position: 2
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
          }
        },
        position: 3
      }
    ];
  }

  private buildMemoryRAGNodes(): WorkflowNode[] {
    return [
      {
        id: 'query_rewrite_1',
        type: 'query_rewrite',
        config: {
          llm: {
            provider: 'openai',
            model: 'gpt-3.5-turbo',
            temperature: 0.3,
            maxTokens: 400
          }
        },
        nextSteps: ['retrieval_1', 'memory_retrieve_1'],
        position: 0
      },
      {
        id: 'retrieval_1',
        type: 'retrieval',
        config: {
          retriever: { type: 'qdrant', config: { topK: 10 } }
        },
        nextSteps: ['rerank_1'],
        position: 1
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
        nextSteps: ['answer_1'],
        position: 2
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
        nextSteps: ['answer_1'],
        position: 3
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
          }
        },
        nextSteps: ['memory_update_1'],
        position: 4
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
        },
        position: 5
      }
    ];
  }

  private buildFastRAGNodes(): WorkflowNode[] {
    return [
      {
        id: 'retrieval_1',
        type: 'retrieval',
        config: {
          retriever: { type: 'qdrant', config: { topK: 5 } }
        },
        nextSteps: ['answer_1'],
        position: 0
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
          }
        },
        position: 1
      }
    ];
  }

  // =====================================================
  // EXISTING METHODS (KEPT FOR COMPATIBILITY)
  // =====================================================

  private async handleStart(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;

    const rateLimit = this.isRateLimited(chatId);
    if (rateLimit.limited) {
      await this.safeSendMessage(chatId, rateLimit.message!);
      return;
    }

    // @ts-ignore
    await this.safeSendMessage(
      
chatId,
`🤖 *Welcome to R8R Workflow Bot!*\n\n` +
`Build and manage AI workflows with ease.\n\n` +
`*🏗️ Workflow Creation:*\n` +
`/build - Visual node-based builder\n` +
`/create - Guided workflow creation\n` +
`/nodes - View available nodes\n` +
`/node <type> - Node details\n\n` +
`*📊 Workflow Management:*\n` +
`/list - List your workflows\n` +
`/view <name> - View workflow details\n` +
`/run <name> - Execute workflow\n` +
`/clone <name> - Clone workflow\n` +
`/delete <name> - Delete workflow\n\n` +
`*🔑 Account:*\n` +
`/register - Create account\n` +
`/login - Login\n` +
`/link - Link existing account\n\n` +
`/help - Show detailed help\n` +
`/status - Check bot status`
);
  }

  private async handleHelp(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;

    const rateLimit = this.isRateLimited(chatId);
    if (rateLimit.limited) {
      await this.safeSendMessage(chatId, rateLimit.message!);
      return;
    }

    await this.safeSendMessage(
      chatId,
      `📚 *R8R Workflow Bot - Complete Guide*\n\n` +
      `*🏗️ Building Workflows:*\n\n` +
      `\`/build\` - Start visual workflow builder\n` +
      `  • Add nodes one by one\n` +
      `  • Configure each node\n` +
      `  • Connect nodes visually\n` +
      `  • Full control over flow\n\n` +
      `\`/create\` - Guided workflow wizard\n` +
      `  • Choose from templates\n` +
      `  • Quick setup\n` +
      `  • Best for beginners\n\n` +
      `\`/nodes\` - List all available nodes\n` +
      `\`/node <type>\` - View node details\n\n` +
      `*📦 Available Node Types:*\n` +
      `• 🔄 Query Rewrite - Optimize queries\n` +
      `• 📚 Retrieval - Get documents\n` +
      `• 🎯 Rerank - Filter results\n` +
      `• 🤖 Answer Generation - Generate responses\n` +
      `• 🧠 Memory Retrieve - Get past context\n` +
      `• 💾 Memory Update - Save conversations\n` +
      `• 📝 Memory Summarize - Condense history\n` +
      `• ✨ Post Process - Format output\n\n` +
      `*🔧 Workflow Management:*\n` +
      `\`/list\` - Show all workflows\n` +
      `\`/view <name>\` - Inspect structure\n` +
      `\`/run <name>\` - Execute workflow\n` +
      `\`/clone <name>\` - Duplicate workflow\n` +
      `\`/delete <name>\` - Remove workflow\n\n` +
      `*💬 Quick Actions:*\n` +
      `\`/query <question>\` - Run default workflow\n` +
      `\`/cancel\` - Abort current operation\n` +
      `\`/status\` - Check your session\n\n` +
      `Need help? Just ask!`
    );
  }

  // =====================================================
  // EXISTING ACCOUNT MANAGEMENT METHODS
  // =====================================================

  private async handleRegister(
    msg: TelegramBot.Message,
    match: RegExpMatchArray | null
  ) {
    const chatId = msg.chat.id;

    const rateLimit = this.isRateLimited(chatId);
    if (rateLimit.limited) {
      await this.safeSendMessage(chatId, rateLimit.message!);
      return;
    }

    if (!match || match.length < 4) {
      await this.safeSendMessage(
        chatId,
        '❌ *Usage:* `/register <email> <password> <name>`'
      );
      return;
    }

    const [, email, password, name] = match;
// @ts-ignore
    if (!this.isValidEmail(email)) {
      await this.safeSendMessage(chatId, '❌ Invalid email format');
      return;
    }
// @ts-ignore
    if (password.length < 6) {
      await this.safeSendMessage(chatId, '❌ Password must be at least 6 characters');
      return;
    }
// @ts-ignore
    if (name.length < 2) {
      await this.safeSendMessage(chatId, '❌ Name must be at least 2 characters');
      return;
    }

    try {
      // @ts-ignore
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        await this.safeSendMessage(chatId, '❌ Email already registered!');
        return;
      }

      const bcrypt = await import('bcrypt');
      // @ts-ignore
      const hashedPassword = await bcrypt.hash(password, 12);

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

      await this.safeSendMessage(
        chatId,
        `✅ *Registration Successful!*\n\n` +
        `Welcome, *${name}*!\n\n` +
        `🔑 *Your API Key:* \`${apiKey}\`\n\n` +
        `Save this key securely. You can now build workflows!\n\n` +
        `Get started:\n` +
        `• \`/build\` - Visual builder\n` +
        `• \`/create\` - Guided setup\n` +
        `• \`/nodes\` - View available nodes`
      );

      logger.info('User registered via Telegram', { userId: user.id, chatId });
    } catch (error) {
      logger.error('Registration failed', { error, chatId });
      await this.safeSendMessage(chatId, '❌ Registration failed. Please try again.');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private async handleLogin(
    msg: TelegramBot.Message,
    match: RegExpMatchArray | null
  ) {
    const chatId = msg.chat.id;

    const rateLimit = this.isRateLimited(chatId);
    if (rateLimit.limited) {
      await this.safeSendMessage(chatId, rateLimit.message!);
      return;
    }

    if (!match || match.length < 3) {
      await this.safeSendMessage(chatId, '❌ Usage: `/login <email> <password>`');
      return;
    }

    const [, email, password] = match;

    try {
      const user = await prisma.user.findUnique({
        // @ts-ignore
        where: { email },
        select: { id: true, email: true, name: true, password: true }
      });

      if (!user) {
        await this.safeSendMessage(chatId, '❌ User not found!');
        return;
      }

      const bcrypt = await import('bcrypt');
      // @ts-ignore
      const valid = await bcrypt.compare(password, user.password);

      if (!valid) {
        await this.safeSendMessage(chatId, '❌ Invalid password!');
        return;
      }

      this.userMapping.set(chatId, user.id);

      await this.safeSendMessage(
        chatId,
        `✅ *Login Successful!*\n\n` +
        `Welcome back, *${user.name}*!\n\n` +
        `Ready to build workflows:\n` +
        `• \`/build\` - Visual builder\n` +
        `• \`/create\` - Guided setup\n` +
        `• \`/list\` - View your workflows`
      );

      logger.info('Login successful', { userId: user.id, email: user.email });

    } catch (error) {
      logger.error('Login failed', { error, chatId });
      await this.safeSendMessage(chatId, '❌ Login failed. Please try again.');
    }
  }

  private async handleLinkAccount(
    msg: TelegramBot.Message,
    match: RegExpMatchArray | null
  ) {
    const chatId = msg.chat.id;

    const rateLimit = this.isRateLimited(chatId);
    if (rateLimit.limited) {
      await this.safeSendMessage(chatId, rateLimit.message!);
      return;
    }

    if (!match || !match[1]) {
      await this.safeSendMessage(
        chatId,
        '🔗 *Link Your Account*\n\n' +
        'Usage: `/link <your_api_key>`\n\n' +
        'Get your API key from the website dashboard.'
      );
      return;
    }

    const apiKey = match[1].trim();

    try {
      const apiKeyRecord = await prisma.apiKey.findFirst({
        where: { key: apiKey },
        include: { user: true }
      });

      if (!apiKeyRecord) {
        await this.safeSendMessage(chatId, '❌ Invalid API key');
        return;
      }

      this.userMapping.set(chatId, apiKeyRecord.user.id);

      await this.safeSendMessage(
        chatId,
        `✅ *Account Linked Successfully!*\n\n` +
        `Welcome back, *${apiKeyRecord.user.name}*!\n\n` +
        `You can now use all workflow commands.`
      );

      logger.info('Account linked via Telegram', { userId: apiKeyRecord.user.id, chatId });
    } catch (error) {
      logger.error('Account linking failed', { error, chatId });
      await this.safeSendMessage(chatId, '❌ Failed to link account');
    }
  }

  // =====================================================
  // EXISTING WORKFLOW OPERATIONS
  // =====================================================

  private async handleCreateWorkflow(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const userId = this.userMapping.get(chatId);

    const rateLimit = this.isRateLimited(chatId);
    if (rateLimit.limited) {
      await this.safeSendMessage(chatId, rateLimit.message!);
      return;
    }

    if (!userId) {
      await this.safeSendMessage(
        chatId,
        '❌ Please login first using `/login <email> <password>` or `/link <api_key>`'
      );
      return;
    }

    // Initialize guided creation session
    this.sessions.set(chatId, {
      userId,
      mode: 'guided',
      step: 'template_selection',
      nodes: new Map(),
      pendingConnections: [],
      configuration: {
        cacheEnabled: true,
        cacheTTL: 3600
      },
      createdAt: Date.now()
    });

    this.resetSessionTimeout(chatId);

    await this.handleTemplateSelection(chatId, this.sessions.get(chatId)!, '');
  }

  private async handleCancelCreation(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;

    const rateLimit = this.isRateLimited(chatId);
    if (rateLimit.limited) {
      await this.safeSendMessage(chatId, rateLimit.message!);
      return;
    }

    const session = this.sessions.get(chatId);

    if (session) {
      this.cleanupSession(chatId);
      await this.safeSendMessage(chatId, '❌ Workflow creation cancelled.');
    } else {
      await this.safeSendMessage(chatId, 'No active workflow creation session.');
    }
  }

  private async handleListWorkflows(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const userId = this.userMapping.get(chatId);

    const rateLimit = this.isRateLimited(chatId);
    if (rateLimit.limited) {
      await this.safeSendMessage(chatId, rateLimit.message!);
      return;
    }

    if (!userId) {
      await this.safeSendMessage(chatId, '❌ Please login first');
      return;
    }

    try {
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
        await this.safeSendMessage(
          chatId,
          '📋 You have no workflows yet.\n\n' +
          'Create one with:\n' +
          '• `/build` - Visual builder\n' +
          '• `/create` - Guided setup'
        );
        return;
      }

      let message = '📋 *Your Workflows:*\n\n';

      workflows.forEach((wf, i) => {
        const config = wf.configuration as any;
        const nodeCount = config.steps?.length || 0;

        message += `*${i + 1}. ${wf.name}*\n`;
        message += `   Status: ${wf.status}\n`;
        message += `   Nodes: ${nodeCount}\n`;
        message += `   Version: ${wf.version}\n`;
        message += `   Queries: ${wf.queryLogs.length}\n`;

        if (wf.analytics) {
          const successRate = wf.analytics.totalQueries > 0
            ? ((wf.analytics.successfulQueries / wf.analytics.totalQueries) * 100).toFixed(1)
            : '0.0';
          message += `   Success Rate: ${successRate}%\n`;
        }

        message += `   Created: ${wf.createdAt.toLocaleDateString()}\n\n`;
      });

      message += `*Actions:*\n`;
      message += `• View: \`/view <name>\`\n`;
      message += `• Run: \`/run <name>\`\n`;
      message += `• Clone: \`/clone <name>\`\n`;
      message += `• Delete: \`/delete <name>\`\n`;
      message += `• Quick query: \`/query <question>\``;

      await this.safeSendMessage(chatId, message);
    } catch (error) {
      logger.error('Failed to list workflows', { error, userId });
      await this.safeSendMessage(chatId, '❌ Failed to list workflows');
    }
  }

  private async handleDeleteWorkflow(msg: TelegramBot.Message, workflowName?: string) {
    const chatId = msg.chat.id;
    const userId = this.userMapping.get(chatId);

    const rateLimit = this.isRateLimited(chatId);
    if (rateLimit.limited) {
      await this.safeSendMessage(chatId, rateLimit.message!);
      return;
    }

    if (!userId) {
      await this.safeSendMessage(chatId, '❌ Please login first');
      return;
    }

    if (!workflowName) {
      await this.safeSendMessage(chatId, '❌ Usage: `/delete <workflow_name>`');
      return;
    }

    try {
      const workflow = await prisma.workflow.findFirst({
        where: { userId, name: workflowName }
      });

      if (!workflow) {
        await this.safeSendMessage(chatId, `❌ Workflow "${workflowName}" not found`);
        return;
      }

      await prisma.queryLog.deleteMany({
        where: { workflowId: workflow.id }
      });

      await prisma.workflowAnalytics.deleteMany({
        where: { workflowId: workflow.id }
      });

      await prisma.workflow.delete({
        where: { id: workflow.id }
      });

      await this.safeSendMessage(
        chatId,
        `🗑️ *Workflow Deleted Successfully!*\n\n` +
        `*Name:* ${workflow.name}\n` +
        `*ID:* ${workflow.id}\n\n` +
        `All related data has been removed.`
      );

      logger.info('Workflow deleted via Telegram', { workflowId: workflow.id, userId });

    } catch (error) {
      logger.error('Failed to delete workflow', { error, workflowName, userId });
      await this.safeSendMessage(chatId, '❌ Failed to delete workflow');
    }
  }

  private async handleStatus(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;

    const rateLimit = this.isRateLimited(chatId);
    if (rateLimit.limited) {
      await this.safeSendMessage(chatId, rateLimit.message!);
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
      } catch (error) {
        statusMessage += `*User Info:* Error fetching\n`;
      }
    } else {
      statusMessage += `❌ *Logged In:* No\n`;
    }

    if (session) {
      statusMessage += `\n🔄 *Active Session:* Yes\n`;
      statusMessage += `*Mode:* ${session.mode}\n`;
      statusMessage += `*Step:* ${session.step}\n`;
      statusMessage += `*Workflow:* ${session.workflowName || 'Not set'}\n`;
      statusMessage += `*Nodes:* ${session.nodes.size}\n`;
    } else {
      statusMessage += `\n⏸️ *Active Session:* No\n`;
    }

    statusMessage += `\n*Session Stats:*\n`;
    statusMessage += `Active Sessions: ${this.sessions.size}\n`;
    statusMessage += `Logged In Users: ${this.userMapping.size}\n`;

    await this.safeSendMessage(chatId, statusMessage);
  }

  private async handleRunWorkflow(
    msg: TelegramBot.Message,
    workflowName?: string
  ) {
    const chatId = msg.chat.id;
    const userId = this.userMapping.get(chatId);

    const rateLimit = this.isRateLimited(chatId);
    if (rateLimit.limited) {
      await this.safeSendMessage(chatId, rateLimit.message!);
      return;
    }

    if (!userId) {
      await this.safeSendMessage(chatId, '❌ Please login first');
      return;
    }

    if (!workflowName) {
      await this.safeSendMessage(chatId, '❌ Usage: `/run <workflow_name>`');
      return;
    }

    try {
      const workflow = await prisma.workflow.findFirst({
        where: { userId, name: workflowName }
      });

      if (!workflow) {
        await this.safeSendMessage(chatId, `❌ Workflow "${workflowName}" not found`);
        return;
      }

      this.sessions.set(chatId, {
        userId,
        mode: 'visual',
        step: 'confirm',
        workflowName: workflow.name,
        nodes: new Map(),
        pendingConnections: [],
        configuration: {
          cacheEnabled: true,
          cacheTTL: 3600,
          workflowId: workflow.id
        } as any,
        createdAt: Date.now()
      });

      this.resetSessionTimeout(chatId);

      await this.safeSendMessage(
        chatId,
        `🚀 *Ready to execute:* ${workflow.name}\n\n` +
        `Send me your query and I'll process it through the workflow...\n\n` +
        `Or type \`/cancel\` to abort.`
      );

    } catch (error) {
      logger.error('Workflow execution setup failed', { error, workflowName });
      await this.safeSendMessage(chatId, '❌ Failed to setup workflow execution');
    }
  }

  private async handleDirectQuery(
    msg: TelegramBot.Message,
    query?: string
  ) {
    const chatId = msg.chat.id;
    const userId = this.userMapping.get(chatId);

    const rateLimit = this.isRateLimited(chatId);
    if (rateLimit.limited) {
      await this.safeSendMessage(chatId, rateLimit.message!);
      return;
    }

    if (!userId) {
      await this.safeSendMessage(chatId, '❌ Please login first');
      return;
    }

    if (!query) {
      await this.safeSendMessage(chatId, '❌ Usage: `/query <your_question>`');
      return;
    }

    try {
      const workflow = await prisma.workflow.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });

      if (!workflow) {
        await this.safeSendMessage(
          chatId,
          '❌ No workflows found. Create one with:\n' +
          '• `/build` - Visual builder\n' +
          '• `/create` - Guided setup'
        );
        return;
      }

      await this.executeWorkflowQuery(chatId, userId, workflow.id, query);

    } catch (error) {
      logger.error('Direct query failed', { error, query });
      await this.safeSendMessage(chatId, '❌ Failed to process query');
    }
  }

  private async executeWorkflowQuery(
    chatId: number,
    userId: string,
    workflowId: string,
    query: string
  ): Promise<void> {
    try {
      await this.safeSendMessage(chatId, `🔄 Processing your query...`);

      const workflow = await prisma.workflow.findFirst({
        where: { id: workflowId, userId }
      });

      if (!workflow) {
        await this.safeSendMessage(chatId, '❌ Workflow not found');
        return;
      }

      const result = await this.workflowExecutor.executeWorkflow(
        workflow.configuration as any,
        query,
        userId
      );

      let response = `✅ *Workflow Result:*\n\n`;

      if (result.answer) {
        response += `${result.answer}\n\n`;
      }

      if (result.sources && result.sources.length > 0) {
        response += `📚 Sources: ${result.sources.length}\n`;
      }
// @ts-ignore
      response += `📊 Confidence: ${Math.round(result.confidence * 100)}%\n`;
      response += `⏱️ Latency: ${result.latency}ms\n`;
      response += `🔧 Type: ${result.workflowType}`;

      await this.safeSendMessage(chatId, response);

      logger.info('Workflow executed via Telegram', {
        workflowId,
        userId,
        chatId,
        latency: result.latency,
        confidence: result.confidence
      });

    } catch (error) {
      logger.error('Workflow execution failed', { error, workflowId, userId });
      await this.safeSendMessage(
        chatId,
        '❌ Failed to execute workflow. Please check workflow configuration.'
      );
    }
  }

  // =====================================================
  // RATE LIMITING & SESSION MANAGEMENT
  // =====================================================

  private isRateLimited(chatId: number): { limited: boolean; message?: string } {
    const now = Date.now();
    const userLimit = this.userRateLimits.get(chatId);

    if (!userLimit || now - userLimit.lastReset > 60000) {
      this.userRateLimits.set(chatId, {
        count: 1,
        lastReset: now,
        lastMessageTime: now
      });
      return { limited: false };
    }

    if (now - userLimit.lastMessageTime < 1000) {
      return {
        limited: true,
        message: '⚠️ Please wait a moment between messages'
      };
    }

    userLimit.count++;
    userLimit.lastMessageTime = now;

    if (userLimit.count > 30) {
      return {
        limited: true,
        message: '⚠️ Rate limit exceeded. Please wait a minute.'
      };
    }

    return { limited: false };
  }

  private resetSessionTimeout(chatId: number) {
    const existingTimeout = this.sessionTimeouts.get(chatId);
    if (existingTimeout) clearTimeout(existingTimeout);

    const timeout = setTimeout(() => {
      this.sessions.delete(chatId);
      this.sessionTimeouts.delete(chatId);
      this.safeSendMessage(
        chatId,
        '⏰ Session expired due to inactivity. Use `/build` or `/create` to start again.'
      );
    }, 30 * 60 * 1000);

    this.sessionTimeouts.set(chatId, timeout);
  }

  private cleanupSession(chatId: number) {
    this.sessions.delete(chatId);

    const timeout = this.sessionTimeouts.get(chatId);
    if (timeout) {
      clearTimeout(timeout);
      this.sessionTimeouts.delete(chatId);
    }
  }

  private startCleanupJobs() {
    setInterval(() => {
      this.cleanupAbandonedSessions();
    }, 60 * 60 * 1000);

    setInterval(() => {
      this.cleanupOldRateLimits();
    }, 60 * 60 * 1000);
  }

  private cleanupAbandonedSessions() {
    const now = Date.now();
    const abandonedTimeout = 2 * 60 * 60 * 1000;

    for (const [chatId, session] of this.sessions.entries()) {
      if (now - session.createdAt > abandonedTimeout) {
        this.cleanupSession(chatId);
        logger.info('Cleaned up abandoned session', { chatId });
      }
    }
  }

  private cleanupOldRateLimits() {
    const now = Date.now();
    const rateLimitTimeout = 24 * 60 * 60 * 1000;

    for (const [chatId, rateLimit] of this.userRateLimits.entries()) {
      if (now - rateLimit.lastReset > rateLimitTimeout) {
        this.userRateLimits.delete(chatId);
      }
    }
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  async sendNotification(chatId: number, message: string) {
    try {
      await this.safeSendMessage(chatId, message);
    } catch (error) {
      logger.error('Failed to send Telegram notification', { error, chatId });
    }
  }

  getBot(): TelegramBot {
    return this.bot;
  }

  getStats() {
    return {
      activeSessions: this.sessions.size,
      loggedInUsers: this.userMapping.size,
      rateLimitedUsers: this.userRateLimits.size
    };
  }

  async shutdown() {
    logger.info('Shutting down Telegram bot...');

    for (const timeout of this.sessionTimeouts.values()) {
      clearTimeout(timeout);
    }

    this.bot.stopPolling();

    logger.info('Telegram bot shutdown complete');
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let telegramBotInstance: EnhancedTelegramBotService | null = null;

export function getTelegramBot(): EnhancedTelegramBotService {
  if (!telegramBotInstance) {
    telegramBotInstance = new EnhancedTelegramBotService();
  }
  return telegramBotInstance;
}

export function destroyTelegramBot(): void {
  if (telegramBotInstance) {
    telegramBotInstance.shutdown();
    telegramBotInstance = null;
  }
}