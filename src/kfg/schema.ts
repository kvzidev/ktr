import { z } from "zod";
import {
  isKfgDate,
  KFG_DATE_PATTERN,
  KFG_VERSION_PATTERN,
  type KfgDoc,
  parseKfg,
  stringifyKfg,
} from "./parser.js";

const versionSchema = z
  .string()
  .regex(
    KFG_VERSION_PATTERN,
    "Expected version with 3 or 4 dot-separated numbers",
  );

const dateSchema = z
  .string()
  .regex(KFG_DATE_PATTERN, "Expected date in YYYY-MM-DD format")
  .refine(isKfgDate, "Expected valid calendar date");

const testingItemSchema = z.enum(["vitest", "playwright"]);

const testingSchema = z
  .union([
    z
      .literal("none")
      .transform(() => [] as z.infer<typeof testingItemSchema>[]),
    z.array(testingItemSchema),
  ])
  .default([]);

export const kfgSchema = z.object({
  meta: z.object({
    schema_version: z.number().int().positive().default(1),
    cli_version: versionSchema.default("0.0.1"),
    project_name: z.string().min(1),
    package_manager: z.literal("pnpm").default("pnpm"),
    created_at: dateSchema.optional(),
  }),
  shared: z
    .object({
      workspace: z.enum(["turborepo", "none"]).default("none"),
      validation: z.enum(["zod", "none"]).default("none"),
      quality: z.enum(["biome", "none"]).default("none"),
      testing: testingSchema,
    })
    .default({
      workspace: "none",
      validation: "none",
      quality: "none",
      testing: [],
    }),
  frontend: z
    .object({
      framework: z.enum(["astro", "vite-react", "none"]).default("none"),
      css: z.enum(["tailwind", "none"]).default("none"),
      state: z.enum(["nanostores", "none"]).default("none"),
      data_fetching: z.enum(["tanstack-query", "none"]).default("none"),
      forms: z
        .enum(["astro-actions", "react-hook-form", "none"])
        .default("none"),
    })
    .default({
      framework: "none",
      css: "none",
      state: "none",
      data_fetching: "none",
      forms: "none",
    }),
  backend: z
    .object({
      framework: z.enum(["hono", "none"]).default("none"),
      sanitizer: z.enum(["sanitize-html", "none"]).default("none"),
    })
    .default({
      framework: "none",
      sanitizer: "none",
    }),
  data: z
    .object({
      database: z.enum(["postgres", "none"]).default("none"),
      kv: z.enum(["valkey", "none"]).default("none"),
      edge: z.enum(["turso", "none"]).default("none"),
      dal: z.enum(["kysely", "none"]).default("none"),
      storage: z.enum(["r2", "none"]).default("none"),
    })
    .default({
      database: "none",
      kv: "none",
      edge: "none",
      dal: "none",
      storage: "none",
    }),
  identity: z
    .object({
      auth: z.enum(["better-auth", "none"]).default("none"),
      bot_shield: z.enum(["turnstile", "none"]).default("none"),
    })
    .default({
      auth: "none",
      bot_shield: "none",
    }),
  commerce: z
    .object({
      mor: z.enum(["creem", "polar", "none"]).default("none"),
      billing_di: z.boolean().default(false),
      entitlements: z.boolean().default(false),
      webhooks: z.boolean().default(false),
      usage_ledger: z.boolean().default(false),
    })
    .default({
      mor: "none",
      billing_di: false,
      entitlements: false,
      webhooks: false,
      usage_ledger: false,
    }),
  ops: z
    .object({
      queue: z.enum(["bullmq", "pg-boss", "none"]).default("none"),
      email: z.enum(["postmark", "resend", "none"]).default("none"),
      logging: z.enum(["pino", "none"]).default("none"),
      errors: z.enum(["sentry", "glitchtip", "none"]).default("none"),
      uptime: z.enum(["betterstack", "uptime-kuma", "none"]).default("none"),
    })
    .default({
      queue: "none",
      email: "none",
      logging: "none",
      errors: "none",
      uptime: "none",
    }),
  infra: z
    .object({
      edge_network: z.enum(["cloudflare", "none"]).default("none"),
      containers: z.enum(["docker-compose", "none"]).default("none"),
      hosting: z.enum(["hetzner", "railway", "fly", "none"]).default("none"),
      deploy: z.enum(["kamal2", "coolify", "dokploy", "none"]).default("none"),
      ci: z.enum(["github-actions", "none"]).default("none"),
      secrets: z.enum(["infisical", "doppler", "none"]).default("none"),
      backups: z.enum(["pg-dump-rclone-r2", "none"]).default("none"),
    })
    .default({
      edge_network: "none",
      containers: "none",
      hosting: "none",
      deploy: "none",
      ci: "none",
      secrets: "none",
      backups: "none",
    }),
});

export type KfgConfig = z.infer<typeof kfgSchema>;
export type LayerName = Exclude<keyof KfgConfig, "meta">;

export const LAYER_NAMES: readonly LayerName[] = [
  "shared",
  "frontend",
  "backend",
  "data",
  "identity",
  "commerce",
  "ops",
  "infra",
] as const;

export function createDefaultKfg(
  projectName: string,
  cliVersion = "0.0.1",
): KfgConfig {
  return kfgSchema.parse({
    meta: {
      schema_version: 1,
      cli_version: cliVersion,
      project_name: projectName,
      package_manager: "pnpm",
    },
  });
}

export function parseAndValidateKfg(input: string): KfgConfig {
  const doc = parseKfg(input);
  return kfgSchema.parse(doc);
}

export function serializeKfg(config: KfgConfig): string {
  return stringifyKfg(config as unknown as KfgDoc);
}
