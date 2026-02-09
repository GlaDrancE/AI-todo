-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "context_embeddings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT,
    "text" TEXT NOT NULL,
    "embedding" VECTOR(3072),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "context_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "context_embeddings_userId_idx" ON "context_embeddings"("userId");

-- CreateIndex
CREATE INDEX "context_embeddings_contentType_idx" ON "context_embeddings"("contentType");
