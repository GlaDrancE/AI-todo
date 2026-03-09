/*
  Warnings:

  - Added the required column `completionEstimatedMinutes` to the `todos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priority` to the `todos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheduledFor` to the `todos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `todos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tasksCategoryId` to the `todos` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TodoStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskEventType" AS ENUM ('TASK_CREATED', 'TASK_SCHEDULED', 'TASK_RESCHEDULED', 'TASK_STARTED', 'TASK_COMPLETED', 'TASK_CANCELLED', 'TASK_DELETED');

-- AlterTable
ALTER TABLE "todos" ADD COLUMN     "completionEstimatedMinutes" INTEGER NOT NULL,
ADD COLUMN     "priority" INTEGER NOT NULL,
ADD COLUMN     "rescheduledCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scheduledFor" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "status" "TodoStatus" NOT NULL,
ADD COLUMN     "tasksCategoryId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "tasks_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_events" (
    "id" TEXT NOT NULL,
    "todoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" "TaskEventType" NOT NULL,
    "eventValue" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_user_metrics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalTasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "totalTasksScheduled" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgDelayHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRescheduledTasks" INTEGER NOT NULL DEFAULT 0,
    "deepWorkCompletionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "daily_user_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_metrics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgDelayHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRescheduledTasks" INTEGER NOT NULL DEFAULT 0,
    "frictionScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hourly_productivity_metrics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hour" INTEGER NOT NULL,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgDelay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tasksAttempted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hourly_productivity_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tasks_categories_id_idx" ON "tasks_categories"("id");

-- CreateIndex
CREATE INDEX "task_events_id_idx" ON "task_events"("id");

-- CreateIndex
CREATE INDEX "task_events_todoId_idx" ON "task_events"("todoId");

-- CreateIndex
CREATE INDEX "daily_user_metrics_id_idx" ON "daily_user_metrics"("id");

-- CreateIndex
CREATE INDEX "daily_user_metrics_userId_idx" ON "daily_user_metrics"("userId");

-- CreateIndex
CREATE INDEX "category_metrics_id_idx" ON "category_metrics"("id");

-- CreateIndex
CREATE INDEX "category_metrics_userId_idx" ON "category_metrics"("userId");

-- CreateIndex
CREATE INDEX "category_metrics_categoryId_idx" ON "category_metrics"("categoryId");

-- CreateIndex
CREATE INDEX "hourly_productivity_metrics_id_idx" ON "hourly_productivity_metrics"("id");

-- CreateIndex
CREATE INDEX "hourly_productivity_metrics_userId_idx" ON "hourly_productivity_metrics"("userId");

-- CreateIndex
CREATE INDEX "hourly_productivity_metrics_hour_idx" ON "hourly_productivity_metrics"("hour");

-- AddForeignKey
ALTER TABLE "todos" ADD CONSTRAINT "todos_tasksCategoryId_fkey" FOREIGN KEY ("tasksCategoryId") REFERENCES "tasks_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_events" ADD CONSTRAINT "task_events_todoId_fkey" FOREIGN KEY ("todoId") REFERENCES "todos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_metrics" ADD CONSTRAINT "category_metrics_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "tasks_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
