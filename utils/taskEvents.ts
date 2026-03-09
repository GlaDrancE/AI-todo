import { prisma } from "@/lib/prisma";
import { TaskEventType } from "../prisma/generated/prisma/enums";
import { dailyEventQueue, hourlyEventQueue } from "@/queue";

type TaskEventPayload = {
  userId: string;
  todoId: string;
  eventType: TaskEventType;
  eventValue: any;
};

export async function recordTaskEvent({
  userId,
  todoId,
  eventType,
  eventValue,
}: TaskEventPayload) {
  await prisma.taskEvent.create({
    data: {
      userId,
      todoId,
      eventType,
      eventValue,
    },
  });
  await hourlyEventQueue.add(eventType, {
    userId,
    todoId,
    eventType,
    eventValue,
  })
  await dailyEventQueue.add(eventType, {
    userId,
    todoId,
    eventType,
    eventValue,
  })
}

