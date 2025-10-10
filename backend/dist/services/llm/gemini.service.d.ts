import { LLMProvider } from '../../types/workflow.types.js';
export declare class GeminiService {
    private client;
    constructor();
    generateCompletion(model: string, prompt: string, temperature?: number, maxTokens?: number): Promise<{
        content: string;
        provider: LLMProvider;
        model: string;
        tokensUsed: number;
    }>;
}
//# sourceMappingURL=gemini.service.d.ts.map