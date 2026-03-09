import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import EmbeddingService from "@/services/EmbeddingService";
import { recordTaskEvent } from "@/utils/taskEvents";
import { TaskEventType } from "../../../prisma/generated/prisma/enums";
const embeddingService = new EmbeddingService();
export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Get start and end of today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const todos = await prisma.todo.findMany({
            where: {
                userId,
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                deleted: false
            },
            include: { files: true },
            orderBy: { createdAt: 'asc' }
        })
        return NextResponse.json(todos)
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const {
            text,
            priority,
            scheduledFor,
            status,
            completionEstimatedMinutes,
            category,
        } = await request.json();

        // Ensure a TasksCategory exists for this user and category name
        let categoryRecord = await prisma.tasksCategory.findFirst({
            where: {
                userId,
                name: category,
            },
        });

        if (!categoryRecord) {
            categoryRecord = await prisma.tasksCategory.create({
                data: {
                    userId,
                    name: category,
                },
            });
        }

        const todo = await prisma.todo.create({
            data: {
                userId,
                text,
                priority,
                scheduledFor,
                status,
                completionEstimatedMinutes,
                tasksCategoryId: categoryRecord.id,
            },
        });

        await recordTaskEvent({
            userId,
            todoId: todo.id,
            eventType: TaskEventType.TASK_CREATED,
            eventValue: {
                text: todo.text,
                priority: todo.priority,
                scheduledFor: todo.scheduledFor,
                status: todo.status,
                completionEstimatedMinutes: todo.completionEstimatedMinutes,
            },
        });

        return NextResponse.json(todo);
    } catch (error) {
        console.error("Error creating todo:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
export async function PUT(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        const { id, text } = await request.json();
        const todo = await prisma.todo.update({
            where: { id },
            data: { text }
        })
        return NextResponse.json(todo)
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
