export declare class CacheService {
    private client;
    constructor();
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: any, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
    generateKey(workflowId: string, query: string): string;
}
//# sourceMappingURL=cache.service.d.ts.map