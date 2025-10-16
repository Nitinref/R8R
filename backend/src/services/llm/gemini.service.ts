import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider } from '../../types/workflow.types.js';

export interface GeminiCompletion {
  content: string;
  provider: LLMProvider;
  model: string;
  tokensUsed: number;
  finishReason?: string;
  safetyRatings?: Array<{
    category: string;
    probability: string;
  }>;
}

export class GeminiService {
  private client: GoogleGenerativeAI;
  private initialized: boolean = false;

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY;
    
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is required');
    }

    try {
      this.client = new GoogleGenerativeAI(apiKey);
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize Google Generative AI: ${(error as Error).message}`);
    }
  }

  async generateCompletion(
    model: string,
    prompt: string,
    temperature: number = 0.7,
    maxTokens: number = 1000,
    systemPrompt?: string
  ): Promise<GeminiCompletion> {
    if (!this.initialized) {
      throw new Error('Gemini service not properly initialized');
    }

    // Validate inputs
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty');
    }

    temperature = Math.max(0, Math.min(1, temperature)); // Gemini temperature range is 0-1
    maxTokens = Math.max(1, Math.min(8192, maxTokens)); // Reasonable limits

    try {
      // Combine system prompt and user prompt
      let fullPrompt = prompt;
      if (systemPrompt) {
        fullPrompt = `${systemPrompt}\n\n${prompt}`;
      }

      // ✅ FIXED: Use the correct model names
      const validatedModel = this.validateModel(model);
      
      const genModel = this.client.getGenerativeModel({ 
        model: validatedModel,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          topP: 0.95,
          topK: 40,
        },
        safetySettings: [
          {
               // @ts-ignore
            category: "HARM_CATEGORY_HARASSMENT",
               // @ts-ignore
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
               // @ts-ignore
            category: "HARM_CATEGORY_HATE_SPEECH",
               // @ts-ignore
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
               // @ts-ignore
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
               // @ts-ignore
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
               // @ts-ignore
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
               // @ts-ignore
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      });
      
      const result = await genModel.generateContent(fullPrompt);
      const response = result.response;

      if (!response.text()) {
        throw new Error('Empty response from Gemini API');
      }

      // Check for safety blocks
      if (response.promptFeedback?.blockReason) {
        throw new Error(`Content blocked due to: ${response.promptFeedback.blockReason}`);
      }
      // @ts-ignore
      return {
        content: response.text(),
        provider: LLMProvider.GOOGLE,
        model: validatedModel, // ✅ Return the validated model name
        tokensUsed: response.usageMetadata?.totalTokenCount || this.estimateTokens(fullPrompt + response.text()),
        finishReason: this.mapFinishReason(response.candidates?.[0]?.finishReason),
        safetyRatings: response.candidates?.[0]?.safetyRatings?.map(rating => ({
          category: rating.category,
          probability: rating.probability
        }))
      };

    } catch (error: any) {
      console.error('Gemini API Error:', {
        model,
        temperature,
        maxTokens,
        promptLength: prompt.length,
        error: error.message,
        status: error.status,
        code: error.code
      });

      // Handle specific Gemini errors
      if (error.status === 400) {
        throw new Error(`Invalid request to Gemini API: ${error.message}`);
      } else if (error.status === 401) {
        throw new Error('Invalid Google API key');
      } else if (error.status === 403) {
        throw new Error('Google API access denied or quota exceeded');
      } else if (error.status === 429) {
        throw new Error('Google API rate limit exceeded');
      } else if (error.status === 500) {
        throw new Error('Google API internal server error');
      } else if (error.message?.includes('blocked')) {
        throw new Error(`Content blocked by safety filters: ${error.message}`);
      } else if (error.message?.includes('404') || error.message?.includes('not found')) {
        // ✅ FIXED: Handle model not found errors with correct model names
        throw new Error(`Gemini model not found: ${model}. Available models: gemini-1.5-pro, gemini-1.5-flash, gemini-pro`);
      }

      throw new Error(`Gemini API call failed: ${error.message}`);
    }
  }

  // ✅ FIXED: Updated validateModel method with CORRECT model names
  private validateModel(model: string): string {
    // ✅ CORRECT: Actual available Gemini models
    const supportedModels = [
      'gemini-1.5-pro',      // Gemini 1.5 Pro
      'gemini-1.5-flash',    // Gemini 1.5 Flash  
      'gemini-pro'           // Gemini 1.0 Pro (legacy)
    ];

    // Map common incorrect names to correct ones
    const modelMappings: Record<string, string> = {
      'gemini-1.5-pro-latest': 'gemini-1.5-pro',
      'gemini-1.5-flash-latest': 'gemini-1.5-flash',
      'gemini-1.0-pro': 'gemini-pro',
      'gemini-flash': 'gemini-1.5-flash',
      'gpt-3.5-turbogemini-1.5-flash-latest': 'gemini-1.5-flash' // Handle corrupted names
    };

    // Use mapped model if available, otherwise use the original
    const mappedModel = modelMappings[model] || model;

    // Check if the model is supported
    if (!supportedModels.includes(mappedModel)) {
      console.warn(`Model ${model} not supported, defaulting to gemini-1.5-flash`);
      return 'gemini-1.5-flash'; // Default to a working model
    }

    return mappedModel;
  }

  private mapFinishReason(finishReason?: string): string {
    const reasonMap: { [key: string]: string } = {
      'STOP': 'completed',
      'MAX_TOKENS': 'length',
      'SAFETY': 'safety',
      'RECITATION': 'recitation',
      'OTHER': 'other'
    };

    return finishReason ? (reasonMap[finishReason] || finishReason) : 'unknown';
  }

  // Estimate tokens for Gemini (rough approximation)
  private estimateTokens(text: string): number {
    // Gemini uses a different tokenization than OpenAI
    // Rough estimate: ~4 characters per token for English
    return Math.ceil(text.length / 4);
  }

  // Health check method
  async validateApiKey(): Promise<boolean> {
    try {
      // ✅ FIXED: Use correct model name
      const testModel = this.client.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await testModel.generateContent('Hello');
      return !!result.response.text();
    } catch (error) {
      console.error('Gemini API key validation failed:', error);
      return false;
    }
  }

  // ✅ FIXED: Get available models with CORRECT names
  async getAvailableModels(): Promise<string[]> {
    return [
      'gemini-1.5-pro',
      'gemini-1.5-flash', 
      'gemini-pro'
    ];
  }

  // Check if content is likely to be blocked by safety filters
  async checkSafety(prompt: string): Promise<{
    isSafe: boolean;
    blockReasons: string[];
  }> {
    try {
      // ✅ FIXED: Use correct model name
      const genModel = this.client.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        safetySettings: [
          {
            //@ts-ignore
            category: "HARM_CATEGORY_HARASSMENT",
              //@ts-ignore
            threshold: "BLOCK_ONLY_HIGH"
          },
          {
              //@ts-ignore
            category: "HARM_CATEGORY_HATE_SPEECH",
              //@ts-ignore
            threshold: "BLOCK_ONLY_HIGH"
          },
          {
            //@ts-ignore
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            //@ts-ignore
            threshold: "BLOCK_ONLY_HIGH"
          },
          {
            //@ts-ignore
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            //@ts-ignore
            threshold: "BLOCK_ONLY_HIGH"
          }
        ]
      });

      const result = await genModel.generateContent(prompt);
      const response = result.response;

      return {
        isSafe: !response.promptFeedback?.blockReason,
        blockReasons: response.promptFeedback?.blockReason ? [response.promptFeedback.blockReason] : []
      };
    } catch (error) {
      console.error('Safety check failed:', error);
      return { isSafe: false, blockReasons: ['Safety check failed'] };
    }
  }

  // ✅ NEW: Method to test all available models
  async testAllModels(): Promise<{ model: string; working: boolean; error?: string }[]> {
    const models = await this.getAvailableModels();
    const results = [];

    for (const model of models) {
      try {
        const testModel = this.client.getGenerativeModel({ model });
        const result = await testModel.generateContent('Test message - please respond with "OK"');
        
        results.push({
          model,
          working: true,
          response: result.response.text()
        });
      } catch (error: any) {
        results.push({
          model,
          working: false,
          error: error.message
        });
      }
    }

    return results;
  }
}