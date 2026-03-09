import { createQueue } from "./queue-factory";

export const hourlyEventQueue = createQueue("hourly-events");
export const hourlyAggregateQueue = createQueue("hourly-aggregation");

export const dailyEventQueue = createQueue("daily-events");
export const dailyAggregateQueue = createQueue("daily-aggregation");
