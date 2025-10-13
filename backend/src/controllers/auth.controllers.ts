import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../server.js';
import { AppError } from '../middleware/error-handler.middleware.js';

// Extend Express Request type to include user
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

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      throw new AppError('Email, password, and name are required', 400);
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError('Email already registered', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name },
      select: { id: true, email: true, name: true, createdAt: true }
    });
// @ts-ignore
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );

    res.status(201).json({
      user,
      token,
      message: 'User registered successfully'
    });
  } catch (error) {
    throw error;
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new AppError('Invalid credentials', 401);
    }
// @ts-ignore
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );

    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
      message: 'Login successful'
    });
  } catch (error) {
    throw error;
  }
};

export const createApiKey = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    
    if (!req.user?.userId) {
      throw new AppError('Authentication required', 401);
    }

    const apiKey = `rag_${uuidv4().replace(/-/g, '')}`;
    const keyRecord = await prisma.apiKey.create({
      data: { key: apiKey, name, userId: req.user.userId }
    });

    res.status(201).json({
      apiKey: keyRecord.key,
      name: keyRecord.name,
      createdAt: keyRecord.createdAt,
      message: 'API key created successfully'
    });
  } catch (error) {
    throw error;
  }
};

export const listApiKeys = async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      throw new AppError('Authentication required', 401);
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: req.user.userId },
      select: {
        id: true, name: true, key: true, isActive: true, 
        lastUsedAt: true, createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ apiKeys });
  } catch (error) {
    throw error;
  }
};

export const deleteApiKey = async (req: Request, res: Response) => {
  try {
    const { keyId } = req.params;
    
    if (!req.user?.userId) {
      throw new AppError('Authentication required', 401);
    }

    await prisma.apiKey.deleteMany({
      // @ts-ignore
      where: { id: keyId, userId: req.user.userId }
    });

    res.json({ message: 'API key deleted successfully' });
  } catch (error) {
    throw error;
  }
};