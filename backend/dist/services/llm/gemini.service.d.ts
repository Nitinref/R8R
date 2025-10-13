import { LLMProvider } from '../../types/workflow.types.js';
export interface GeminiCompletion {
    content: string;
    provider: LLMProvider;
    model: string;
    tokensUsed: number;
    finishReason?: string;
    safetyRatings?: Array<{
        category: string;
        probability: string;
    }>;
}
export declare class GeminiService {
    private client;
    private initialized;
    constructor();
    generateCompletion(model: string, prompt: string, temperature?: number, maxTokens?: number, systemPrompt?: string): Promise<GeminiCompletion>;
    private validateModel;
    private mapFinishReason;
    private estimateTokens;
    validateApiKey(): Promise<boolean>;
    getAvailableModels(): Promise<string[]>;
    checkSafety(prompt: string): Promise<{
        isSafe: boolean;
        blockReasons: string[];
    }>;
}
//# sourceMappingURL=gemini.service.d.ts.map