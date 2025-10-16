import OpenAI from "openai";
import { LLMProvider } from '../../types/workflow.types.js';
export class GeminiService {
    client;
    initialized = false;
    constructor() {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            throw new Error('GOOGLE_API_KEY environment variable is required');
        }
        try {
            this.client = new OpenAI({
                apiKey: apiKey,
                baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
            });
            this.initialized = true;
        }
        catch (error) {
            throw new Error(`Failed to initialize Google Generative AI: ${error.message}`);
        }
    }
    async generateCompletion(model, prompt, temperature = 0.7, maxTokens = 1000, systemPrompt) {
        if (!this.initialized) {
            throw new Error('Gemini service not properly initialized');
        }
        try {
            const messages = [];
            if (systemPrompt) {
                messages.push({ role: "system", content: systemPrompt });
            }
            messages.push({ role: "user", content: prompt });
            const response = await this.client.chat.completions.create({
                model: this.validateModel(model),
                // @ts-ignore
                messages: messages,
                temperature: temperature,
                max_tokens: maxTokens,
            });
            const choice = response.choices[0];
            // @ts-ignore
            if (!choice.message.content) {
                throw new Error('Empty response from Gemini API');
            }
            return {
                // @ts-ignore
                content: choice.message.content,
                provider: LLMProvider.GOOGLE,
                model: model,
                // @ts-ignore
                tokensUsed: response.usage?.total_tokens || this.estimateTokens(prompt + choice.message.content),
                // @ts-ignore
                finishReason: choice.finish_reason || 'completed'
            };
        }
        catch (error) {
            console.error('Gemini API Error:', {
                model,
                temperature,
                maxTokens,
                promptLength: prompt.length,
                error: error.message
            });
            throw new Error(`Gemini API call failed: ${error.message}`);
        }
    }
    validateModel(model) {
        // ✅ Working models with OpenAI-compatible endpoint
        const supportedModels = [
            'gemini-2.0-flash',
            'gemini-1.5-flash',
            'gemini-1.5-pro',
            'gemini-pro'
        ];
        // Map common names
        const modelMappings = {
            'gemini-1.5-flash-latest': 'gemini-1.5-flash',
            'gemini-1.5-pro-latest': 'gemini-1.5-pro',
            'gemini-flash': 'gemini-1.5-flash'
        };
        const mappedModel = modelMappings[model] || model;
        if (!supportedModels.includes(mappedModel)) {
            console.warn(`Model ${model} not recognized, defaulting to gemini-1.5-flash`);
            return 'gemini-1.5-flash';
        }
        return mappedModel;
    }
    estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }
    async validateApiKey() {
        try {
            const response = await this.client.chat.completions.create({
                model: 'gemini-1.5-flash',
                messages: [{ role: "user", content: "Hello" }],
                max_tokens: 10
            });
            // @ts-ignore
            return !!response.choices[0].message.content;
        }
        catch (error) {
            console.error('Gemini API key validation failed:', error);
            return false;
        }
    }
    async getAvailableModels() {
        return [
            'gemini-2.0-flash',
            'gemini-1.5-flash',
            'gemini-1.5-pro',
            'gemini-pro'
        ];
    }
}
//# sourceMappingURL=gemini.service.js.map