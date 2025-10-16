import { LLMProvider } from '../../types/workflow.types.js';
import { OpenAIService } from './openai.service.js';
import { AnthropicService } from './anthropic.service.js';
import { GeminiService } from './gemini.service.js';
import { logger } from '../../utils/logger.js';

interface LLMRequest {
  provider: LLMProvider;
 query: string;
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
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
    } catch (error) {
      logger.error('LLM generation failed after all attempts', { 
        request: {
          provider: request.provider,
          model: request.model,
          promptLength: request.prompt.length,
          temperature: request.temperature,
          maxTokens: request.maxTokens
        },
        error: (error as Error).message,
        duration: Date.now() - startTime
      });
      
      throw new Error(`Failed to generate completion from all available models: ${(error as Error).message}`);
    }
  }

  private async executeWithFallback(request: LLMRequest): Promise<LLMResponse> {
    const attempts = [
      { provider: request.provider, model: request.model },
      ...(request.fallback || [])
    ];

    let lastError: Error | null = null;

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
      } catch (error) {
        lastError = error as Error;
        
        logger.warn(`LLM call failed`, { 
          provider: attempt.provider, 
          model: attempt.model,
          error: (error as Error).message,
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

  private async callLLM(request: LLMRequest): Promise<LLMResponse> {
    const commonParams = {
      model: request.model,
      prompt: request.prompt,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      systemPrompt: request.systemPrompt
    };

    switch (request.provider) {
      case LLMProvider.OPENAI:
        return await this.openaiService.generateCompletion(
          commonParams.model,
          commonParams.prompt,
          commonParams.temperature,
          commonParams.maxTokens,
          commonParams.systemPrompt
        );
      
      case LLMProvider.ANTHROPIC:
        return await this.anthropicService.generateCompletion(
          commonParams.model,
          commonParams.prompt,
          commonParams.temperature,
          commonParams.maxTokens,
          // @ts-ignore
          commonParams.systemPrompt
        );
      
      case LLMProvider.GOOGLE:
        return await this.geminiService.generateCompletion(
          commonParams.model,
          commonParams.prompt,
          commonParams.temperature,
          commonParams.maxTokens,
          // @ts-ignore
          commonParams.systemPrompt
        );
      
      default:
        throw new Error(`Unsupported LLM provider: ${request.provider}`);
    }
  }

  // Utility method to add delay between retries
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check for all services
  async healthCheck(): Promise<{
    openai: boolean;
    anthropic: boolean;
    google: boolean;
  }> {
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

  private async testOpenAI(): Promise<boolean> {
    try {
      // Try to list models as a lightweight health check
      await this.openaiService.getAvailableModels?.();
      return true;
    } catch {
      return false;
    }
  }

  private async testAnthropic(): Promise<boolean> {
    try {
      // Anthropic health check - try a simple completion if available
      // @ts-ignore
      if (this.anthropicService.validateApiKey) {
        // @ts-ignore
        return await this.anthropicService.validateApiKey();
      }
      return true; // Assume healthy if no health check method
    } catch {
      return false;
    }
  }

  private async testGoogle(): Promise<boolean> {
    try {
      // Google health check
      // @ts-ignore
      if (this.geminiService.validateApiKey) {
        // @ts-ignore
        return await this.geminiService.validateApiKey();
      }
      return true; // Assume healthy if no health check method
    } catch {
      return false;
    }
  }

  // Get available models from all providers
  async getAvailableModels(): Promise<{
    openai: string[];
    anthropic: string[];
    google: string[];
  }> {
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