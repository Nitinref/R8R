import { LLMProvider } from '../../types/workflow.types.js';
import { OpenAIService } from './openai.service.js';
import { AnthropicService } from './anthropic.service.js';
import { GeminiService } from './gemini.service.js';
import { logger } from '../../utils/logger.js';

interface LLMRequest {
  provider: LLMProvider;
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  fallback?: Array<{ provider: LLMProvider; model: string }>;
}

interface LLMResponse {
  content: string;
  provider: LLMProvider;
  model: string;
  tokensUsed: number;
}

export class LLMOrchestrator {
  private openaiService: OpenAIService;
  private anthropicService: AnthropicService;
  private geminiService: GeminiService;

  constructor() {
    this.openaiService = new OpenAIService();
    this.anthropicService = new AnthropicService();
    this.geminiService = new GeminiService();
  }

  async generateCompletion(request: LLMRequest): Promise<LLMResponse> {
    try {
      return await this.executeWithFallback(request);
    } catch (error) {
      logger.error('LLM generation failed', { error, request });
      throw new Error('Failed to generate completion from all available models');
    }
  }

  private async executeWithFallback(request: LLMRequest): Promise<LLMResponse> {
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
      } catch (error) {
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

  private async callLLM(request: LLMRequest): Promise<LLMResponse> {
    switch (request.provider) {
      case LLMProvider.OPENAI:
        return await this.openaiService.generateCompletion(
          request.model,
          request.prompt,
          request.temperature,
          request.maxTokens
        );
      
      case LLMProvider.ANTHROPIC:
        return await this.anthropicService.generateCompletion(
          request.model,
          request.prompt,
          request.temperature,
          request.maxTokens
        );
      
      case LLMProvider.GOOGLE:
        return await this.geminiService.generateCompletion(
          request.model,
          request.prompt,
          request.temperature,
          request.maxTokens
        );
      
      default:
        throw new Error(`Unsupported LLM provider: ${request.provider}`);
    }
  }
}