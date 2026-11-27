import { serve } from "@hono/node-server";
import { zValidator } from "@hono/zod-validator";
import { auth } from "@repo/auth";
import { db } from "@repo/db";
import { logger } from "@repo/ops";
import { CreateIssueSchema } from "@repo/shared";
import { Hono } from "hono";
import sanitizeHtml from "sanitize-html";
import { registerKtrRoutes } from "./ktr/routes.js";

const app = new Hono();

registerKtrRoutes(app);

app.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));

const routes = app
  .get("/api/issues", async (c) => {
    const issues = await db
      .selectFrom("issues")
      .selectAll()
      .orderBy("created_at", "desc")
      .execute();
    return c.json({ issues });
  })
  .post("/api/issues", zValidator("json", CreateIssueSchema), async (c) => {
    const input = c.req.valid("json");
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const title = sanitizeHtml(input.title);

    await db
      .insertInto("issues")
      .values({
        id,
        title,
        priority: input.priority,
        status: "todo",
        created_at: createdAt,
      })
      .execute();

    logger.info({ id, priority: input.priority }, "Created issue");
    return c.json({ id, title, priority: input.priority, status: "todo", createdAt }, 201);
  });

export type AppType = typeof routes;

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port });
