import { logger } from "@repo/ops";
import { WebhookDeliveryJobSchema } from "@repo/shared";
import PgBoss from "pg-boss";

const boss = new PgBoss(process.env.DATABASE_URL ?? "");

async function startWorker() {
  await boss.start();
  await boss.work("webhook.deliver", async ([job]) => {
    const payload = WebhookDeliveryJobSchema.parse(job.data);
    const response = await fetch(payload.webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    logger.info(
      { linkId: payload.linkId, status: response.status },
      "Delivered webhook",
    );
  });
}

startWorker().catch((error) => {
  logger.error({ error }, "Worker failed to start");
  process.exit(1);
});
