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
        try {
            return await this.executeWithFallback(request);
        }
        catch (error) {
            logger.error('LLM generation failed', { error, request });
            throw new Error('Failed to generate completion from all available models');
        }
    }
    async executeWithFallback(request) {
        const attempts = [
            { provider: request.provider, model: request.model },
            ...(request.fallback || [])
        ];
        for (const attempt of attempts) {
            try {
                logger.info(`Attempting LLM call`, { provider: attempt.provider, model: attempt.model });
                const response = await this.callLLM({
                    ...request,
                    provider: attempt.provider,
                    model: attempt.model
                });
                return response;
            }
            catch (error) {
                logger.warn(`LLM call failed`, {
                    provider: attempt.provider,
                    model: attempt.model,
                    // @ts-ignore
                    error: error.message
                });
                // If this was the last attempt, throw
                if (attempt === attempts[attempts.length - 1]) {
                    throw error;
                }
            }
        }
        throw new Error('All LLM attempts failed');
    }
    async callLLM(request) {
        switch (request.provider) {
            case LLMProvider.OPENAI:
                return await this.openaiService.generateCompletion(request.model, request.prompt, request.temperature, request.maxTokens);
            case LLMProvider.ANTHROPIC:
                return await this.anthropicService.generateCompletion(request.model, request.prompt, request.temperature, request.maxTokens);
            case LLMProvider.GOOGLE:
                return await this.geminiService.generateCompletion(request.model, request.prompt, request.temperature, request.maxTokens);
            default:
                throw new Error(`Unsupported LLM provider: ${request.provider}`);
        }
    }
}
//# sourceMappingURL=llm-orchestrator.service.js.map