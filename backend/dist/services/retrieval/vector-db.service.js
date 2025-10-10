import { Pinecone } from '@pinecone-database/pinecone';
export class VectorDBService {
    pinecone;
    constructor() {
        this.pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY
        });
    }
    async searchPinecone(indexName, embedding, topK = 5, filter) {
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
            content: match.metadata?.text || ''
        }));
    }
    async getEmbedding(text) {
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
//# sourceMappingURL=vector-db.service.js.map