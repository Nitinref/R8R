import { LLMProvider } from '../../types/workflow.types.js';
export interface GeminiCompletion {
    content: string;
    provider: LLMProvider;
    model: string;
    tokensUsed: number;
    finishReason?: string;
}
export declare class GeminiService {
    private client;
    private initialized;
    constructor();
    generateCompletion(model: string, prompt: string, temperature?: number, maxTokens?: number, systemPrompt?: string): Promise<GeminiCompletion>;
    private validateModel;
    private estimateTokens;
    validateApiKey(): Promise<boolean>;
    getAvailableModels(): Promise<string[]>;
}
//# sourceMappingURL=gemini.service.d.ts.map