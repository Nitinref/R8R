import { logger } from '../utils/logger.js';
export class AppError extends Error {
    statusCode;
    isOperational;
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
export const errorHandler = (err, req, res, next) => {
    logger.error('Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: err.message,
            status: 'error'
        });
    }
    // Handle Prisma errors
    if (err.name === 'PrismaClientKnownRequestError') {
        return res.status(400).json({
            error: 'Database error',
            status: 'error'
        });
    }
    // Default error
    return res.status(500).json({
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
        status: 'error'
    });
};
// Async error wrapper
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
//# sourceMappingURL=error-handler.middleware.js.map