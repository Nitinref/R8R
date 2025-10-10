import { LLMProvider } from '../../types/workflow.types.js';
export declare class OpenAIService {
    private client;
    constructor();
    generateCompletion(model: string, prompt: string, temperature?: number, maxTokens?: number): Promise<{
        content: string;
        provider: LLMProvider;
        model: string;
        tokensUsed: number;
    }>;
}
//# sourceMappingURL=openai.service.d.ts.map