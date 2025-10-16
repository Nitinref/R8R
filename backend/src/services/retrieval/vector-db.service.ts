import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAI } from 'openai';

interface VectorSearchResult {
  id: string;
  score: number;
  metadata: Record<string, any>;
  content: string;
}

export class VectorDBService {
  private qdrant: QdrantClient;
  private openai: OpenAI;
  private collectionName = 'r8r-documents';

  constructor() {
    // @ts-ignore
    this.qdrant = new QdrantClient({
      url: process.env.QDRANT_URL!,
      apiKey: process.env.QDRANT_API_KEY
    });
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.initializeCollection();
  }

  private async initializeCollection(): Promise<void> {
    try {
      // Check if collection exists
      const collections = await this.qdrant.getCollections();
      const exists = collections.collections.some(c => c.name === this.collectionName);
      
      if (!exists) {
        // Create collection with 1536 dimensions (matching OpenAI)
        await this.qdrant.createCollection(this.collectionName, {
          vectors: {
            size: 1536, // text-embedding-3-small dimension
            distance: 'Cosine'
          }
        });
        console.log('✅ Qdrant collection created:', this.collectionName);
      }
    } catch (error) {
      // @ts-ignore
      console.error('❌ Qdrant initialization failed:', error.message);
    }
  }

  async searchVectors(
    embedding: number[],
    topK: number = 5,
    filter?: Record<string, any>
  ): Promise<VectorSearchResult[]> {
    try {
      const searchResult = await this.qdrant.search(this.collectionName, {
        vector: embedding,
        limit: topK,
        filter: filter ? this.buildQdrantFilter(filter) : undefined,
        with_payload: true
      });
      // @ts-ignore
      return searchResult.map(result => ({
        id: result.id as string,
        score: result.score || 0,
        metadata: result.payload?.metadata || {},
        content: result.payload?.content || ''
      }));
    } catch (error) {
      console.error('Qdrant search failed:', error);
      return [];
    }
  }

  async upsertDocument(
    id: string, 
    content: string, 
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const embedding = await this.getEmbedding(content);
    
    await this.qdrant.upsert(this.collectionName, {
      wait: true,
      points: [
        {
          id: id,
          vector: embedding,
          payload: {
            content,
            metadata,
            timestamp: new Date().toISOString()
          }
        }
      ]
    });
  }

  async getEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    });
// @ts-ignore
    return response.data[0].embedding;
  }

  private buildQdrantFilter(filter: Record<string, any>): any {
    // Convert simple filter to Qdrant filter format
    const conditions = Object.entries(filter).map(([key, value]) => ({
      key: `metadata.${key}`,
      match: { value }
    }));

    return {
      must: conditions
    };
  }

  // Get collection stats
  async getCollectionStats(): Promise<any> {
    return await this.qdrant.getCollection(this.collectionName);
  }
}