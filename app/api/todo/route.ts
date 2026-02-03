import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        const todos = await prisma.todo.findMany({
            where: { userId },
            include: { files: true },
            orderBy: { createdAt: 'desc' }
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
        return NextResponse.json(todo)
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}