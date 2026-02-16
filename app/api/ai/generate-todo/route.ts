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
        const { userPrompt } = await request.json();
        const response = await aiContextService.generateTodo(userId, userPrompt)
        return NextResponse.json({ todos: response }, { status: 200 })
    } catch (error) {
        console.error('Error generating todo:', error)
        return NextResponse.json({ error: JSON.stringify(error) }, { status: 500 })
    }
}