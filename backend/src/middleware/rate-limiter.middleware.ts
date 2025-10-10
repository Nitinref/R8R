// src/middleware/rate-limiter.middleware.ts
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
});

redisClient.on('error', (err) => console.error('❌ Redis Client Error:', err));

(async () => {
  try {
    await redisClient.connect();
    console.log('✅ Redis connected for rate limiter');
  } catch (err) {
    console.error('❌ Failed to connect to Redis:', err);
  }
})();

// API limiter
export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
//   @ts-ignore
  keyGenerator: (req, res) => ipKeyGenerator(req), // ✅ IPv6-safe
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    prefix: 'rl:',
  }),
});

// Query limiter - uses IP by default, IPv6-safe
export const queryLimiter = rateLimit({
  windowMs: 60000,
  max: 30,
  message: 'Query rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
  //   @ts-ignore
  keyGenerator: (req, res) => ipKeyGenerator(req), // ✅ IPv6-safe
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    prefix: 'ql:',
  }),
});

export { redisClient };
