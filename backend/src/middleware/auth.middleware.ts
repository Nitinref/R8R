// middleware/auth.middleware.ts

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../server.js';
import { AppError } from './error-handler.middleware.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

// JWT Authentication Middleware
export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Please provide a valid token.', 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET not configured');
    }

    // Verify and decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
      userId: string;
      email: string;
      iat: number;
      exp: number;
    };

    // Validate user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true }
    });

    if (!user) {
      throw new AppError('User not found or has been deleted', 401);
    }

    // Attach user to request
    req.user = {
      userId: user.id,
      email: user.email
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError('Token has expired. Please login again.', 401));
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid token. Please login again.', 401));
    }
    if (error instanceof AppError) {
      return next(error);
    }
    next(new AppError('Authentication failed', 401));
  }
};

// API Key Authentication Middleware
export const authenticateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check for API key in header or query param
    const apiKey = req.headers['x-api-key'] as string || req.query.apiKey as string;

    if (!apiKey) {
      // Try JWT auth as fallback
      return authenticateJWT(req, res, next);
    }

    // Validate API key format
    if (!apiKey.startsWith('rag_')) {
      throw new AppError('Invalid API key format', 401);
    }

    // Find API key in database
    const keyRecord = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });

    if (!keyRecord) {
      throw new AppError('Invalid API key', 401);
    }

    if (!keyRecord.isActive) {
      throw new AppError('API key has been deactivated', 401);
    }

    // Update last used timestamp (async, don't wait)
    prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsedAt: new Date() }
    }).catch(err => console.error('Failed to update API key lastUsedAt:', err));

    // Attach user to request
    req.user = {
      userId: keyRecord.user.id,
      email: keyRecord.user.email
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    next(new AppError('API key authentication failed', 401));
  }
};

// Optional authentication - allows both authenticated and unauthenticated requests
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] as string;

    if (authHeader || apiKey) {
      // Try to authenticate if credentials provided
      if (apiKey) {
        return authenticateApiKey(req, res, next);
      } else {
        return authenticateJWT(req, res, next);
      }
    }

    // Continue without authentication
    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
};

// Admin role check (extend later if needed)
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.userId) {
      throw new AppError('Authentication required', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { email: true }
    });

    // Add your admin check logic here
    // For now, check if email is admin (customize as needed)
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',');
    
    if (!user || !adminEmails.includes(user.email)) {
      throw new AppError('Admin access required', 403);
    }

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    next(new AppError('Authorization failed', 403));
  }
};