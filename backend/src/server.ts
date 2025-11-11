import dotenv from 'dotenv';
dotenv.config(); // ← THIS LOADS YOUR .ENV FILE

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { PrismaClient } from '../generated/prisma/index.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.middleware.js';
import { logger } from './utils/logger.js';
import { validateEnvironment, displayProviderStatus } from './utils/env-validatort.js';
import { getCacheService } from './services/cache.service.js';
import authRoutes from './routes/auth.routes.js';
import workflowRoutes from './routes/workflow.routes.js';
import queryRoutes from './routes/query.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import { memoryRoutes } from './routes/memory.routes.js';

// Import Telegram and DAG workflow services
import { getTelegramBot } from './services/telegram/telegram-bot.service.js';

// ... rest of your code
const app = express();
app.use('/api/memory', memoryRoutes);

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error']
});

const PORT = process.env.PORT || 3001;

// Initialize application
async function initializeApp() {
  try {
    // 1. Validate environment variables
    logger.info('Starting server initialization...');
    validateEnvironment();
    displayProviderStatus();

    // 2. Test database connection
    logger.info('Testing database connection...');
    await prisma.$connect();
    logger.info('✓ Database connected successfully');

    // 3. Initialize cache
    logger.info('Initializing cache service...');
    const cacheService = getCacheService();
    const cacheHealthy = await cacheService.isHealthy();
    if (cacheHealthy) {
      logger.info('✓ Redis cache connected successfully');
    } else {
      logger.warn('⚠ Redis cache not available - continuing without cache');
    }

    // 4. Initialize Telegram Bot (only if token is configured)
    await initializeTelegramBot();

    // 5. Setup middleware
    setupMiddleware();

    // 6. Setup routes
    setupRoutes();

    // 7. Setup error handling
    setupErrorHandling();

    // 8. Start server
    const server = app.listen(PORT, () => {
      logger.info('='.repeat(50));
      logger.info(`🚀 RAG Workflow Server running on port ${PORT}`);
      logger.info(`📝 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🔗 API Base URL: http://localhost:${PORT}/api`);
      logger.info(`🤖 Telegram Bot: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ Active' : '❌ Not configured'}`);
      logger.info('='.repeat(50));
    });

    // 9. Graceful shutdown
    setupGracefulShutdown(server);

  } catch (error) {
    logger.error('Failed to initialize application', {
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    process.exit(1);
  }
}

// Initialize Telegram Bot
async function initializeTelegramBot() {
  if (process.env.TELEGRAM_BOT_TOKEN) {
    try {
      logger.info('Initializing Telegram bot...');
      const telegramBot = getTelegramBot();
      logger.info('✓ Telegram bot initialized successfully');
      
      // Test bot connection
      const botInfo = await telegramBot.getBot().getMe();
      logger.info(`✓ Telegram bot connected: @${botInfo.username}`);
      
    } catch (error) {
      logger.warn('⚠ Telegram bot initialization failed - continuing without bot', {
        error: (error as Error).message
      });
    }
  } else {
    logger.warn('⚠ TELEGRAM_BOT_TOKEN not set - Telegram bot disabled');
  }
}

// Setup middleware
function setupMiddleware() {
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disable for API
    crossOriginEmbedderPolicy: false
  }));

  // CORS configuration
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? ['https://r8r-ai.vercel.app/',  'https://your-frontend.onrender.com']
  : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging in development
  if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        body: req.body,
        query: req.query,
        ip: req.ip
      });
      next();
    });
  }
}

// Setup routes
function setupRoutes() {
  // Health check endpoints
  app.get('/health', async (req, res) => {
    const cacheService = getCacheService();
    const cacheHealthy = await cacheService.isHealthy();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      services: {
        database: 'connected',
        cache: cacheHealthy ? 'connected' : 'disconnected',
        telegram: process.env.TELEGRAM_BOT_TOKEN ? 'configured' : 'not_configured'
      }
    });
  });

  // Detailed health check
  app.get('/health/detailed', async (req, res) => {
    try {
      // Check database
      await prisma.$queryRaw`SELECT 1`;
      
      // Check cache
      const cacheService = getCacheService();
      const cacheStats = await cacheService.getStats();

      // Check Telegram bot status
      let telegramStatus = 'not_configured';
      if (process.env.TELEGRAM_BOT_TOKEN) {
        try {
          const telegramBot = getTelegramBot();
          const botInfo = await telegramBot.getBot().getMe();
          telegramStatus = `connected (@${botInfo.username})`;
        } catch (error) {
          telegramStatus = 'connection_failed';
        }
      }

      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        services: {
          database: {
            status: 'connected',
            type: 'postgresql'
          },
          cache: {
            status: cacheStats.connected ? 'connected' : 'disconnected',
            type: 'redis',
            stats: cacheStats
          },
          telegram: {
            status: telegramStatus,
            configured: !!process.env.TELEGRAM_BOT_TOKEN
          }
        }
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: (error as Error).message
      });
    }
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/workflows', workflowRoutes);
  app.use('/api/query', queryRoutes);
  app.use('/api/analytics', analyticsRoutes);
  
  // NEW: DAG Workflow routes

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'RAG Workflow API',
      version: '1.0.0',
      description: 'Customizable RAG pipeline builder with drag-and-drop workflow creation',
      endpoints: {
        health: '/health',
        auth: '/api/auth',
        workflows: '/api/workflows',
        'dag-workflows': '/api/dag-workflows',
        query: '/api/query',
        analytics: '/api/analytics',
        memory: '/api/memory'
      },
      features: {
        telegram_bot: !!process.env.TELEGRAM_BOT_TOKEN,
        dag_workflows: true,
        memory_system: true
      }
    });
  });
}

// Setup error handling
function setupErrorHandling() {
  // 404 handler - must be after all routes
  app.use(notFoundHandler);

  // Global error handler - must be last
  app.use(errorHandler);

  // Unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Rejection', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise
    });
  });

  // Uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', {
      error: error.message,
      stack: error.stack
    });
    
    // Exit after logging
    process.exit(1);
  });
}

// Graceful shutdown
function setupGracefulShutdown(server: any) {
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, closing server gracefully...`);

    // Stop accepting new requests
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        // Close database connection
        await prisma.$disconnect();
        logger.info('Database disconnected');

        // Close cache connection
        const cacheService = getCacheService();
        await cacheService.disconnect();
        logger.info('Cache disconnected');

        // Close Telegram bot
        if (process.env.TELEGRAM_BOT_TOKEN) {
          const telegramBot = getTelegramBot();
          telegramBot.getBot().stopPolling();
          logger.info('Telegram bot disconnected');
        }

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', {
          error: (error as Error).message
        });
        process.exit(1);
      }
    });

    // Force close after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  // Listen for termination signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Start the application
initializeApp();

export { app, prisma };
