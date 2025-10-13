export declare class CacheService {
    private client;
    private isConnected;
    private connectionPromise;
    private reconnectAttempts;
    private maxReconnectAttempts;
    constructor();
    private setupEventListeners;
    private connect;
    private ensureConnected;
    /**
     * Get value from cache
     */
    get<T>(key: string): Promise<T | null>;
    /**
     * Set value in cache with TTL
     */
    set(key: string, value: any, ttl?: number): Promise<boolean>;
    /**
     * Delete a specific key
     */
    delete(key: string): Promise<boolean>;
    /**
     * Delete all keys matching a pattern
     */
    deletePattern(pattern: string): Promise<number>;
    /**
     * Clear all cache (use with caution!)
     */
    clear(): Promise<boolean>;
    /**
     * Check if a key exists
     */
    exists(key: string): Promise<boolean>;
    /**
     * Get remaining TTL for a key
     */
    getTTL(key: string): Promise<number | null>;
    /**
     * Generate cache key for workflow queries
     */
    generateKey(workflowId: string, query: string): string;
    /**
     * Generate cache key with custom namespace
     */
    generateCustomKey(namespace: string, identifier: string): string;
    /**
     * Get cache statistics
     */
    getStats(): Promise<{
        connected: boolean;
        hits?: number;
        misses?: number;
        keys?: number;
        memory?: string;
        uptime?: number;
    }>;
    /**
     * Get cache hit rate percentage
     */
    getHitRate(): Promise<number>;
    /**
     * Health check - verify Redis is responding
     */
    isHealthy(): Promise<boolean>;
    /**
     * Gracefully disconnect from Redis
     */
    disconnect(): Promise<void>;
    /**
     * Check connection status
     */
    isConnectedSync(): boolean;
    /**
     * Increment a numeric value
     */
    increment(key: string, amount?: number): Promise<number | null>;
    /**
     * Set expiration on existing key
     */
    expire(key: string, ttl: number): Promise<boolean>;
}
/**
 * Get or create cache service singleton
 */
export declare function getCacheService(): CacheService;
/**
 * Initialize cache service (call this on app startup)
 */
export declare function initializeCacheService(): Promise<CacheService>;
/**
 * Shutdown cache service (call this on app shutdown)
 */
export declare function shutdownCacheService(): Promise<void>;
//# sourceMappingURL=cache.service.d.ts.map