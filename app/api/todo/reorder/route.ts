import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { recordTaskEvent } from "@/utils/taskEvents";
import { TaskEventType } from "@/prisma/generated/prisma/enums";

type ReorderPayload = {
  id: string;
  priority: number;
  scheduledFor?: string | null;
};

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { updates } = (await request.json()) as { updates: ReorderPayload[] };

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "No updates provided" },
        { status: 400 }
      );
    }

    const ids = updates.map((u) => u.id);

    const existingTodos = await prisma.todo.findMany({
      where: {
        id: { in: ids },
        userId,
      },
    });

    const existingById = new Map(existingTodos.map((t) => [t.id, t]));

    const results = [];

    for (const update of updates) {
      const current = existingById.get(update.id);
      if (!current) {
        continue;
      }

      let newScheduledFor: Date | null = current.scheduledFor;

      if ("scheduledFor" in update) {
        if (update.scheduledFor === null || update.scheduledFor === undefined) {
          newScheduledFor = null;
        } else {
          const parsed = new Date(update.scheduledFor);
          if (!isNaN(parsed.getTime())) {
            newScheduledFor = parsed;
          }
        }
      }

      const priorityChanged = current.priority !== update.priority;
      const scheduleChanged =
        (!!current.scheduledFor && !!newScheduledFor &&
          current.scheduledFor.getTime() !== newScheduledFor.getTime()) ||
        (!!current.scheduledFor && !newScheduledFor) ||
        (!current.scheduledFor && !!newScheduledFor);

      if (!newScheduledFor) { return NextResponse.json({ error: "Invalid scheduled for date" }, { status: 400 }) }

      const updated = await prisma.todo.update({
        where: { id: current.id },
        data: {
          priority: update.priority,
          scheduledFor: newScheduledFor,
          ...(scheduleChanged && {
            rescheduledCount: current.rescheduledCount + 1,
          }),
        },
      });

      if (priorityChanged || scheduleChanged) {
        await recordTaskEvent({
          userId,
          todoId: updated.id,
          eventType: TaskEventType.TASK_RESCHEDULED,
          eventValue: {
            previousPriority: current.priority,
            newPriority: updated.priority,
            previousScheduledFor: current.scheduledFor,
            newScheduledFor: updated.scheduledFor,
          },
        });
      }

      results.push(updated);
    }

    return NextResponse.json({ todos: results });
  } catch (error) {
    console.error("Error reordering todos:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

