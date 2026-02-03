import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        const { todos } = await request.json();
        const response = await prisma.todo.createMany({
            data: todos.map((todo: string) => {
                return {
                    userId,
                    text: todo,
                }
            })
        })
        return NextResponse.json(response)
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}