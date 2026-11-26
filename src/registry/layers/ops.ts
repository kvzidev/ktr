import type { CatalogLayer } from "../types.js";

export const opsLayer: CatalogLayer = {
  name: "ops",
  slots: [
    {
      key: "queue",
      kind: "select",
      message: "Background job queue",
      options: [
        {
          value: "pg-boss",
          label: "pg-boss (PostgreSQL)",
          requires: ["data.database:postgres"],
          expectedWorkspace: "apps/worker/package.json",
          templates: [
            {
              targetPath: "apps/worker/package.json",
              templatePath: "ops/worker-package.json",
            },
            {
              targetPath: "apps/worker/src/index.ts",
              templatePath: "ops/pgboss-worker.ts",
            },
          ],
          packages: [{ name: "pg-boss", target: "apps/worker" }],
        },
        {
          value: "bullmq",
          label: "BullMQ (Valkey)",
          requires: ["data.kv:valkey"],
          expectedWorkspace: "apps/worker/package.json",
          templates: [
            {
              targetPath: "apps/worker/package.json",
              templatePath: "ops/worker-package.json",
            },
            {
              targetPath: "apps/worker/src/index.ts",
              templatePath: "ops/bullmq-worker.ts",
            },
          ],
          packages: [{ name: "bullmq", target: "apps/worker" }],
        },
      ],
    },
    {
      key: "email",
      kind: "select",
      message: "Transactional email",
      options: [
        {
          value: "resend",
          label: "Resend",
          requires: ["shared.workspace:turborepo"],
          templates: [
            {
              targetPath: "packages/ops/package.json",
              templatePath: "ops/ops-package.json",
            },
          ],
          packages: [{ name: "resend", target: "packages/ops" }],
          envVars: { RESEND_API_KEY: "" },
        },
        {
          value: "postmark",
          label: "Postmark",
          requires: ["shared.workspace:turborepo"],
          templates: [
            {
              targetPath: "packages/ops/package.json",
              templatePath: "ops/ops-package.json",
            },
          ],
          packages: [{ name: "postmark", target: "packages/ops" }],
          envVars: { POSTMARK_SERVER_TOKEN: "" },
        },
      ],
    },
    {
      key: "logging",
      kind: "select",
      message: "Structured logging",
      options: [
        {
          value: "pino",
          label: "Pino",
          requires: ["shared.workspace:turborepo"],
          templates: [
            {
              targetPath: "packages/ops/package.json",
              templatePath: "ops/ops-package.json",
            },
            {
              targetPath: "packages/ops/src/logger.ts",
              templatePath: "ops/pino-logger.ts",
            },
          ],
          packages: [{ name: "pino", target: "packages/ops" }],
        },
      ],
    },
    {
      key: "errors",
      kind: "select",
      message: "Error tracking",
      options: [
        {
          value: "sentry",
          label: "Sentry",
          requires: ["shared.workspace:turborepo"],
          templates: [
            {
              targetPath: "packages/ops/package.json",
              templatePath: "ops/ops-package.json",
            },
          ],
          packages: [{ name: "@sentry/node", target: "packages/ops" }],
          envVars: { SENTRY_DSN: "" },
        },
        {
          value: "glitchtip",
          label: "GlitchTip",
          requires: ["shared.workspace:turborepo"],
          templates: [
            {
              targetPath: "packages/ops/package.json",
              templatePath: "ops/ops-package.json",
            },
          ],
          packages: [{ name: "@sentry/node", target: "packages/ops" }],
          envVars: { SENTRY_DSN: "" },
        },
      ],
    },
    {
      key: "uptime",
      kind: "select",
      message: "Uptime monitoring",
      options: [
        {
          value: "betterstack",
          label: "Better Stack",
          requires: ["backend.framework:hono"],
        },
        {
          value: "uptime-kuma",
          label: "Uptime Kuma",
          requires: ["backend.framework:hono"],
        },
      ],
    },
  ],
};
