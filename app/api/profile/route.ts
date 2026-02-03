import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const profile = await prisma.userProfile.findUnique({
            where: { userId }
        })

        return NextResponse.json(profile)
    } catch (error) {
        console.error('Error fetching profile:', error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { whoIAm, whatIWantToAchieve, whatIWantInLife } = await request.json();

        const profile = await prisma.userProfile.upsert({
            where: { userId },
            update: {
                whoIAm,
                whatIWantToAchieve,
                whatIWantInLife,
            },
            create: {
                userId,
                whoIAm,
                whatIWantToAchieve,
                whatIWantInLife,
            }
        })

        return NextResponse.json(profile)
    } catch (error) {
        console.error('Error saving profile:', error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

