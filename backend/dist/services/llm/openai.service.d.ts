import { LLMProvider } from '../../types/workflow.types.js';
export interface OpenAICompletion {
    content: string;
    provider: LLMProvider;
    model: string;
    tokensUsed: number;
    finishReason: string;
}
export declare class OpenAIService {
    private client;
    constructor();
    generateCompletion(model: string, prompt: string, temperature?: number, maxTokens?: number, systemPrompt?: string): Promise<OpenAICompletion>;
    validateApiKey(): Promise<boolean>;
    getAvailableModels(): Promise<string[]>;
    estimateTokens(text: string): number;
    isWithinTokenLimit(prompt: string, model: string, maxTokens?: number): boolean;
    private getModelMaxTokens;
}
//# sourceMappingURL=openai.service.d.ts.map