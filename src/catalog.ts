export interface PackageSpec {
  name: string;
  version?: string;
  target?: string;
  dev?: boolean;
  when?: (cfg: Record<string, Record<string, unknown>>) => boolean;
}

export interface CreateCliSpec {
  targetDir: string;
  command: string;
  args: string[];
  fallbackPackage?: {
    path: string;
    name: string;
  };
}

export interface TemplateSpec {
  targetPath: string;
  templatePath: string;
  interpolateProjectName?: boolean;
}

export interface InlineFileSpec {
  targetPath: string;
  content: string;
}

export interface DockerServiceSpec {
  name: string;
  definition: Record<string, unknown>;
}

export interface CatalogOption {
  value: string;
  label: string;
  hint?: string;
  requires?: string[];
  recommends?: string[];
  when?: (cfg: Record<string, Record<string, unknown>>) => boolean;
  create?: CreateCliSpec;
  packages?: PackageSpec[];
  templates?: TemplateSpec[];
  files?: InlineFileSpec[];
  packagePatches?: { path: string; patch: Record<string, unknown> }[];
  dockerServices?: DockerServiceSpec[];
  envVars?: Record<string, string>;
  expectedWorkspace?: string;
}

export type SlotKind = "select" | "multi" | "boolean";

export interface CatalogSlot {
  key: string;
  kind: SlotKind;
  message: string;
  defaultValue?: unknown;
  when?: (cfg: Record<string, Record<string, unknown>>) => boolean;
  options: CatalogOption[];
}

export interface CatalogLayer {
  name:
    | "shared"
    | "frontend"
    | "backend"
    | "data"
    | "identity"
    | "commerce"
    | "ops"
    | "infra";
  slots: CatalogSlot[];
}

