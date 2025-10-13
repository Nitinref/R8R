// middleware/error-handler.middleware.ts - COMPLETE VERSION
import { Prisma } from '../../generated/prisma/index.js';
import { logger } from '../utils/logger.js';
// Custom error class for application errors
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
// Validation error helper
export class ValidationError extends AppError {
    errors;
    constructor(errors) {
        super('Validation failed', 400);
        this.errors = errors;
    }
}
// Main error handler middleware
export const errorHandler = (err, req, res, next) => {
    // Default error
    let statusCode = 500;
    let message = 'Internal server error';
    let errors = [];
    // Log error with context
    logger.error('Error occurred', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: req.body,
        query: req.query,
        params: req.params,
        userId: req.user?.userId,
        ip: req.ip
    });
    // Handle AppError (our custom errors)
    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
        // Include validation errors if present
        if (err instanceof ValidationError) {
            errors = err.errors;
        }
    }
    // Handle Prisma errors
    else if (err instanceof Prisma.PrismaClientKnownRequestError) {
        const prismaError = handlePrismaError(err);
        statusCode = prismaError.statusCode;
        message = prismaError.message;
        errors = prismaError.errors;
    }
    // Handle validation errors
    else if (err instanceof Prisma.PrismaClientValidationError) {
        statusCode = 400;
        message = 'Invalid data provided';
        errors = [{ field: 'validation', message: 'Data validation failed' }];
    }
    // Handle JWT errors (if not caught by auth middleware)
    else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid authentication token';
    }
    else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Authentication token has expired';
    }
    // Handle syntax errors (invalid JSON)
    else if (err instanceof SyntaxError && 'body' in err) {
        statusCode = 400;
        message = 'Invalid JSON in request body';
    }
    // Handle multer errors (file upload)
    else if (err.name === 'MulterError') {
        statusCode = 400;
        message = `File upload error: ${err.message}`;
    }
    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    const errorResponse = {
        success: false,
        error: message,
        statusCode
    };
    // Add details in development
    if (isDevelopment) {
        errorResponse.details = {
            message: err.message,
            stack: err.stack,
            errors,
            name: err.name
        };
    }
    else if (errors.length > 0) {
        // Only show validation errors in production
        errorResponse.errors = errors;
    }
    // Add request ID if available
    if (req.headers['x-request-id']) {
        errorResponse.requestId = req.headers['x-request-id'];
    }
    // Send error response
    res.status(statusCode).json(errorResponse);
};
// Handle Prisma-specific errors
function handlePrismaError(err) {
    const errors = [];
    switch (err.code) {
        case 'P2002':
            // Unique constraint violation
            const field = err.meta?.target || ['field'];
            return {
                statusCode: 409,
                message: `${field[0]} already exists`,
                errors: [{ field: field[0], message: 'This value is already in use' }]
            };
        case 'P2025':
            // Record not found
            return {
                statusCode: 404,
                message: 'Resource not found',
                errors: []
            };
        case 'P2003':
            // Foreign key constraint violation
            return {
                statusCode: 400,
                message: 'Invalid reference to related resource',
                errors: [{ field: 'relation', message: 'Referenced resource does not exist' }]
            };
        case 'P2014':
            // Required relation violation
            return {
                statusCode: 400,
                message: 'Required relationship is missing',
                errors: []
            };
        case 'P2000':
            // Value too long
            return {
                statusCode: 400,
                message: 'Value provided is too long for the field',
                errors: []
            };
        case 'P2001':
            // Record does not exist
            return {
                statusCode: 404,
                message: 'The requested resource was not found',
                errors: []
            };
        case 'P2011':
            // Null constraint violation
            return {
                statusCode: 400,
                message: 'Required field is missing',
                errors: []
            };
        case 'P2012':
            // Missing required value
            return {
                statusCode: 400,
                message: 'A required value is missing',
                errors: []
            };
        case 'P2015':
            // Related record not found
            return {
                statusCode: 404,
                message: 'Related record not found',
                errors: []
            };
        case 'P2016':
            // Query interpretation error
            return {
                statusCode: 400,
                message: 'Query error',
                errors: []
            };
        case 'P2021':
            // Table does not exist
            return {
                statusCode: 500,
                message: 'Database schema error',
                errors: []
            };
        case 'P2022':
            // Column does not exist
            return {
                statusCode: 500,
                message: 'Database schema error',
                errors: []
            };
        default:
            logger.error('Unhandled Prisma error', {
                code: err.code,
                message: err.message,
                meta: err.meta
            });
            return {
                statusCode: 500,
                message: 'Database error occurred',
                errors: []
            };
    }
}
// Async error wrapper - catches async errors in route handlers
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
// Not found handler - should be registered after all routes
export const notFoundHandler = (req, res, next) => {
    const error = new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404);
    next(error);
};
// Handle uncaught errors
export const handleUncaughtError = (error) => {
    logger.error('Uncaught error', {
        error: error.message,
        stack: error.stack,
        type: error.name
    });
};
// Handle unhandled promise rejections
export const handleUnhandledRejection = (reason, promise) => {
    logger.error('Unhandled promise rejection', {
        reason: reason?.message || reason,
        stack: reason?.stack,
        promise
    });
};
//# sourceMappingURL=error-handler.middleware.js.map