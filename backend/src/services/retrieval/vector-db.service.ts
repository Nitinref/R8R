import { Pinecone } from '@pinecone-database/pinecone';

interface VectorSearchResult {
  id: string;
  score: number;
  metadata: Record<string, any>;
  content: string;
}

export class VectorDBService {
  private pinecone: Pinecone;

  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!
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
    // Using OpenAI for embeddings
    const openai = new (require('openai')).OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    });

    return response.data[0].embedding;
  }
}