import { prisma } from "@/lib/prisma";
import AIContextService from "@/services/AIContextService";
import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const aiContextService = new AIContextService();
export const POST = async (request: Request) => {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        const { todoText } = await request.json()
        const response = await aiContextService.analyzeTodo(userId, todoText)
        return NextResponse.json({ todos: response }, { status: 200 })
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export const PUT = async (request: Request) => {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        const { currentTodos, newTodos } = await request.json();

        await prisma.todo.deleteMany({
            where: {
                userId,
                text: {
                    in: currentTodos.map((todo: any) => todo.text)
                }
            }
        })
        const todoResponse = await prisma.todo.createMany({
            data: newTodos.map((todo: any) => {
                return {
                    userId,
                    text: todo.text,
                }
            })
        })
        return NextResponse.json(todoResponse)
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}