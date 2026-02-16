/*
  Warnings:

  - Made the column `embedding` on table `context_embeddings` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "context_embeddings" ALTER COLUMN "embedding" SET NOT NULL;
