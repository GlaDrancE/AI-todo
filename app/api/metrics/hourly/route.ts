import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// This route is intended to be called by an external scheduler (cron)
// once every hour to compute and store HourlyProductivityMetrics.

export async function POST() {
    try {
        const now = new Date();

        // Previous full hour [start, end)
        const end = new Date(now);
        end.setMinutes(0, 0, 0); // top of current hour

        const start = new Date(end);
        start.setHours(end.getHours() - 1);

        const hourOfDay = start.getHours(); // 0-23

        // Tasks created in this hour => attempted
        const attemptedTodos = await prisma.todo.findMany({
            where: {
                createdAt: {
                    gte: start,
                    lt: end,
                },
                deleted: false,
            },
            select: {
                id: true,
                userId: true,
            },
        });

        // Tasks completed in this hour (updatedAt as completion time)
        const completedTodos = await prisma.todo.findMany({
            where: {
                completed: true,
                updatedAt: {
                    gte: start,
                    lt: end,
                },
                deleted: false,
            },
            select: {
                id: true,
                userId: true,
                scheduledFor: true,
                updatedAt: true,
            },
        });

        const userIds = new Set<string>();
        attemptedTodos.forEach((t) => userIds.add(t.userId));
        completedTodos.forEach((t) => userIds.add(t.userId));

        const metricsToInsert: {
            userId: string;
            hour: number;
            completionRate: number;
            avgDelay: number;
            tasksAttempted: number;
        }[] = [];

        for (const userId of userIds) {
            const attemptedForUser = attemptedTodos.filter((t) => t.userId === userId);
            const completedForUser = completedTodos.filter((t) => t.userId === userId);

            const tasksAttempted = attemptedForUser.length;
            const tasksCompleted = completedForUser.length;

            const completionRate =
                tasksAttempted > 0 ? tasksCompleted / tasksAttempted : 0;

            // Average delay in hours for tasks completed in this hour
            let avgDelay = 0;
            if (tasksCompleted > 0) {
                const totalDelayHours = completedForUser.reduce((sum, todo) => {
                    if (!todo.scheduledFor) return sum;
                    const delayMs =
                        todo.updatedAt.getTime() - new Date(todo.scheduledFor).getTime();
                    const delayHours = delayMs / (1000 * 60 * 60);
                    return sum + delayHours;
                }, 0);

                avgDelay = totalDelayHours / tasksCompleted;
            }

            metricsToInsert.push({
                userId,
                hour: hourOfDay,
                completionRate,
                avgDelay,
                tasksAttempted,
            });
        }

        if (metricsToInsert.length > 0) {
            await prisma.hourlyProductivityMetrics.createMany({
                data: metricsToInsert,
            });
        }

        return NextResponse.json({
            windowStart: start.toISOString(),
            windowEnd: end.toISOString(),
            hour: hourOfDay,
            recordsCreated: metricsToInsert.length,
        });
    } catch (error) {
        console.error("Error computing hourly metrics:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}