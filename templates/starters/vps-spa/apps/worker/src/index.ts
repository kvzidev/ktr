import { logger } from "@repo/ops";
import { Worker } from "bullmq";

const worker = new Worker(
  "issue-reminders",
  async (job) => {
    logger.info({ jobId: job.id, data: job.data }, "Processed issue reminder");
  },
  {
    connection: {
      url: process.env.VALKEY_URL ?? "redis://localhost:6379",
    },
  },
);

worker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "Issue reminder job failed");
});
