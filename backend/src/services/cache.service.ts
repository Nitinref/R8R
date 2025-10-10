import { createClient } from 'redis';
import { logger } from '../utils/logger.js';

export class CacheService {
  private client;


  constructor() {
    // @ts-ignore
    this.client = createClient({
    
      url: process.env.REDIS_URL
    });

    this.client.on('error', (err) => logger.error('Redis Client Error', err));
    this.client.connect();
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      logger.error('Cache set error', { key, error });
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Cache delete error', { key, error });
    }
  }

  generateKey(workflowId: string, query: string): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(query).digest('hex');
    return `workflow:${workflowId}:query:${hash}`;
  }
}