import type { Hono } from "hono";

export function registerKtrRoutes(app: Hono) {
  app.get("/health", (c) => c.json({ ok: true }));
}
