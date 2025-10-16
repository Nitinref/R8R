import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAI } from 'openai';
export class VectorDBService {
    qdrant;
    openai;
    collectionName = 'r8r-documents';
    constructor() {
        // @ts-ignore
        this.qdrant = new QdrantClient({
            url: process.env.QDRANT_URL,
            apiKey: process.env.QDRANT_API_KEY
        });
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        this.initializeCollection();
    }
    async initializeCollection() {
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
        }
        catch (error) {
            // @ts-ignore
            console.error('❌ Qdrant initialization failed:', error.message);
        }
    }
    async searchVectors(embedding, topK = 5, filter) {
        try {
            const searchResult = await this.qdrant.search(this.collectionName, {
                vector: embedding,
                limit: topK,
                filter: filter ? this.buildQdrantFilter(filter) : undefined,
                with_payload: true
            });
            // @ts-ignore
            return searchResult.map(result => ({
                id: result.id,
                score: result.score || 0,
                metadata: result.payload?.metadata || {},
                content: result.payload?.content || ''
            }));
        }
        catch (error) {
            console.error('Qdrant search failed:', error);
            return [];
        }
    }
    async upsertDocument(id, content, metadata = {}) {
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
    async getEmbedding(text) {
        const response = await this.openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text
        });
        // @ts-ignore
        return response.data[0].embedding;
    }
    buildQdrantFilter(filter) {
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
    async getCollectionStats() {
        return await this.qdrant.getCollection(this.collectionName);
    }
}
//# sourceMappingURL=vector-db.service.js.map