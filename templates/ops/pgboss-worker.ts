import PgBoss from "pg-boss";

export async function startWorker() {
  const boss = new PgBoss(process.env.DATABASE_URL ?? "");
  await boss.start();
  return boss;
}
