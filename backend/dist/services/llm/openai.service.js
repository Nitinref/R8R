import OpenAI from 'openai';
import { LLMProvider } from '../../types/workflow.types.js';
export class OpenAIService {
    client;
    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY environment variable is required');
        }
        this.client = new OpenAI({
            apiKey: apiKey,
            timeout: 30000, // 30 second timeout
            maxRetries: 3,
        });
    }
    async generateCompletion(model, prompt, temperature = 0.7, maxTokens = 1000, systemPrompt) {
        try {
            const messages = [];
            // Add system message if provided
            if (systemPrompt) {
                messages.push({
                    role: 'system',
                    content: systemPrompt
                });
            }
            // Add user message
            messages.push({
                role: 'user',
                content: prompt
            });
            const response = await this.client.chat.completions.create({
                model: model,
                // @ts-ignore
                messages: messages,
                temperature: Math.max(0, Math.min(2, temperature)), // Clamp between 0-2
                max_tokens: maxTokens,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0,
            });
            const choice = response.choices[0];
            if (!choice || !choice.message || !choice.message.content) {
                throw new Error('No content in OpenAI response');
            }
            if (choice.finish_reason === 'length') {
                console.warn('OpenAI response was truncated due to token limit');
            }
            return {
                content: choice.message.content,
                provider: LLMProvider.OPENAI,
                model,
                tokensUsed: response.usage?.total_tokens || 0,
                finishReason: choice.finish_reason || 'unknown'
            };
        }
        catch (error) {
            console.error('OpenAI API Error:', {
                model,
                temperature,
                maxTokens,
                error: error.message,
                code: error.code,
                status: error.status
            });
            // Handle specific OpenAI errors
            if (error.code === 'invalid_api_key') {
                throw new Error('Invalid OpenAI API key');
            }
            else if (error.code === 'insufficient_quota') {
                throw new Error('OpenAI API quota exceeded');
            }
            else if (error.status === 429) {
                throw new Error('OpenAI API rate limit exceeded');
            }
            else if (error.status === 503) {
                throw new Error('OpenAI API service unavailable');
            }
            throw new Error(`OpenAI API call failed: ${error.message}`);
        }
    }
    // Additional utility methods
    async validateApiKey() {
        try {
            await this.client.models.list();
            return true;
        }
        catch (error) {
            return false;
        }
    }
    async getAvailableModels() {
        try {
            const response = await this.client.models.list();
            return response.data
                .map(model => model.id)
                .filter(id => id.includes('gpt')) // Filter for GPT models
                .sort();
        }
        catch (error) {
            console.error('Failed to fetch OpenAI models:', error);
            return [];
        }
    }
    // Estimate token count (rough estimation)
    estimateTokens(text) {
        // Rough estimation: ~4 characters per token for English text
        return Math.ceil(text.length / 4);
    }
    // Check if prompt is within token limits for a model
    isWithinTokenLimit(prompt, model, maxTokens = 4096) {
        const estimatedTokens = this.estimateTokens(prompt);
        const modelMaxTokens = this.getModelMaxTokens(model);
        return estimatedTokens <= Math.min(modelMaxTokens, maxTokens);
    }
    // Get maximum tokens for different models
    getModelMaxTokens(model) {
        if (model.includes('gpt-4-32k'))
            return 32768;
        if (model.includes('gpt-4'))
            return 8192;
        if (model.includes('gpt-3.5-turbo-16k'))
            return 16384;
        if (model.includes('gpt-3.5-turbo'))
            return 4096;
        return 4096; // Default
    }
}
//# sourceMappingURL=openai.service.js.map