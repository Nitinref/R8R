import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';

interface VectorSearchResult {
  id: string;
  score: number;
  metadata: Record<string, any>;
  content: string;
}

export class VectorDBService {
  private pinecone: Pinecone;
  private openai: OpenAI;

  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!
    });
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async searchPinecone(
    indexName: string,
    embedding: number[],
    topK: number = 5,
    filter?: Record<string, any>
  ): Promise<VectorSearchResult[]> {
    const index = this.pinecone.index(indexName);
    
    // @ts-ignore
    const queryResponse = await index.query({
      vector: embedding,
      topK,
      includeMetadata: true,
      filter
    });

    return queryResponse.matches.map(match => ({
      id: match.id,
      score: match.score || 0,
      metadata: match.metadata || {},
      content: (match.metadata?.text as string) || ''
    }));
  }

  async getEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    });

    // @ts-ignore
    return response.data[0].embedding;
  }
}