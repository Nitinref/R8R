import { LLMProvider } from '../../types/workflow.types.js';
interface LLMRequest {
    provider: LLMProvider;
    model: string;
    prompt: string;
    temperature?: number;
    maxTokens?: number;
    fallback?: Array<{
        provider: LLMProvider;
        model: string;
    }>;
}
interface LLMResponse {
    content: string;
    provider: LLMProvider;
    model: string;
    tokensUsed: number;
}
export declare class LLMOrchestrator {
    private openaiService;
    private anthropicService;
    private geminiService;
    constructor();
    generateCompletion(request: LLMRequest): Promise<LLMResponse>;
    private executeWithFallback;
    private callLLM;
}
export {};
//# sourceMappingURL=llm-orchestrator.service.d.ts.map