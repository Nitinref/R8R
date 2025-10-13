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
const app = express();
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
        }
        else {
            logger.warn('⚠ Redis cache not available - continuing without cache');
        }
        // 4. Setup middleware
        setupMiddleware();
        // 5. Setup routes
        setupRoutes();
        // 6. Setup error handling
        setupErrorHandling();
        // 7. Start server
        const server = app.listen(PORT, () => {
            logger.info('='.repeat(50));
            logger.info(`🚀 RAG Workflow Server running on port ${PORT}`);
            logger.info(`📝 Environment: ${process.env.NODE_ENV}`);
            logger.info(`🔗 API Base URL: http://localhost:${PORT}/api`);
            logger.info('='.repeat(50));
        });
        // 8. Graceful shutdown
        setupGracefulShutdown(server);
    }
    catch (error) {
        logger.error('Failed to initialize application', {
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
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
    app.use(cors({
        origin: process.env.CORS_ORIGIN || '*',
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
                cache: cacheHealthy ? 'connected' : 'disconnected'
            }
        });
    });
    // Detailed health check
    app.get('/health/detailed', async (req, res) => {
        try {
            // Check database
            await prisma.$queryRaw `SELECT 1`;
            // Check cache
            const cacheService = getCacheService();
            const cacheStats = await cacheService.getStats();
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
                    }
                }
            });
        }
        catch (error) {
            res.status(503).json({
                status: 'unhealthy',
                error: error.message
            });
        }
    });
    // API routes
    app.use('/api/auth', authRoutes);
    app.use('/api/workflows', workflowRoutes);
    app.use('/api/query', queryRoutes);
    app.use('/api/analytics', analyticsRoutes);
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
                query: '/api/query',
                analytics: '/api/analytics'
            },
            documentation: '/api/docs' // Add later if needed
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
    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection', {
            reason: reason?.message || reason,
            stack: reason?.stack,
            promise
        });
    });
    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception', {
            error: error.message,
            stack: error.stack
        });
        // Exit after logging
        process.exit(1);
    });
}
// Graceful shutdown
function setupGracefulShutdown(server) {
    const shutdown = async (signal) => {
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
                logger.info('Graceful shutdown completed');
                process.exit(0);
            }
            catch (error) {
                logger.error('Error during shutdown', {
                    error: error.message
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
//# sourceMappingURL=server.js.map