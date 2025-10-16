import { LLMProvider } from '../../types/workflow.types.js';
import { OpenAIService } from './openai.service.js';
import { AnthropicService } from './anthropic.service.js';
import { GeminiService } from './gemini.service.js';
import { logger } from '../../utils/logger.js';
export class LLMOrchestrator {
    openaiService;
    anthropicService;
    geminiService;
    // Rate limiting and circuit breaker state
    providerFailures = new Map();
    lastCallTime = new Map();
    providerCooldown = new Map();
    constructor() {
        this.openaiService = new OpenAIService();
        this.anthropicService = new AnthropicService();
        this.geminiService = new GeminiService();
        // Initialize provider-specific rate limits (in milliseconds)
        this.providerCooldown.set(LLMProvider.GOOGLE, 2000); // 2 seconds for Google
        this.providerCooldown.set(LLMProvider.OPENAI, 500); // 0.5 seconds for OpenAI
        this.providerCooldown.set(LLMProvider.ANTHROPIC, 1000); // 1 second for Anthropic
    }
    async generateCompletion(request) {
        const startTime = Date.now();
        try {
            // ✅ Check if provider is in cooldown
            await this.checkProviderCooldown(request.provider);
            const response = await this.executeWithFallback(request);
            logger.info('LLM generation completed', {
                provider: response.provider,
                model: response.model,
                tokensUsed: response.tokensUsed,
                duration: Date.now() - startTime,
                contentLength: response.content.length
            });
            return response;
        }
        catch (error) {
            logger.error('LLM generation failed after all attempts', {
                request: {
                    provider: request.provider,
                    model: request.model,
                    promptLength: request.prompt.length,
                    temperature: request.temperature,
                    maxTokens: request.maxTokens
                },
                error: error.message,
                duration: Date.now() - startTime
            });
            throw new Error(`Failed to generate completion from all available models: ${error.message}`);
        }
    }
    async executeWithFallback(request) {
        const attempts = [
            { provider: request.provider, model: request.model },
            ...(request.fallback || [])
        ];
        let lastError = null;
        for (const [index, attempt] of attempts.entries()) {
            try {
                // ✅ Skip providers that are temporarily disabled
                if (this.isProviderDisabled(attempt.provider)) {
                    logger.warn(`Skipping disabled provider`, {
                        provider: attempt.provider,
                        failureCount: this.providerFailures.get(attempt.provider) || 0
                    });
                    continue;
                }
                logger.info(`Attempting LLM call (${index + 1}/${attempts.length})`, {
                    provider: attempt.provider,
                    model: attempt.model
                });
                // ✅ Enhanced rate limiting with provider-specific delays
                await this.enforceRateLimit(attempt.provider, index);
                const response = await this.callLLM({
                    ...request,
                    provider: attempt.provider,
                    model: attempt.model
                });
                // ✅ Reset failure count on success
                this.providerFailures.set(attempt.provider, 0);
                logger.info(`LLM call successful`, {
                    provider: attempt.provider,
                    model: attempt.model,
                    tokensUsed: response.tokensUsed
                });
                return response;
            }
            catch (error) {
                lastError = error;
                // ✅ Handle specific error types
                this.handleProviderError(attempt.provider, error);
                logger.warn(`LLM call failed`, {
                    provider: attempt.provider,
                    model: attempt.model,
                    error: error.message,
                    attempt: `${index + 1}/${attempts.length}`
                });
                // ✅ Smart delays based on error type
                await this.smartDelay(attempt.provider, error, index);
            }
        }
        throw lastError || new Error('All LLM attempts failed');
    }
    async callLLM(request) {
        const commonParams = {
            model: request.model,
            prompt: request.prompt,
            temperature: request.temperature,
            maxTokens: request.maxTokens,
            systemPrompt: request.systemPrompt
        };
        switch (request.provider) {
            case LLMProvider.OPENAI:
                return await this.openaiService.generateCompletion(commonParams.model, commonParams.prompt, commonParams.temperature, commonParams.maxTokens, commonParams.systemPrompt);
            case LLMProvider.ANTHROPIC:
                return await this.anthropicService.generateCompletion(commonParams.model, commonParams.prompt, commonParams.temperature, commonParams.maxTokens, 
                // @ts-ignore
                commonParams.systemPrompt);
            case LLMProvider.GOOGLE:
                return await this.geminiService.generateCompletion(commonParams.model, commonParams.prompt, commonParams.temperature, commonParams.maxTokens, commonParams.systemPrompt);
            default:
                throw new Error(`Unsupported LLM provider: ${request.provider}`);
        }
    }
    // ✅ ENHANCED: Provider-specific rate limiting
    async enforceRateLimit(provider, attemptIndex) {
        const now = Date.now();
        const lastCall = this.lastCallTime.get(provider) || 0;
        const cooldown = this.providerCooldown.get(provider) || 1000;
        const timeSinceLastCall = now - lastCall;
        if (timeSinceLastCall < cooldown) {
            const waitTime = cooldown - timeSinceLastCall;
            logger.debug(`Rate limiting ${provider}`, { waitTime, attemptIndex });
            await this.delay(waitTime);
        }
        this.lastCallTime.set(provider, Date.now());
    }
    // ✅ NEW: Check if provider is in cooldown period
    async checkProviderCooldown(provider) {
        const lastCall = this.lastCallTime.get(provider);
        if (!lastCall)
            return;
        const cooldown = this.providerCooldown.get(provider) || 1000;
        const timeSinceLastCall = Date.now() - lastCall;
        if (timeSinceLastCall < cooldown) {
            const waitTime = cooldown - timeSinceLastCall;
            logger.debug(`Provider ${provider} in cooldown`, { waitTime });
            await this.delay(waitTime);
        }
    }
    // ✅ ENHANCED: Smart error handling
    handleProviderError(provider, error) {
        const errorMessage = error.message?.toLowerCase() || '';
        // Increment failure count
        const currentFailures = this.providerFailures.get(provider) || 0;
        this.providerFailures.set(provider, currentFailures + 1);
        // Handle specific error types
        if (this.isRateLimitError(error)) {
            logger.warn(`Rate limit hit for ${provider}`, {
                currentFailures: currentFailures + 1,
                error: errorMessage
            });
            // Increase cooldown for rate-limited providers
            const currentCooldown = this.providerCooldown.get(provider) || 1000;
            this.providerCooldown.set(provider, currentCooldown * 2); // Exponential backoff
        }
        if (this.isAuthError(error)) {
            logger.error(`Authentication error for ${provider}`, { error: errorMessage });
            // Don't retry auth errors immediately
            this.providerFailures.set(provider, 10); // High failure count to disable
        }
    }
    // ✅ ENHANCED: Smart delays based on error type and provider
    async smartDelay(provider, error, attemptIndex) {
        let delayTime = 500; // Base delay
        if (this.isRateLimitError(error)) {
            // Longer delays for rate limits
            delayTime = 2000 + (attemptIndex * 1000); // 2-4 seconds
        }
        else if (provider === LLMProvider.GOOGLE) {
            // Conservative delays for Google
            delayTime = 1000 + (attemptIndex * 500); // 1-2 seconds
        }
        else {
            // Normal delays for other providers
            delayTime = 300 + (attemptIndex * 200); // 0.3-0.9 seconds
        }
        logger.debug(`Smart delay for ${provider}`, { delayTime, attemptIndex });
        await this.delay(delayTime);
    }
    // ✅ NEW: Circuit breaker - check if provider is temporarily disabled
    isProviderDisabled(provider) {
        const failureCount = this.providerFailures.get(provider) || 0;
        return failureCount >= 5; // Disable after 5 consecutive failures
    }
    // ✅ ENHANCED: Error type detection
    isRateLimitError(error) {
        const errorMessage = error.message?.toLowerCase() || '';
        return errorMessage.includes('429') ||
            errorMessage.includes('rate limit') ||
            errorMessage.includes('too many requests') ||
            error.status === 429 ||
            error.code === 429;
    }
    isAuthError(error) {
        const errorMessage = error.message?.toLowerCase() || '';
        return errorMessage.includes('401') ||
            errorMessage.includes('unauthorized') ||
            errorMessage.includes('invalid api key') ||
            errorMessage.includes('authentication') ||
            error.status === 401;
    }
    // Utility method to add delay
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    // ✅ ENHANCED: Health check with circuit breaker status
    async healthCheck() {
        const results = await Promise.allSettled([
            this.testOpenAI(),
            this.testAnthropic(),
            this.testGoogle()
        ]);
        return {
            openai: {
                healthy: results[0].status === 'fulfilled',
                failures: this.providerFailures.get(LLMProvider.OPENAI) || 0,
                cooldown: this.providerCooldown.get(LLMProvider.OPENAI) || 500
            },
            anthropic: {
                healthy: results[1].status === 'fulfilled',
                failures: this.providerFailures.get(LLMProvider.ANTHROPIC) || 0,
                cooldown: this.providerCooldown.get(LLMProvider.ANTHROPIC) || 1000
            },
            google: {
                healthy: results[2].status === 'fulfilled',
                failures: this.providerFailures.get(LLMProvider.GOOGLE) || 0,
                cooldown: this.providerCooldown.get(LLMProvider.GOOGLE) || 2000
            }
        };
    }
    // ✅ NEW: Reset circuit breaker for a provider
    resetProvider(provider) {
        this.providerFailures.set(provider, 0);
        // Reset to default cooldown
        const defaultCooldowns = new Map([
            [LLMProvider.OPENAI, 500],
            [LLMProvider.ANTHROPIC, 1000],
            [LLMProvider.GOOGLE, 2000]
        ]);
        this.providerCooldown.set(provider, defaultCooldowns.get(provider) || 1000);
        logger.info(`Provider ${provider} circuit breaker reset`);
    }
    async testOpenAI() {
        try {
            await this.openaiService.getAvailableModels?.();
            return true;
        }
        catch {
            return false;
        }
    }
    async testAnthropic() {
        try {
            // @ts-ignore
            if (this.anthropicService.validateApiKey) {
                // @ts-ignore
                return await this.anthropicService.validateApiKey();
            }
            return true;
        }
        catch {
            return false;
        }
    }
    async testGoogle() {
        try {
            if (this.geminiService.validateApiKey) {
                return await this.geminiService.validateApiKey();
            }
            return true;
        }
        catch {
            return false;
        }
    }
    // Get available models from all providers
    async getAvailableModels() {
        const results = await Promise.allSettled([
            this.openaiService.getAvailableModels?.() || Promise.resolve([]),
            // @ts-ignore
            this.anthropicService.getAvailableModels?.() || Promise.resolve([]),
            this.geminiService.getAvailableModels?.() || Promise.resolve([])
        ]);
        return {
            openai: results[0].status === 'fulfilled' ? results[0].value : [],
            anthropic: results[1].status === 'fulfilled' ? results[1].value : [],
            google: results[2].status === 'fulfilled' ? results[2].value : []
        };
    }
}
//# sourceMappingURL=llm-orchestrator.service.js.map