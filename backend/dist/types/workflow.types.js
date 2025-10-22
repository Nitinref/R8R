// types/workflow.types.ts
export var StepType;
(function (StepType) {
    StepType["QUERY_REWRITE"] = "query_rewrite";
    StepType["RETRIEVAL"] = "retrieval";
    StepType["RERANK"] = "rerank";
    StepType["ANSWER_GENERATION"] = "answer_generation";
    StepType["POST_PROCESS"] = "post_process";
    StepType["MEMORY_UPDATE"] = "memory_update";
    StepType["MEMORY_SUMMARIZE"] = "memory_summarize";
    StepType["MEMORY_RETRIEVE"] = "memory_retrieve"; // UPPERCASE
})(StepType || (StepType = {}));
export var LLMProvider;
(function (LLMProvider) {
    LLMProvider["OPENAI"] = "openai";
    LLMProvider["ANTHROPIC"] = "anthropic";
    LLMProvider["GOOGLE"] = "google";
    LLMProvider["MISTRAL"] = "mistral";
})(LLMProvider || (LLMProvider = {}));
export var RetrieverType;
(function (RetrieverType) {
    RetrieverType["PINECONE"] = "pinecone";
    RetrieverType["WEAVIATE"] = "weaviate";
    RetrieverType["KEYWORD"] = "keyword";
    RetrieverType["HYBRID"] = "hybrid";
})(RetrieverType || (RetrieverType = {}));
//# sourceMappingURL=workflow.types.js.map