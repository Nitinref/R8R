import { createClient } from 'redis';
import { logger } from '../utils/logger.js';
export class CacheService {
    client;
    constructor() {
        // @ts-ignore
        this.client = createClient({
            url: process.env.REDIS_URL
        });
        this.client.on('error', (err) => logger.error('Redis Client Error', err));
        this.client.connect();
    }
    async get(key) {
        try {
            const value = await this.client.get(key);
            return value ? JSON.parse(value) : null;
        }
        catch (error) {
            logger.error('Cache get error', { key, error });
            return null;
        }
    }
    async set(key, value, ttl = 3600) {
        try {
            await this.client.setEx(key, ttl, JSON.stringify(value));
        }
        catch (error) {
            logger.error('Cache set error', { key, error });
        }
    }
    async delete(key) {
        try {
            await this.client.del(key);
        }
        catch (error) {
            logger.error('Cache delete error', { key, error });
        }
    }
    generateKey(workflowId, query) {
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(query).digest('hex');
        return `workflow:${workflowId}:query:${hash}`;
    }
}
//# sourceMappingURL=cache.service.js.map