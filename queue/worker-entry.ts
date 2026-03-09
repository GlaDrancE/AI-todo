import "./worker";
import { dailyAggregateQueue, hourlyAggregateQueue } from ".";

void (async () => {
    await hourlyAggregateQueue.add(
        "hourly-aggregation",
        {},
        {
            repeat: {
                pattern: "* * * * *",
            },
            removeOnComplete: true,
            removeOnFail: 10,
        }
    );
})();
void (async () => {
    await dailyAggregateQueue.add(
        "daily-aggregation",
        {},
        {
            repeat: {
                pattern: "0 0 * * *",
            },
            removeOnComplete: true,
            removeOnFail: 10,
        }
    );
})();