import { LLMProvider } from '../../types/workflow.types.js';
interface LLMRequest {
    provider: LLMProvider;
    query: string;
    model: string;
    prompt: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
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
    private delay;
    healthCheck(): Promise<{
        openai: boolean;
        anthropic: boolean;
        google: boolean;
    }>;
    private testOpenAI;
    private testAnthropic;
    private testGoogle;
    getAvailableModels(): Promise<{
        openai: string[];
        anthropic: string[];
        google: string[];
    }>;
}
export {};
//# sourceMappingURL=llm-orchestrator.service.d.ts.map