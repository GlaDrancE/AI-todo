-- CreateTable
CREATE TABLE "context_files" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "extractedText" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "context_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_contexts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastProcessedAt" TIMESTAMP(3),
    "embeddingVersion" TEXT,
    "contextSummary" TEXT,

    CONSTRAINT "ai_contexts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "context_files_userId_idx" ON "context_files"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_contexts_userId_key" ON "ai_contexts"("userId");
