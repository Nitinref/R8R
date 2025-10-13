// utils/env-validator.ts

import { logger } from './logger.js';

interface EnvConfig {
  // Required variables
  required: {
    name: string;
    description: string;
  }[];
  // Optional variables with defaults
  optional: {
    name: string;
    description: string;
    default: string;
  }[];
}

const envConfig: EnvConfig = {
  required: [
    { name: 'DATABASE_URL', description: 'PostgreSQL database connection string' },
    { name: 'JWT_SECRET', description: 'Secret key for JWT token generation' }
  ],
  optional: [
    { name: 'PORT', description: 'Server port', default: '3001' },
    { name: 'NODE_ENV', description: 'Environment (development/production)', default: 'development' },
    { name: 'JWT_EXPIRY', description: 'JWT token expiration time', default: '7d' },
    { name: 'REDIS_URL', description: 'Redis connection URL', default: 'redis://localhost:6379' },
    { name: 'OPENAI_API_KEY', description: 'OpenAI API key for GPT models', default: '' },
    { name: 'ANTHROPIC_API_KEY', description: 'Anthropic API key for Claude models', default: '' },
    { name: 'GOOGLE_API_KEY', description: 'Google API key for Gemini models', default: '' },
    { name: 'PINECONE_API_KEY', description: 'Pinecone API key for vector search', default: '' },
    { name: 'ADMIN_EMAILS', description: 'Comma-separated admin emails', default: '' },
    { name: 'CORS_ORIGIN', description: 'Allowed CORS origins', default: '*' },
    { name: 'LOG_LEVEL', description: 'Logging level', default: 'info' }
  ]
};

export function validateEnvironment(): void {
  const errors: string[] = [];
  const warnings: string[] = [];

  logger.info('='.repeat(50));
  logger.info('Validating environment variables...');
  logger.info('='.repeat(50));

  // Check required variables
  for (const variable of envConfig.required) {
    if (!process.env[variable.name]) {
      errors.push(`❌ ${variable.name} is required: ${variable.description}`);
    } else {
      logger.info(`✓ ${variable.name} is set`);
    }
  }

  // Check optional variables and set defaults
  for (const variable of envConfig.optional) {
    if (!process.env[variable.name]) {
      if (variable.default) {
        process.env[variable.name] = variable.default;
        logger.info(`→ ${variable.name} not set, using default: ${variable.default || '(empty)'}`);
      } else {
        warnings.push(`⚠ ${variable.name} is not set: ${variable.description}`);
      }
    } else {
      logger.info(`✓ ${variable.name} is set`);
    }
  }

  // Validate JWT_SECRET strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    warnings.push('⚠ JWT_SECRET should be at least 32 characters for security');
  }

  // Check if at least one LLM provider is configured
  const hasLLMProvider = !!(
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.GOOGLE_API_KEY
  );

  if (!hasLLMProvider) {
    warnings.push('⚠ No LLM provider API keys configured. At least one of OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_API_KEY should be set for workflow execution.');
  }

  // Display warnings
  if (warnings.length > 0) {
    logger.warn('='.repeat(50));
    logger.warn('Environment warnings:');
    warnings.forEach(warning => logger.warn(warning));
    logger.warn('='.repeat(50));
  }

  // Throw error if required variables are missing
  if (errors.length > 0) {
    logger.error('='.repeat(50));
    logger.error('❌ Environment validation failed:');
    errors.forEach(error => logger.error(error));
    logger.error('='.repeat(50));
    throw new Error(`Missing required environment variables. Please check your .env file.`);
  }

  logger.info('='.repeat(50));
  logger.info('✅ Environment validation completed successfully');
  logger.info('='.repeat(50));
}

// Helper to check if a specific provider is available
export function isProviderAvailable(provider: 'openai' | 'anthropic' | 'google' | 'pinecone'): boolean {
  const keyMap = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    google: 'GOOGLE_API_KEY',
    pinecone: 'PINECONE_API_KEY'
  };

  const key = process.env[keyMap[provider]];
  return !!(key && key.trim().length > 0);
}

// Get available providers
export function getAvailableProviders(): {
  llm: string[];
  retrieval: string[];
} {
  return {
    llm: [
      isProviderAvailable('openai') && 'openai',
      isProviderAvailable('anthropic') && 'anthropic',
      isProviderAvailable('google') && 'google'
    ].filter(Boolean) as string[],
    retrieval: [
      isProviderAvailable('pinecone') && 'pinecone'
    ].filter(Boolean) as string[]
  };
}

// Display provider status on startup
export function displayProviderStatus(): void {
  const providers = getAvailableProviders();
  
  logger.info('='.repeat(50));
  logger.info('📊 Provider Status');
  logger.info('='.repeat(50));
  
  // LLM Providers
  logger.info('🤖 LLM Providers:');
  if (providers.llm.length > 0) {
    providers.llm.forEach(provider => {
      logger.info(`   ✓ ${provider.toUpperCase()}`);
    });
  } else {
    logger.warn('   ⚠ No LLM providers configured');
  }
  
  // Retrieval Providers
  logger.info('🔍 Retrieval Providers:');
  if (providers.retrieval.length > 0) {
    providers.retrieval.forEach(provider => {
      logger.info(`   ✓ ${provider.toUpperCase()}`);
    });
  } else {
    logger.warn('   ⚠ No retrieval providers configured (workflows without retrieval will still work)');
  }
  
  logger.info('='.repeat(50));
}

// Validate specific provider configuration
export function validateProvider(provider: 'openai' | 'anthropic' | 'google' | 'pinecone'): {
  available: boolean;
  message: string;
} {
  const isAvailable = isProviderAvailable(provider);
  
  if (isAvailable) {
    return {
      available: true,
      message: `${provider.toUpperCase()} is configured and ready`
    };
  }
  
  const keyMap = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    google: 'GOOGLE_API_KEY',
    pinecone: 'PINECONE_API_KEY'
  };
  
  return {
    available: false,
    message: `${provider.toUpperCase()} is not configured. Please set ${keyMap[provider]} in your .env file`
  };
}

// Get environment info for debugging
export function getEnvironmentInfo(): {
  nodeEnv: string;
  port: string;
  hasDatabase: boolean;
  hasRedis: boolean;
  llmProviders: string[];
  retrievalProviders: string[];
} {
  const providers = getAvailableProviders();
  
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || '3001',
    hasDatabase: !!process.env.DATABASE_URL,
    hasRedis: !!process.env.REDIS_URL,
    llmProviders: providers.llm,
    retrievalProviders: providers.retrieval
  };
}