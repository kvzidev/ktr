import type { ModuleDefinition } from "../types.js";

export const opsModules: ModuleDefinition[] = [
  {
    id: "ops.queue:bullmq",
    layer: "ops",
    key: "queue",
    value: "bullmq",
    label: "BullMQ",
    hint: "Valkey-backed job queue + apps/worker",
    requires: ["data.kv:valkey"],
    async apply(ctx) {
      await ctx.writeTemplateIfMissing(
        "apps/worker/package.json",
        "ops/worker-package.json",
      );
      await ctx.writeTemplateIfMissing(
        "apps/worker/src/index.ts",
        "ops/bullmq-worker.ts",
      );
      await ctx.mergePackageJson("apps/worker/package.json", {
        dependencies: {
          bullmq: "^5.40.0",
        },
      });
    },
  },
  {
    id: "ops.queue:pg-boss",
    layer: "ops",
    key: "queue",
    value: "pg-boss",
    label: "pg-boss",
    hint: "PostgreSQL-backed job queue + apps/worker",
    requires: ["data.database:postgres"],
    async apply(ctx) {
      await ctx.writeTemplateIfMissing(
        "apps/worker/package.json",
        "ops/worker-package.json",
      );
      await ctx.writeTemplateIfMissing(
        "apps/worker/src/index.ts",
        "ops/pgboss-worker.ts",
      );
      await ctx.mergePackageJson("apps/worker/package.json", {
        dependencies: {
          "pg-boss": "^10.1.0",
        },
      });
    },
  },
  {
    id: "ops.email:postmark",
    layer: "ops",
    key: "email",
    value: "postmark",
    label: "Postmark",
    hint: "Transactional email via Postmark",
    requires: ["shared.workspace:turborepo"],
    async apply(ctx) {
      await ctx.writeTemplateIfMissing(
        "packages/ops/package.json",
        "ops/ops-package.json",
      );
      await ctx.mergePackageJson("packages/ops/package.json", {
        dependencies: {
          postmark: "^4.0.5",
        },
      });
      await ctx.appendEnvExample({
        POSTMARK_SERVER_TOKEN: "",
      });
    },
  },
  {
    id: "ops.email:resend",
    layer: "ops",
    key: "email",
    value: "resend",
    label: "Resend",
    hint: "Transactional email via Resend",
    requires: ["shared.workspace:turborepo"],
    async apply(ctx) {
      await ctx.writeTemplateIfMissing(
        "packages/ops/package.json",
        "ops/ops-package.json",
      );
      await ctx.mergePackageJson("packages/ops/package.json", {
        dependencies: {
          resend: "^4.1.0",
        },
      });
      await ctx.appendEnvExample({
        RESEND_API_KEY: "",
      });
    },
  },
  {
    id: "ops.logging:pino",
    layer: "ops",
    key: "logging",
    value: "pino",
    label: "Pino",
    hint: "Structured JSON logging",
    requires: ["shared.workspace:turborepo"],
    async apply(ctx) {
      await ctx.writeTemplateIfMissing(
        "packages/ops/package.json",
        "ops/ops-package.json",
      );
      await ctx.writeTemplateIfMissing(
        "packages/ops/src/logger.ts",
        "ops/pino-logger.ts",
      );
      await ctx.mergePackageJson("packages/ops/package.json", {
        dependencies: {
          pino: "^9.6.0",
        },
      });
    },
  },
  {
    id: "ops.errors:sentry",
    layer: "ops",
    key: "errors",
    value: "sentry",
    label: "Sentry",
    hint: "Error tracking via @sentry/node",
    requires: ["shared.workspace:turborepo"],
    async apply(ctx) {
      await ctx.writeTemplateIfMissing(
        "packages/ops/package.json",
        "ops/ops-package.json",
      );
      await ctx.mergePackageJson("packages/ops/package.json", {
        dependencies: {
          "@sentry/node": "^9.0.0",
        },
      });
      await ctx.appendEnvExample({
        SENTRY_DSN: "",
      });
    },
  },
  {
    id: "ops.errors:glitchtip",
    layer: "ops",
    key: "errors",
    value: "glitchtip",
    label: "GlitchTip",
    hint: "Open-source error tracking via @sentry/node DSN",
    requires: ["shared.workspace:turborepo"],
    async apply(ctx) {
      await ctx.writeTemplateIfMissing(
        "packages/ops/package.json",
        "ops/ops-package.json",
      );
      await ctx.mergePackageJson("packages/ops/package.json", {
        dependencies: {
          "@sentry/node": "^9.0.0",
        },
      });
      await ctx.appendEnvExample({
        SENTRY_DSN: "",
      });
    },
  },
  {
    id: "ops.uptime:betterstack",
    layer: "ops",
    key: "uptime",
    value: "betterstack",
    label: "Better Stack",
    hint: "Health check endpoint conventions",
    requires: ["backend.framework:hono"],
    async apply() {
      // Health route is wired through the managed barrel when backend is enabled.
    },
  },
  {
    id: "ops.uptime:uptime-kuma",
    layer: "ops",
    key: "uptime",
    value: "uptime-kuma",
    label: "Uptime Kuma",
    hint: "Self-hosted health check endpoint conventions",
    requires: ["backend.framework:hono"],
    async apply() {
      // Health route is wired through the managed barrel when backend is enabled.
    },
  },
];
