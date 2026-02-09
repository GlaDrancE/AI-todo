import EmbeddingService from "@/services/EmbeddingService"
const embeddingService = new EmbeddingService();
export const onTodoComplete = async (userId: string, contentType: string = "todo_complete", text: string, todoId: string, metadata: any) => {
    await embeddingService.storeEmbedding(userId, contentType, text, todoId, metadata)
}

export const onFileUpload = async (userId: string, contentType: string = "file_upload", text: string, fileId: string, metadata: any) => {
    await embeddingService.storeEmbedding(userId, contentType, text, fileId, metadata)
}

export const onAIAnalysis = async (userId: string, contentType: string = "ai_analysis", text: string, aiAnalysisId: string, metadata: any) => {
    await embeddingService.storeEmbedding(userId, contentType, text, aiAnalysisId, metadata)
}