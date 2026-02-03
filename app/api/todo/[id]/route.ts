import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

        const { completed } = await req.json()
        const { id } = await params  // Await params here

        // Verify the todo belongs to the user
        const existingTodo = await prisma.todo.findFirst({
            where: { id, userId },
        })

        if (!existingTodo) {
            return NextResponse.json({ error: 'Todo not found' }, { status: 404 })
        }

        const todo = await prisma.todo.update({
            where: { id },
            data: { completed },
            include: { files: true },
        })

        return NextResponse.json(todo)
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

        await prisma.todo.delete({
            where: { id },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting todo:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}