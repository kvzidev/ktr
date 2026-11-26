import { Worker } from "bullmq";

export function startWorker() {
  return new Worker(
    "default",
    async (job) => {
      console.log("Processing job", job.id);
    },
    { connection: { url: process.env.VALKEY_URL ?? "redis://localhost:6379" } },
  );
}
