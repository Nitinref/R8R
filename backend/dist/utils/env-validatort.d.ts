export declare function validateEnvironment(): void;
export declare function isProviderAvailable(provider: 'openai' | 'anthropic' | 'google' | 'pinecone'): boolean;
export declare function getAvailableProviders(): {
    llm: string[];
    retrieval: string[];
};
export declare function displayProviderStatus(): void;
export declare function validateProvider(provider: 'openai' | 'anthropic' | 'google' | 'pinecone'): {
    available: boolean;
    message: string;
};
export declare function getEnvironmentInfo(): {
    nodeEnv: string;
    port: string;
    hasDatabase: boolean;
    hasRedis: boolean;
    llmProviders: string[];
    retrievalProviders: string[];
};
//# sourceMappingURL=env-validatort.d.ts.map