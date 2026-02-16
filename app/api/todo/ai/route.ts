import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import EmbeddingService from "@/services/EmbeddingService";

const embeddingService = new EmbeddingService();
export async function POST(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        const { todos } = await request.json();
        await prisma.todo.createMany({
            data: todos.map((todo: string) => {
                return {
                    userId,
                    text: todo,
                }
            }),
        })

        // Query back the created records
        const createdTodos = await prisma.todo.findMany({
            where: {
                userId,
                text: {
                    in: todos,
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: todos.length,
        })
        const storeEmbeddingPromise = new Promise((resolve, reject) => {
            createdTodos.map(async (todo: any) => {
                embeddingService.storeEmbedding(

                    userId,
                    "todo_generated",
                    todo.text,
                    todo.id,
                    { createdAt: todo.createdAt, completed: false }
                ).catch(err => console.error("Failed to store embeddings", err))
            })
            resolve(createdTodos)
        })
        await Promise.all([storeEmbeddingPromise])

        return NextResponse.json(createdTodos)
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}