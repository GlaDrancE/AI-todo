-- DropForeignKey
ALTER TABLE "task_events" DROP CONSTRAINT "task_events_todoId_fkey";

-- AddForeignKey
ALTER TABLE "task_events" ADD CONSTRAINT "task_events_todoId_fkey" FOREIGN KEY ("todoId") REFERENCES "todos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