export const STACK_CATALOG: readonly CatalogLayer[] = [
  {
    name: "shared",
    slots: [
      {
        key: "workspace",
        kind: "select",
        message: "Workspace manager",
        options: [
          {
            value: "turborepo",
            label: "Turborepo",
            hint: "pnpm workspaces + turbo",
            expectedWorkspace: "pnpm-workspace.yaml",
            templates: [
              {
                targetPath: "pnpm-workspace.yaml",
                templatePath: "shared/pnpm-workspace.yaml",
              },
              {
                targetPath: "turbo.json",
                templatePath: "shared/turbo.json",
              },
              {
                targetPath: "package.json",
                templatePath: "shared/root-package.json",
                interpolateProjectName: true,
              },
            ],
            packages: [{ name: "turbo", target: ".", dev: true }],
          },
        ],
      },
      {
        key: "validation",
        kind: "select",
        message: "Shared validation",
        options: [
          {
            value: "zod",
            label: "Zod",
            hint: "packages/shared schemas",
            expectedWorkspace: "packages/shared/package.json",
            templates: [
              {
                targetPath: "packages/shared/package.json",
                templatePath: "shared/shared-package.json",
              },
              {
                targetPath: "packages/shared/src/index.ts",
                templatePath: "shared/shared-index.ts",
              },
            ],
            packages: [
              { name: "zod", version: "^4", target: "packages/shared" },
            ],
          },
        ],
      },
      {
        key: "quality",
        kind: "select",
        message: "Formatter & linter",
        options: [
          {
            value: "biome",
            label: "Biome",
            templates: [
              {
                targetPath: "biome.json",
                templatePath: "shared/biome.json",
              },
            ],
            packagePatches: [
              {
                path: "package.json",
                patch: { scripts: { check: "biome check --write ." } },
              },
            ],
            packages: [{ name: "@biomejs/biome", target: ".", dev: true }],
          },
        ],
      },
      {
        key: "testing",
        kind: "multi",
        message: "Testing tools (space to toggle, enter to continue)",
        options: [
          {
            value: "vitest",
            label: "Vitest",
            packagePatches: [
              {
                path: "package.json",
                patch: { scripts: { test: "turbo run test" } },
              },
            ],
            packages: [{ name: "vitest", target: ".", dev: true }],
          },
          {
            value: "playwright",
            label: "Playwright",
            packagePatches: [
              {
                path: "package.json",
                patch: { scripts: { "test:e2e": "playwright test" } },
              },
            ],
            packages: [{ name: "@playwright/test", target: ".", dev: true }],
          },
        ],
      },
    ],
  },
  {
    name: "frontend",
    slots: [
      {
        key: "framework",
        kind: "select",
        message: "Frontend framework",
        options: [
          {
            value: "astro",
            label: "Astro",
            requires: ["shared.workspace:turborepo"],
            expectedWorkspace: "apps/web/package.json",
            create: {
              targetDir: "apps/web",
              command: "pnpm",
              args: [
                "create",
                "astro",
                "apps/web",
                "--",
                "--template",
                "minimal",
                "--no-git",
                "--no-install",
                "--yes",
              ],
              fallbackPackage: {
                path: "apps/web/package.json",
                name: "@repo/web",
              },
            },
          },
          {
            value: "vite-react",
            label: "Vite + React",
            requires: ["shared.workspace:turborepo"],
            expectedWorkspace: "apps/web/package.json",
            create: {
              targetDir: "apps/web",
              command: "pnpm",
              args: [
                "create",
                "vite",
                "apps/web",
                "--",
                "--template",
                "react-ts",
              ],
              fallbackPackage: {
                path: "apps/web/package.json",
                name: "@repo/web",
              },
            },
          },
        ],
      },
      {
        key: "css",
        kind: "select",
        message: "CSS framework",
        when: (cfg) => cfg.frontend?.framework !== "none",
        options: [
          {
            value: "tailwind",
            label: "Tailwind CSS",
            packages: [
              { name: "tailwindcss", version: "^4", target: "apps/web" },
            ],
            files: [
              {
                targetPath: "apps/web/src/styles/global.css",
                content: '@import "tailwindcss";\n',
              },
            ],
          },
        ],
      },
      {
        key: "state",
        kind: "select",
        message: "Client state",
        when: (cfg) => cfg.frontend?.framework !== "none",
        options: [
          {
            value: "nanostores",
            label: "Nano Stores",
            packages: [
              { name: "nanostores", target: "apps/web" },
              {
                name: "@nanostores/react",
                target: "apps/web",
                when: (cfg) => cfg.frontend?.framework === "vite-react",
              },
            ],
            files: [
              {
                targetPath: "apps/web/src/stores/app.ts",
                content:
                  'import { atom } from "nanostores";\n\nexport const $counter = atom(0);\n',
              },
            ],
          },
        ],
      },
      {
        key: "data_fetching",
        kind: "select",
        message: "Data fetching",
        when: (cfg) => cfg.frontend?.framework !== "none",
        options: [
          {
            value: "tanstack-query",
            label: "TanStack Query",
            packages: [{ name: "@tanstack/react-query", target: "apps/web" }],
          },
        ],
      },
      {
        key: "forms",
        kind: "select",
        message: "Forms",
        when: (cfg) => cfg.frontend?.framework !== "none",
        options: [
          {
            value: "astro-actions",
            label: "Astro Actions",
            when: (cfg) => cfg.frontend?.framework === "astro",
            files: [
              {
                targetPath: "apps/web/src/actions/index.ts",
                content: "export const server = {};\n",
              },
            ],
          },
          {
            value: "react-hook-form",
            label: "React Hook Form",
            when: (cfg) => cfg.frontend?.framework === "vite-react",
            packages: [
              { name: "react-hook-form", target: "apps/web" },
              { name: "@hookform/resolvers", target: "apps/web" },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "backend",
    slots: [
      {
        key: "framework",
        kind: "select",
        message: "Backend framework",
        options: [
          {
            value: "hono",
            label: "Hono",
            hint: "apps/api with RPC & zod-validator",
            requires: ["shared.workspace:turborepo"],
            expectedWorkspace: "apps/api/package.json",
            templates: [
              {
                targetPath: "apps/api/package.json",
                templatePath: "backend/hono-package.json",
              },
              {
                targetPath: "apps/api/src/index.ts",
                templatePath: "backend/hono-index.ts",
              },
            ],
            packages: [
              { name: "hono", target: "apps/api" },
              { name: "@hono/node-server", target: "apps/api" },
              { name: "@hono/zod-validator", target: "apps/api" },
            ],
            envVars: { PORT: "3001" },
          },
        ],
      },
      {
        key: "sanitizer",
        kind: "select",
        message: "HTML sanitizer",
        when: (cfg) => cfg.backend?.framework !== "none",
        options: [
          {
            value: "sanitize-html",
            label: "sanitize-html",
            requires: ["backend.framework:hono"],
            packages: [
              { name: "sanitize-html", target: "apps/api" },
              { name: "@types/sanitize-html", target: "apps/api", dev: true },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "data",
    slots: [
      {
        key: "database",
        kind: "select",
        message: "Primary database",
        options: [
          {
            value: "postgres",
            label: "PostgreSQL",
            requires: ["shared.workspace:turborepo"],
            expectedWorkspace: "packages/db/package.json",
            templates: [
              {
                targetPath: "packages/db/package.json",
                templatePath: "data/db-package.json",
              },
              {
                targetPath: "packages/db/src/index.ts",
                templatePath: "data/db-index.ts",
              },
            ],
            packages: [
              { name: "pg", target: "packages/db" },
              { name: "@types/pg", target: "packages/db", dev: true },
            ],
            dockerServices: [
              {
                name: "postgres",
                definition: {
                  image: "postgres:17-alpine",
                  restart: "unless-stopped",
                  environment: {
                    POSTGRES_USER: "ktr",
                    POSTGRES_PASSWORD: "ktr",
                    POSTGRES_DB: "ktr",
                  },
                  ports: ["5432:5432"],
                  volumes: ["postgres_data:/var/lib/postgresql/data"],
                },
              },
            ],
            envVars: {
              DATABASE_URL: "postgresql://ktr:ktr@localhost:5432/ktr",
            },
          },
        ],
      },
      {
        key: "kv",
        kind: "select",
        message: "KV store / cache",
        options: [
          {
            value: "valkey",
            label: "Valkey",
            requires: ["shared.workspace:turborepo"],
            expectedWorkspace: "packages/db/package.json",
            templates: [
              {
                targetPath: "packages/db/package.json",
                templatePath: "data/db-package.json",
              },
            ],
            packages: [{ name: "iovalkey", target: "packages/db" }],
            dockerServices: [
              {
                name: "valkey",
                definition: {
                  image: "valkey/valkey:8-alpine",
                  restart: "unless-stopped",
                  ports: ["6379:6379"],
                },
              },
            ],
            envVars: { VALKEY_URL: "redis://localhost:6379" },
          },
        ],
      },
      {
        key: "edge",
        kind: "select",
        message: "Edge SQLite",
        options: [
          {
            value: "turso",
            label: "Turso",
            requires: ["shared.workspace:turborepo"],
            expectedWorkspace: "packages/db/package.json",
            templates: [
              {
                targetPath: "packages/db/package.json",
                templatePath: "data/db-package.json",
              },
            ],
            packages: [{ name: "@libsql/client", target: "packages/db" }],
            envVars: {
              TURSO_DATABASE_URL: "libsql://your-db.turso.io",
              TURSO_AUTH_TOKEN: "",
            },
          },
        ],
      },
      {
        key: "dal",
        kind: "select",
        message: "Data access layer",
        options: [
          {
            value: "kysely",
            label: "Kysely",
            requires: ["data.database:postgres"],
            templates: [
              {
                targetPath: "packages/db/src/kysely.ts",
                templatePath: "data/kysely.ts",
              },
            ],
            packages: [{ name: "kysely", target: "packages/db" }],
          },
        ],
      },
      {
        key: "storage",
        kind: "select",
        message: "Object storage",
        options: [
          {
            value: "r2",
            label: "Cloudflare R2",
            requires: ["shared.workspace:turborepo"],
            expectedWorkspace: "packages/db/package.json",
            templates: [
              {
                targetPath: "packages/db/package.json",
                templatePath: "data/db-package.json",
              },
            ],
            packages: [{ name: "@aws-sdk/client-s3", target: "packages/db" }],
            envVars: {
              R2_ACCOUNT_ID: "",
              R2_ACCESS_KEY_ID: "",
              R2_SECRET_ACCESS_KEY: "",
              R2_BUCKET: "",
            },
          },
        ],
      },
    ],
  },
  {
    name: "identity",
    slots: [
      {
        key: "auth",
        kind: "select",
        message: "Authentication",
        options: [
          {
            value: "better-auth",
            label: "Better Auth",
            requires: [
              "backend.framework:hono",
              "data.database:postgres",
              "data.dal:kysely",
            ],
            expectedWorkspace: "packages/auth/package.json",
            templates: [
              {
                targetPath: "packages/auth/package.json",
                templatePath: "identity/auth-package.json",
              },
              {
                targetPath: "packages/auth/src/index.ts",
                templatePath: "identity/auth-index.ts",
              },
            ],
            packages: [
              { name: "better-auth", target: "packages/auth" },
              { name: "@better-auth/kysely-adapter", target: "packages/auth" },
            ],
            envVars: {
              BETTER_AUTH_SECRET: "replace-with-32-char-secret",
              BETTER_AUTH_URL: "http://localhost:3001",
            },
          },
        ],
      },
      {
        key: "bot_shield",
        kind: "select",
        message: "Bot protection",
        options: [
          {
            value: "turnstile",
            label: "Cloudflare Turnstile",
            requires: ["backend.framework:hono"],
            recommends: ["data.kv:valkey"],
            templates: [
              {
                targetPath: "packages/auth/package.json",
                templatePath: "identity/auth-package.json",
              },
              {
                targetPath: "packages/auth/src/turnstile.ts",
                templatePath: "identity/turnstile.ts",
              },
            ],
            envVars: { TURNSTILE_SECRET_KEY: "" },
          },
        ],
      },
    ],
  },
  {
    name: "commerce",
    slots: [
      {
        key: "mor",
        kind: "select",
        message: "Merchant of Record",
        options: [
          {
            value: "creem",
            label: "Creem",
            requires: [
              "backend.framework:hono",
              "data.database:postgres",
              "data.dal:kysely",
            ],
            recommends: ["data.kv:valkey"],
            expectedWorkspace: "packages/billing/package.json",
            templates: [
              {
                targetPath: "packages/billing/package.json",
                templatePath: "commerce/billing-package.json",
              },
              {
                targetPath: "packages/billing/src/creem.ts",
                templatePath: "commerce/creem-adapter.ts",
              },
            ],
            packages: [{ name: "creem_io", target: "packages/billing" }],
            envVars: { CREEM_API_KEY: "", CREEM_WEBHOOK_SECRET: "" },
          },
          {
            value: "polar",
            label: "Polar",
            requires: [
              "backend.framework:hono",
              "data.database:postgres",
              "data.dal:kysely",
            ],
            recommends: ["data.kv:valkey"],
            expectedWorkspace: "packages/billing/package.json",
            templates: [
              {
                targetPath: "packages/billing/package.json",
                templatePath: "commerce/billing-package.json",
              },
              {
                targetPath: "packages/billing/src/polar.ts",
                templatePath: "commerce/polar-adapter.ts",
              },
            ],
            packages: [{ name: "@polar-sh/sdk", target: "packages/billing" }],
            envVars: { POLAR_ACCESS_TOKEN: "", POLAR_WEBHOOK_SECRET: "" },
          },
        ],
      },
      {
        key: "billing_di",
        kind: "boolean",
        message: "Include BillingProvider DI interface?",
        defaultValue: true,
        when: (cfg) => cfg.commerce?.mor !== "none",
        options: [
          {
            value: "true",
            label: "BillingProvider DI",
            templates: [
              {
                targetPath: "packages/billing/src/provider.ts",
                templatePath: "commerce/provider.ts",
              },
            ],
          },
        ],
      },
      {
        key: "entitlements",
        kind: "boolean",
        message: "Include entitlements module?",
        defaultValue: true,
        when: (cfg) => cfg.commerce?.mor !== "none",
        options: [
          {
            value: "true",
            label: "Entitlements",
            requires: ["data.database:postgres", "data.dal:kysely"],
            recommends: ["data.kv:valkey"],
            templates: [
              {
                targetPath: "packages/billing/src/entitlements.ts",
                templatePath: "commerce/entitlements.ts",
              },
            ],
          },
        ],
      },
      {
        key: "webhooks",
        kind: "boolean",
        message: "Include webhook deduplication routes?",
        defaultValue: true,
        when: (cfg) => cfg.commerce?.mor !== "none",
        options: [
          {
            value: "true",
            label: "Billing Webhooks",
            requires: ["backend.framework:hono", "data.database:postgres"],
            templates: [
              {
                targetPath: "packages/billing/src/webhooks.ts",
                templatePath: "commerce/webhooks.ts",
              },
            ],
          },
        ],
      },
      {
        key: "usage_ledger",
        kind: "boolean",
        message: "Include usage ledger (Valkey + PG)?",
        defaultValue: false,
        when: (cfg) => cfg.commerce?.mor !== "none",
        options: [
          {
            value: "true",
            label: "Usage Ledger",
            requires: ["data.database:postgres", "data.kv:valkey"],
            templates: [
              {
                targetPath: "packages/billing/src/usage-ledger.ts",
                templatePath: "commerce/usage-ledger.ts",
              },
            ],
          },
        ],
      },
    ],
  },
  {
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
  },
  {
    name: "infra",
    slots: [
      {
        key: "edge_network",
        kind: "select",
        message: "Edge network",
        options: [{ value: "cloudflare", label: "Cloudflare" }],
      },
      {
        key: "containers",
        kind: "select",
        message: "Containers",
        options: [
          {
            value: "docker-compose",
            label: "Docker Compose + Dockerfile",
            templates: [
              {
                targetPath: "infra/docker/Dockerfile",
                templatePath: "infra/Dockerfile",
              },
            ],
            files: [{ targetPath: "compose.yml", content: "services: {}\n" }],
          },
        ],
      },
      {
        key: "hosting",
        kind: "select",
        message: "Hosting target",
        options: [
          { value: "hetzner", label: "Hetzner" },
          { value: "railway", label: "Railway" },
          { value: "fly", label: "Fly.io" },
        ],
      },
      {
        key: "deploy",
        kind: "select",
        message: "Deploy tool",
        options: [
          {
            value: "kamal2",
            label: "Kamal 2",
            requires: ["infra.containers:docker-compose"],
            templates: [
              {
                targetPath: "infra/kamal/deploy.yml",
                templatePath: "infra/kamal-deploy.yml",
                interpolateProjectName: true,
              },
            ],
          },
          {
            value: "coolify",
            label: "Coolify",
            requires: ["infra.containers:docker-compose"],
          },
          {
            value: "dokploy",
            label: "Dokploy",
            requires: ["infra.containers:docker-compose"],
          },
        ],
      },
      {
        key: "ci",
        kind: "select",
        message: "CI pipeline",
        options: [
          {
            value: "github-actions",
            label: "GitHub Actions",
            templates: [
              {
                targetPath: ".github/workflows/ci.yml",
                templatePath: "infra/github-ci.yml",
              },
            ],
          },
        ],
      },
      {
        key: "secrets",
        kind: "select",
        message: "Secrets manager",
        options: [
          {
            value: "infisical",
            label: "Infisical",
            envVars: { INFISICAL_PROJECT_ID: "" },
          },
          {
            value: "doppler",
            label: "Doppler",
            envVars: { DOPPLER_TOKEN: "" },
          },
        ],
      },
      {
        key: "backups",
        kind: "select",
        message: "Database backups",
        options: [
          {
            value: "pg-dump-rclone-r2",
            label: "pg_dump + rclone -> R2",
            requires: ["data.database:postgres", "data.storage:r2"],
            templates: [
              {
                targetPath: "infra/backups/backup.sh",
                templatePath: "infra/backup.sh",
              },
            ],
          },
        ],
      },
    ],
  },
] as const;
