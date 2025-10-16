import { LLMProvider } from '../../types/workflow.types.js';
interface LLMRequest {
    provider: LLMProvider;
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
    private providerFailures;
    private lastCallTime;
    private providerCooldown;
    constructor();
    generateCompletion(request: LLMRequest): Promise<LLMResponse>;
    private executeWithFallback;
    private callLLM;
    private enforceRateLimit;
    private checkProviderCooldown;
    private handleProviderError;
    private smartDelay;
    private isProviderDisabled;
    private isRateLimitError;
    private isAuthError;
    private delay;
    healthCheck(): Promise<{
        openai: {
            healthy: boolean;
            failures: number;
            cooldown: number;
        };
        anthropic: {
            healthy: boolean;
            failures: number;
            cooldown: number;
        };
        google: {
            healthy: boolean;
            failures: number;
            cooldown: number;
        };
    }>;
    resetProvider(provider: LLMProvider): void;
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