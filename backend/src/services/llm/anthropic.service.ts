import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider } from '../../types/workflow.types.js';

export class AnthropicService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }

  async generateCompletion(
    model: string,
    prompt: string,
    temperature: number = 0.7,
    maxTokens: number = 1000
  ) {
    const response = await this.client.messages.create({
      model: model,
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: 'user', content: prompt }]
    });

    // @ts-ignore
    const content = response.content[0].type === 'text' 
    // @ts-ignore
      ? response.content[0].text 
      : '';

    return {
      content,
      provider: LLMProvider.ANTHROPIC,
      model,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens
    };
  }
}