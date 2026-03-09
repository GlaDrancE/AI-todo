import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { onTodoComplete } from '@/utils/todo'
import { recordTaskEvent } from '@/utils/taskEvents'
import { TaskEventType } from '@/prisma/generated/prisma/enums'

// PATCH - Update a todo (toggle completed)
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { completed, text } = await req.json()
        const { id } = await params  // Await params here

        // Verify the todo belongs to the user
        const existingTodo = await prisma.todo.findFirst({
            where: { id, userId },
        })

        if (!existingTodo) {
            return NextResponse.json({ error: 'Todo not found' }, { status: 404 })
        }

        if (completed) {
            await recordTaskEvent({
                userId,
                todoId: id,
                eventType: TaskEventType.TASK_COMPLETED,
                eventValue: {
                    text: existingTodo.text,
                    priority: existingTodo.priority,
                    scheduledFor: existingTodo.scheduledFor,
                    status: existingTodo.status,
                },
            })
        }

        const todo = await prisma.todo.update({
            where: { id },
            data: { completed },
            include: { files: true },
        })

        return NextResponse.json({ todo })
    } catch (error) {
        console.error('Error updating todo:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// DELETE - Delete a todo
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params  // Await params here

        // Verify the todo belongs to the user
        const existingTodo = await prisma.todo.findFirst({
            where: { id, userId },
        })

        if (!existingTodo) {
            return NextResponse.json({ error: 'Todo not found' }, { status: 404 })
        }

        await prisma.todo.update({
            where: { id },
            data: { deleted: true },
        })

        await recordTaskEvent({
            userId,
            todoId: id,
            eventType: TaskEventType.TASK_DELETED,
            eventValue: {
                text: existingTodo.text,
                priority: existingTodo.priority,
                scheduledFor: existingTodo.scheduledFor,
                status: existingTodo.status,
            },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting todo:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function PUT(request: Request, { params }: {
    params: Promise<{ id: string }>
}) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const { id } = await params;
        const { status, text } = await request.json();
        if (status === "completed") {
            await onTodoComplete(userId, "todo_complete", text, id, { completedAt: new Date() })
        }
        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Error updating todo:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}