import { createClient } from 'redis';
import type{ RedisClientType}from 'redis'
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

export class CacheService {
  private client: RedisClientType;
  private isConnected: boolean = false;
  private connectionPromise: Promise<void> | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    logger.info('Initializing Redis client...', { url: redisUrl });

    this.client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          this.reconnectAttempts = retries;
          
          if (retries > this.maxReconnectAttempts) {
            logger.error('Redis max reconnection attempts reached', { retries });
            return new Error('Max reconnection attempts reached');
          }
          
          // Exponential backoff: 100ms, 200ms, 400ms, 800ms, etc.
          const delay = Math.min(retries * 100, 3000);
          logger.info('Redis reconnecting...', { attempt: retries, delayMs: delay });
          return delay;
        },
        connectTimeout: 10000, // 10 seconds
        // @ts-ignore
        keepAlive: 5000 // Keep connection alive every 5 seconds
      }
    });

    // Setup event listeners
    this.setupEventListeners();
    
    // Start connection (async)
    this.connectionPromise = this.connect();
  }

  private setupEventListeners(): void {
    this.client.on('error', (err) => {
      logger.error('Redis Client Error', { 
        error: err.message,
        code: err.code,
        reconnectAttempts: this.reconnectAttempts
      });
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      logger.info('Redis client connecting...');
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready and connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.client.on('end', () => {
      logger.info('Redis client disconnected');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis client attempting to reconnect...');
    });
  }

  private async connect(): Promise<void> {
    try {
      if (!this.isConnected && !this.client.isOpen) {
        await this.client.connect();
        logger.info('✓ Redis connected successfully');
        this.isConnected = true;
      }
    } catch (error) {
      logger.error('Failed to connect to Redis', { 
        error: (error as Error).message,
        stack: (error as Error).stack
      });
      this.isConnected = false;
      // Don't throw - allow app to continue without cache
      logger.warn('⚠ Application will continue without Redis cache');
    }
  }

  private async ensureConnected(): Promise<boolean> {
    // Wait for initial connection if still pending
    if (this.connectionPromise) {
      await this.connectionPromise;
      this.connectionPromise = null;
    }
    
    // If not connected, try to reconnect
    if (!this.isConnected && !this.client.isOpen) {
      logger.warn('Redis not connected, attempting to reconnect...');
      await this.connect();
    }

    return this.isConnected;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const connected = await this.ensureConnected();
      
      if (!connected) {
        logger.debug('Cache get skipped - Redis not connected', { key });
        return null;
      }

      const value = await this.client.get(key);
      
      if (!value) {
        logger.debug('Cache miss', { key });
        return null;
      }

      logger.debug('Cache hit', { key });
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Cache get error', { 
        key, 
        error: (error as Error).message 
      });
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: any, ttl: number = 3600): Promise<boolean> {
    try {
      const connected = await this.ensureConnected();
      
      if (!connected) {
        logger.debug('Cache set skipped - Redis not connected', { key });
        return false;
      }

      await this.client.setEx(key, ttl, JSON.stringify(value));
      logger.debug('Cache set successful', { key, ttl });
      return true;
    } catch (error) {
      logger.error('Cache set error', { 
        key, 
        ttl,
        error: (error as Error).message 
      });
      return false;
    }
  }

  /**
   * Delete a specific key
   */
  async delete(key: string): Promise<boolean> {
    try {
      const connected = await this.ensureConnected();
      
      if (!connected) {
        logger.debug('Cache delete skipped - Redis not connected', { key });
        return false;
      }

      const deleted = await this.client.del(key);
      logger.debug('Cache delete', { key, deleted: deleted > 0 });
      return deleted > 0;
    } catch (error) {
      logger.error('Cache delete error', { 
        key, 
        error: (error as Error).message 
      });
      return false;
    }
  }

  /**
   * Delete all keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      const connected = await this.ensureConnected();
      
      if (!connected) {
        logger.debug('Cache delete pattern skipped - Redis not connected', { pattern });
        return 0;
      }

      const keys = await this.client.keys(pattern);
      
      if (keys.length === 0) {
        logger.debug('No keys found for pattern', { pattern });
        return 0;
      }

      const deleted = await this.client.del(keys);
      logger.info('Deleted keys by pattern', { pattern, count: deleted });
      return deleted;
    } catch (error) {
      logger.error('Cache delete pattern error', { 
        pattern, 
        error: (error as Error).message 
      });
      return 0;
    }
  }

  /**
   * Clear all cache (use with caution!)
   */
  async clear(): Promise<boolean> {
    try {
      const connected = await this.ensureConnected();
      
      if (!connected) {
        logger.warn('Cache clear skipped - Redis not connected');
        return false;
      }

      await this.client.flushDb();
      logger.warn('Cache cleared - all keys deleted');
      return true;
    } catch (error) {
      logger.error('Cache clear error', { 
        error: (error as Error).message 
      });
      return false;
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const connected = await this.ensureConnected();
      
      if (!connected) {
        return false;
      }

      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error('Cache exists error', { 
        key, 
        error: (error as Error).message 
      });
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   */
  async getTTL(key: string): Promise<number | null> {
    try {
      const connected = await this.ensureConnected();
      
      if (!connected) {
        return null;
      }

      const ttl = await this.client.ttl(key);
      return ttl >= 0 ? ttl : null;
    } catch (error) {
      logger.error('Cache getTTL error', { 
        key, 
        error: (error as Error).message 
      });
      return null;
    }
  }

  /**
   * Generate cache key for workflow queries
   */
  generateKey(workflowId: string, query: string): string {
    const normalizedQuery = query.toLowerCase().trim();
    const hash = crypto
      .createHash('sha256')
      .update(normalizedQuery)
      .digest('hex')
      .substring(0, 16); // Use first 16 chars for shorter keys
    
    return `workflow:${workflowId}:query:${hash}`;
  }

  /**
   * Generate cache key with custom namespace
   */
  generateCustomKey(namespace: string, identifier: string): string {
    const hash = crypto
      .createHash('sha256')
      .update(identifier)
      .digest('hex')
      .substring(0, 16);
    
    return `${namespace}:${hash}`;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    connected: boolean;
    hits?: number;
    misses?: number;
    keys?: number;
    memory?: string;
    uptime?: number;
  }> {
    try {
      const connected = await this.ensureConnected();
      
      if (!connected) {
        return { connected: false };
      }

      const [info, dbSize] = await Promise.all([
        this.client.info('stats'),
        this.client.dbSize()
      ]);

      // Parse stats from info string
      const hitsMatch = info.match(/keyspace_hits:(\d+)/);
      const missesMatch = info.match(/keyspace_misses:(\d+)/);
      
      // Get memory info
      const memoryInfo = await this.client.info('memory');
      const memoryMatch = memoryInfo.match(/used_memory_human:([^\r\n]+)/);
      
      // Get server info
      const serverInfo = await this.client.info('server');
      const uptimeMatch = serverInfo.match(/uptime_in_seconds:(\d+)/);

      return {
        connected: true,
        // @ts-ignore
        hits: hitsMatch ? parseInt(hitsMatch[1]) : 0,
        // @ts-ignore
        misses: missesMatch ? parseInt(missesMatch[1]) : 0,
        keys: dbSize,
        // @ts-ignore
        memory: memoryMatch ? memoryMatch[1].trim() : 'unknown',
        // @ts-ignore
        uptime: uptimeMatch ? parseInt(uptimeMatch[1]) : 0
      };
    } catch (error) {
      logger.error('Failed to get cache stats', { 
        error: (error as Error).message 
      });
      return { connected: false };
    }
  }

  /**
   * Get cache hit rate percentage
   */
  async getHitRate(): Promise<number> {
    try {
      const stats = await this.getStats();
      
      if (!stats.connected || !stats.hits || !stats.misses) {
        return 0;
      }

      const total = stats.hits + stats.misses;
      if (total === 0) return 0;

      return (stats.hits / total) * 100;
    } catch (error) {
      logger.error('Failed to calculate hit rate', { 
        error: (error as Error).message 
      });
      return 0;
    }
  }

  /**
   * Health check - verify Redis is responding
   */
  async isHealthy(): Promise<boolean> {
    try {
      const connected = await this.ensureConnected();
      
      if (!connected) {
        return false;
      }

      // Try a ping command
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed', { 
        error: (error as Error).message 
      });
      return false;
    }
  }

  /**
   * Gracefully disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client.isOpen) {
        await this.client.quit();
        logger.info('Redis disconnected gracefully');
        this.isConnected = false;
      }
    } catch (error) {
      logger.error('Error disconnecting Redis', { 
        error: (error as Error).message 
      });
      
      // Force close if graceful shutdown fails
      try {
        await this.client.disconnect();
      } catch (disconnectError) {
        logger.error('Error force disconnecting Redis', { 
          error: (disconnectError as Error).message 
        });
      }
    }
  }

  /**
   * Check connection status
   */
  isConnectedSync(): boolean {
    return this.isConnected && this.client.isOpen;
  }

  /**
   * Increment a numeric value
   */
  async increment(key: string, amount: number = 1): Promise<number | null> {
    try {
      const connected = await this.ensureConnected();
      
      if (!connected) {
        return null;
      }

      const newValue = await this.client.incrBy(key, amount);
      return newValue;
    } catch (error) {
      logger.error('Cache increment error', { 
        key, 
        amount,
        error: (error as Error).message 
      });
      return null;
    }
  }

  /**
   * Set expiration on existing key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const connected = await this.ensureConnected();
      
      if (!connected) {
        return false;
      }

      const result = await this.client.expire(key, ttl);
      // @ts-ignore
      return result;
    } catch (error) {
      logger.error('Cache expire error', { 
        key, 
        ttl,
        error: (error as Error).message 
      });
      return false;
    }
  }
}

// Singleton instance
let cacheInstance: CacheService | null = null;

/**
 * Get or create cache service singleton
 */
export function getCacheService(): CacheService {
  if (!cacheInstance) {
    cacheInstance = new CacheService();
  }
  return cacheInstance;
}

/**
 * Initialize cache service (call this on app startup)
 */
export async function initializeCacheService(): Promise<CacheService> {
  const service = getCacheService();
  await service.isHealthy(); // Wait for initial connection
  return service;
}

/**
 * Shutdown cache service (call this on app shutdown)
 */
export async function shutdownCacheService(): Promise<void> {
  if (cacheInstance) {
    await cacheInstance.disconnect();
    cacheInstance = null;
  }
}