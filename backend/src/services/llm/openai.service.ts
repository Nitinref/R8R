import OpenAI from 'openai';
import { LLMProvider } from '../../types/workflow.types.js';

export class OpenAIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async generateCompletion(
    model: string,
    prompt: string,
    temperature: number = 0.7,
    maxTokens: number = 1000
  ) {
    const response = await this.client.chat.completions.create({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens
    });

    return {
        // @ts-ignore
      content: response.choices[0].message.content || '',
      provider: LLMProvider.OPENAI,
      model,
      tokensUsed: response.usage?.total_tokens || 0
    };
  }
}