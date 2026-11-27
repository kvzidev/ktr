import { serve } from "@hono/node-server";
import { zValidator } from "@hono/zod-validator";
import { auth } from "@repo/auth";
import { db } from "@repo/db";
import { logger } from "@repo/ops";
import { CreateRoadmapItemSchema } from "@repo/shared";
import { Hono } from "hono";
import sanitizeHtml from "sanitize-html";
import { registerKtrRoutes } from "./ktr/routes.js";

const app = new Hono();

registerKtrRoutes(app);

app.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));

app.get("/api/roadmap", async (c) => {
  const items = await db
    .selectFrom("roadmap_items")
    .selectAll()
    .orderBy("votes", "desc")
    .execute();
  return c.json({ items });
});

app.post(
  "/api/roadmap",
  zValidator("json", CreateRoadmapItemSchema),
  async (c) => {
    const input = c.req.valid("json");
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const description = sanitizeHtml(input.description);

    await db
      .insertInto("roadmap_items")
      .values({
        id,
        title: input.title,
        description,
        status: "planned",
        votes: 1,
        created_at: createdAt,
      })
      .execute();

    logger.info({ id }, "Created roadmap item");
    return c.json({ id, title: input.title, description, status: "planned", votes: 1, createdAt }, 201);
  },
);

export type AppType = typeof app;

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port });
