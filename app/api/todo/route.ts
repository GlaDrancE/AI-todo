import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import EmbeddingService from "@/services/EmbeddingService"
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
                }
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
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        const { text } = await request.json();
        const todo = await prisma.todo.create({
            data: {
                userId, text,
            }
        })
        embeddingService.storeEmbedding(userId, "todo_created", text, todo.id,
            { createdAt: todo.createdAt, completed: false }).catch(err => console.error("Failed to store embeddings", err))
        return NextResponse.json(todo)
    } catch (error) {
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
