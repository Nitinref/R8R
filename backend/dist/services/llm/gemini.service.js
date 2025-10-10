import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider } from '../../types/workflow.types.js';
export class GeminiService {
    client;
    constructor() {
        this.client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    }
    async generateCompletion(model, prompt, temperature = 0.7, maxTokens = 1000) {
        const genModel = this.client.getGenerativeModel({ model });
        const result = await genModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature,
                maxOutputTokens: maxTokens,
            }
        });
        const response = result.response;
        return {
            content: response.text(),
            provider: LLMProvider.GOOGLE,
            model,
            tokensUsed: response.usageMetadata?.totalTokenCount || 0
        };
    }
}
//# sourceMappingURL=gemini.service.js.map