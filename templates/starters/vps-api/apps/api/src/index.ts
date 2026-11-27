import { serve } from "@hono/node-server";
import { zValidator } from "@hono/zod-validator";
import { auth } from "@repo/auth";
import { checkRateLimit, db, valkey } from "@repo/db";
import { logger } from "@repo/ops";
import { CreateLinkSchema } from "@repo/shared";
import { Hono } from "hono";
import { registerKtrRoutes } from "./ktr/routes.js";

const app = new Hono();

registerKtrRoutes(app);

app.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));

app.use("/api/links/*", async (c, next) => {
  const clientIp = c.req.header("x-forwarded-for") ?? "local";
  const rate = await checkRateLimit(`rl:${clientIp}`, 60, 60);
  c.header("x-ratelimit-remaining", String(rate.remaining));
  if (!rate.allowed) {
    return c.json({ error: "Rate limit exceeded" }, 429);
  }
  await next();
});

app.get("/api/links", async (c) => {
  const rows = await db
    .selectFrom("links")
    .selectAll()
    .orderBy("created_at", "desc")
    .limit(50)
    .execute();
  return c.json({ links: rows });
});

app.post("/api/links", zValidator("json", CreateLinkSchema), async (c) => {
  const input = c.req.valid("json");
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await db
    .insertInto("links")
    .values({
      id,
      slug: input.slug,
      target_url: input.targetUrl,
      webhook_url: input.webhookUrl ?? null,
      clicks: 0,
      created_at: createdAt,
    })
    .execute();

  await valkey.set(`link:${input.slug}`, input.targetUrl, "EX", 300);
  logger.info({ id, slug: input.slug }, "Created short link");
  return c.json({ id, ...input, clicks: 0, createdAt }, 201);
});

export type AppType = typeof app;

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port });
