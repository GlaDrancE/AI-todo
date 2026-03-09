import { dailyEventQueue, hourlyEventQueue } from ".";
import { Job, Worker } from "bullmq";
import { connection } from "./queue-factory";
import { prisma } from "@/lib/prisma";
import { TaskEventType } from "@/prisma/generated/prisma/enums";

type UserHourlyStats = {
    created: number;
    completed: Job[];
    rescheduled: number;
    deleted: number;
};

export const hourlyAggregationWorker = new Worker(
    "hourly-aggregation",
    async (job: Job) => {
        const now = new Date();
        const end = new Date(now);
        end.setMinutes(0, 0, 0);

        const start = new Date(end);
        start.setHours(end.getHours() - 1);

        const hourOfDay = start.getHours();

        const waitingJobs = await hourlyEventQueue.getWaiting();
        const jobsInWindow = waitingJobs

        const perUser = new Map<string, UserHourlyStats>();

        for (const eventJob of jobsInWindow) {
            const { userId, eventType } = eventJob.data as {
                userId?: string;
                eventType?: TaskEventType;
            };

            if (!userId || !eventType) continue;

            let stats = perUser.get(userId);
            if (!stats) {
                stats = { created: 0, completed: [], rescheduled: 0, deleted: 0 };
                perUser.set(userId, stats);
            }


            switch (eventType) {
                case TaskEventType.TASK_CREATED:
                    stats.created += 1;
                    break;
                case TaskEventType.TASK_COMPLETED:
                    stats.completed.push(eventJob);
                    break;
                case TaskEventType.TASK_RESCHEDULED:
                    stats.rescheduled += 1;
                    break;
                case TaskEventType.TASK_DELETED:
                    stats.deleted += 1;
                    break;
            }
        }

        const metricsToInsert: {
            userId: string;
            hour: number;
            completionRate: number;
            avgDelay: number;
            tasksAttempted: number;
        }[] = [];

        for (const [userId, stats] of perUser.entries()) {
            const tasksAttempted = stats.created;
            const tasksCompleted = stats.completed.length;

            const completionRate = tasksCompleted

            let avgDelay = 0;

            if (tasksCompleted > 0) {
                let totalDelayHours = 0;

                for (const completedJob of stats.completed) {
                    const { eventValue } = completedJob.data as {
                        eventValue?: { scheduledFor?: string | Date };
                    };


                    if (!eventValue?.scheduledFor) continue;

                    const scheduledFor = new Date(eventValue.scheduledFor);
                    const completionTime = new Date(completedJob.timestamp);

                    const delayMs = completionTime.getTime() - scheduledFor.getTime();
                    if (delayMs < 0) continue;
                    const delayHours = delayMs / (1000 * 60 * 60);

                    totalDelayHours += delayHours;
                }

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

        for (const eventJob of jobsInWindow) {
            await eventJob.remove();
        }

        return {
            windowStart: start.toISOString(),
            windowEnd: end.toISOString(),
            processedJobs: jobsInWindow.length,
            users: perUser.size,
            aggregationJobId: job.id,
        };
    },
    {
        connection: connection.options,
    }
);

hourlyAggregationWorker.on("completed", (job: Job) => {
    console.log(`Hourly aggregation job ${job.id} completed`);
});

hourlyAggregationWorker.on("error", (error: Error) => {
    console.error(`Hourly aggregation worker error: ${error.message}`);
});



export const dailyAggregationWorker = new Worker("daily-aggregation", async (job: Job) => {
    const waitingJobs = await dailyEventQueue.getWaiting();
    const jobsInWindow = waitingJobs

    const perUser = new Map<string, UserHourlyStats>();

    for (const eventJob of jobsInWindow) {
        const { userId, eventType } = eventJob.data as {
            userId?: string;
            eventType?: TaskEventType;
        };

        if (!userId || !eventType) continue;

        let stats = perUser.get(userId);
        if (!stats) {
            stats = { created: 0, completed: [], rescheduled: 0, deleted: 0 };
            perUser.set(userId, stats);
        }


        switch (eventType) {
            case TaskEventType.TASK_CREATED:
                stats.created += 1;
                break;
            case TaskEventType.TASK_COMPLETED:
                stats.completed.push(eventJob);
                break;
            case TaskEventType.TASK_RESCHEDULED:
                stats.rescheduled += 1;
                break;
            case TaskEventType.TASK_DELETED:
                stats.deleted += 1;
                break;
        }
    }
    const metricsToInsert: {
        userId: string;
        date: Date;
        totalTasksCompleted: number;
        totalTasksScheduled: number;
        completionRate: number;
        avgDelayHours: number;
        totalRescheduledTasks: number;
        deepWorkCompletionRate: number;
    }[] = [];

    for (const [userId, stats] of perUser.entries()) {
        const tasksAttempted = stats.created;
        const tasksCompleted = stats.completed.length;

        const completionRate = tasksCompleted

        let avgDelay = 0;

        if (tasksCompleted > 0) {
            let totalDelayHours = 0;

            for (const completedJob of stats.completed) {
                const { eventValue } = completedJob.data as {
                    eventValue?: { scheduledFor?: string | Date };
                };


                if (!eventValue?.scheduledFor) continue;

                const scheduledFor = new Date(eventValue.scheduledFor);
                const completionTime = new Date(completedJob.timestamp);

                const delayMs = completionTime.getTime() - scheduledFor.getTime();
                if (delayMs < 0) continue;
                const delayHours = delayMs / (1000 * 60 * 60);

                totalDelayHours += delayHours;
            }

            avgDelay = totalDelayHours / tasksCompleted;
        }

        metricsToInsert.push({
            userId,
            date: new Date(),
            totalTasksCompleted: tasksCompleted,
            totalTasksScheduled: tasksAttempted,
            completionRate: tasksCompleted / tasksAttempted,
            avgDelayHours: avgDelay,
            totalRescheduledTasks: stats.rescheduled,
            deepWorkCompletionRate: 0
        });
    }


    if (metricsToInsert.length > 0) {
        await prisma.dailyUserMetrics.createMany({
            data: metricsToInsert,
        });
    }

})