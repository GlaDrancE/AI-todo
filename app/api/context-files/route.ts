import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { put } from "@vercel/blob"
import FileParseService from "@/services/FileParseService"

const parser = new FileParseService();

export async function POST(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 })
        }

        const blob = await put(file.name, file, {
            access: "public",
            addRandomSuffix: true,
        })

        const buffer = Buffer.from(await file.arrayBuffer())
        const extractedText = await parser.parseFile(buffer, file.type)

        const metaData = parser.extractMetadata(extractedText, file.type)

        const contextFile = await prisma.contextFile.create({
            data: {
                userId,
                name: file.name,
                type: file.type,
                size: file.size,
                storageUrl: blob.url,
                extractedText,
                metadata: metaData
            }
        })
        return NextResponse.json(contextFile);
    } catch (error) {
        console.log(error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        const contextFiles = await prisma.contextFile.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" }
        })
        return NextResponse.json(contextFiles);
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}