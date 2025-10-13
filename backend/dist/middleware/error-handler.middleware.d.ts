import type { Request, Response, NextFunction } from 'express';
export declare class AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message: string, statusCode?: number);
}
export declare class ValidationError extends AppError {
    errors: Array<{
        field: string;
        message: string;
    }>;
    constructor(errors: Array<{
        field: string;
        message: string;
    }>);
}
export declare const errorHandler: (err: Error | AppError, req: Request, res: Response, next: NextFunction) => void;
export declare const asyncHandler: (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => (req: Request, res: Response, next: NextFunction) => void;
export declare const notFoundHandler: (req: Request, res: Response, next: NextFunction) => void;
export declare const handleUncaughtError: (error: Error) => void;
export declare const handleUnhandledRejection: (reason: any, promise: Promise<any>) => void;
//# sourceMappingURL=error-handler.middleware.d.ts.map