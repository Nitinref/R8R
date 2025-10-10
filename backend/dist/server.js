import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { PrismaClient } from '../generated/prisma/index.js';
import { errorHandler } from './middleware/error-handler.middleware.js';
import { logger } from './utils/logger.js';
import authRoutes from './routes/auth.routes.js';
import workflowRoutes from './routes/workflow.routes.js';
import queryRoutes from './routes/query.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;
// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/analytics', analyticsRoutes);
// Error handling
app.use(errorHandler);
// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, closing server...');
    await prisma.$disconnect();
    process.exit(0);
});
app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
});
export { app, prisma };
//# sourceMappingURL=server.js.map