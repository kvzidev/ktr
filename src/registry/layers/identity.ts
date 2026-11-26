import type { ModuleDefinition } from "../types.js";

export const identityModules: ModuleDefinition[] = [
  {
    id: "identity.auth:better-auth",
    layer: "identity",
    key: "auth",
    value: "better-auth",
    label: "Better Auth",
    hint: "Authentication with @better-auth/kysely-adapter",
    requires: [
      "backend.framework:hono",
      "data.database:postgres",
      "data.dal:kysely",
    ],
    async apply(ctx) {
      await ctx.writeTemplateIfMissing(
        "packages/auth/package.json",
        "identity/auth-package.json",
      );
      await ctx.writeTemplateIfMissing(
        "packages/auth/src/index.ts",
        "identity/auth-index.ts",
      );
      await ctx.appendEnvExample({
        BETTER_AUTH_SECRET: "replace-with-32-char-secret",
        BETTER_AUTH_URL: "http://localhost:3001",
      });
    },
  },
  {
    id: "identity.bot_shield:turnstile",
    layer: "identity",
    key: "bot_shield",
    value: "turnstile",
    label: "Cloudflare Turnstile",
    hint: "Turnstile verification middleware for Hono",
    requires: ["backend.framework:hono"],
    recommends: ["data.kv:valkey"],
    async apply(ctx) {
      await ctx.writeTemplateIfMissing(
        "packages/auth/package.json",
        "identity/auth-package.json",
      );
      await ctx.writeTemplateIfMissing(
        "packages/auth/src/turnstile.ts",
        "identity/turnstile.ts",
      );
      await ctx.appendEnvExample({
        TURNSTILE_SECRET_KEY: "",
      });
    },
  },
];
