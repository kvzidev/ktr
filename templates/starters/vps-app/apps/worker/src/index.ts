import { logger } from "@repo/ops";
import PgBoss from "pg-boss";

const boss = new PgBoss(process.env.DATABASE_URL ?? "");

async function startWorker() {
  await boss.start();
  await boss.work("roadmap.digest", async ([job]) => {
    logger.info({ jobId: job.id }, "Processed roadmap digest job");
  });
}

startWorker().catch((error) => {
  logger.error({ error }, "Worker failed to start");
  process.exit(1);
});
