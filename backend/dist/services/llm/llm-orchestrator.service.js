import { LLMProvider } from '../../types/workflow.types.js';
import { OpenAIService } from './openai.service.js';
import { AnthropicService } from './anthropic.service.js';
import { GeminiService } from './gemini.service.js';
import { logger } from '../../utils/logger.js';
export class LLMOrchestrator {
    openaiService;
    anthropicService;
    geminiService;
    constructor() {
        this.openaiService = new OpenAIService();
        this.anthropicService = new AnthropicService();
        this.geminiService = new GeminiService();
    }
    async generateCompletion(request) {
        const startTime = Date.now();
        try {
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
                logger.info(`Attempting LLM call (${index + 1}/${attempts.length})`, {
                    provider: attempt.provider,
                    model: attempt.model
                });
                const response = await this.callLLM({
                    ...request,
                    provider: attempt.provider,
                    model: attempt.model
                });
                logger.info(`LLM call successful`, {
                    provider: attempt.provider,
                    model: attempt.model,
                    tokensUsed: response.tokensUsed
                });
                return response;
            }
            catch (error) {
                lastError = error;
                logger.warn(`LLM call failed`, {
                    provider: attempt.provider,
                    model: attempt.model,
                    error: error.message,
                    attempt: `${index + 1}/${attempts.length}`
                });
                // Add a small delay between retries to avoid rate limits
                if (index < attempts.length - 1) {
                    await this.delay(100 * (index + 1)); // Increasing delay
                }
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
                return await this.geminiService.generateCompletion(commonParams.model, commonParams.prompt, commonParams.temperature, commonParams.maxTokens, 
                // @ts-ignore
                commonParams.systemPrompt);
            default:
                throw new Error(`Unsupported LLM provider: ${request.provider}`);
        }
    }
    // Utility method to add delay between retries
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    // Health check for all services
    async healthCheck() {
        const results = await Promise.allSettled([
            this.testOpenAI(),
            this.testAnthropic(),
            this.testGoogle()
        ]);
        return {
            openai: results[0].status === 'fulfilled',
            anthropic: results[1].status === 'fulfilled',
            google: results[2].status === 'fulfilled'
        };
    }
    async testOpenAI() {
        try {
            // Try to list models as a lightweight health check
            await this.openaiService.getAvailableModels?.();
            return true;
        }
        catch {
            return false;
        }
    }
    async testAnthropic() {
        try {
            // Anthropic health check - try a simple completion if available
            // @ts-ignore
            if (this.anthropicService.validateApiKey) {
                // @ts-ignore
                return await this.anthropicService.validateApiKey();
            }
            return true; // Assume healthy if no health check method
        }
        catch {
            return false;
        }
    }
    async testGoogle() {
        try {
            // Google health check
            // @ts-ignore
            if (this.geminiService.validateApiKey) {
                // @ts-ignore
                return await this.geminiService.validateApiKey();
            }
            return true; // Assume healthy if no health check method
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
            // @ts-ignore
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