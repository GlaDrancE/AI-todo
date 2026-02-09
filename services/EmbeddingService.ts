import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";
const googleGenAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY as string });
class EmbeddingService {
    private generateEmbedding = async (text: string) => {
        const response = await googleGenAI.models.embedContent({
            model: "gemini-embedding-001",
            contents: { parts: [{ text }] }
        })
        const embeddingArray = Array.from(response.embeddings?.values() || [])
        // return response.embeddings?.values()
        return embeddingArray[0].values;
    }
    async storeEmbedding(
        userId: string,
        contentType: string,
        text: string,
        contentId?: string,
        metadata?: any
    ) {
        const embedding = await this.generateEmbedding(text)
        console.log("Storing embedding:", embedding?.slice(0, 5), "... (showing first 5 values)");

        const vectorString = `[${embedding?.join(',')}]`;


        await prisma.$executeRaw`
          INSERT INTO context_embeddings ("id", "userId", "contentType", "contentId", "text", "embedding", "metadata", "createdAt")
          VALUES (gen_random_uuid(), ${userId}, ${contentType}, ${contentId}, ${text}, ${vectorString}::vector, ${JSON.stringify(metadata)}::jsonb, NOW())
        `
    }

    searchRelevantContext = async (userId: string, query: string, limit: number = 5) => {

        const queryEmbedding = await this.generateEmbedding(query)

        const vectorString = `[${queryEmbedding?.join(',')}]`

        const result = await prisma.$queryRaw<Array<{
            text: string
            contentType: string
            similarity: number
        }>>`
      SELECT 
        "text", 
        "contentType",
        1 - (embedding <=> ${vectorString}::vector) as similarity
      FROM context_embeddings
      WHERE "userId" = ${userId}
      ORDER BY embedding <=> ${vectorString}::vector
      LIMIT ${limit}
        `
        return result.map(r => ({
            text: r.text,
            contentType: r.contentType,
            similarity: r.similarity
        }))
    }
}
export default EmbeddingService;