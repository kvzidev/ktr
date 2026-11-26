import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { registerKtrRoutes } from "./ktr/routes.js";

const app = new Hono();

registerKtrRoutes(app);

export type AppType = typeof app;

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port });
