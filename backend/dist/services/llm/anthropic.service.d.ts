import { LLMProvider } from '../../types/workflow.types.js';
export declare class AnthropicService {
    private client;
    constructor();
    generateCompletion(model: string, prompt: string, temperature?: number, maxTokens?: number): Promise<{
        content: any;
        provider: LLMProvider;
        model: string;
        tokensUsed: number;
    }>;
}
//# sourceMappingURL=anthropic.service.d.ts.map