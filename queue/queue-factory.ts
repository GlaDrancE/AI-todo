import { Queue, QueueOptions } from "bullmq";
import { redis as connection } from "@/shared/redis"

const defaultQueueOptions: Partial<QueueOptions> = {
    connection: connection.options,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 1000,
        },
        removeOnComplete: {
            count: 1000,
            age: 24 * 3600
        },
        removeOnFail: {
            count: 5000,
            age: 7 * 24 * 3600
        }
    }
}

export const createQueue = (name: string, options?: Partial<QueueOptions>): Queue => {
    return new Queue(name, {
        ...defaultQueueOptions as QueueOptions,
        ...options
    })
}
export { connection }