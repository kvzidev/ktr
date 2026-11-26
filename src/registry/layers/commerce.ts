import type { ModuleDefinition } from "../types.js";

export const commerceModules: ModuleDefinition[] = [
  {
    id: "commerce.mor:creem",
    layer: "commerce",
    key: "mor",
    value: "creem",
    label: "Creem",
    hint: "Creem Merchant-of-Record SDK (creem_io)",
    requires: [
      "backend.framework:hono",
      "data.database:postgres",
      "data.dal:kysely",
    ],
    recommends: ["data.kv:valkey"],
    async apply(ctx) {
      await ctx.writeTemplateIfMissing(
        "packages/billing/package.json",
        "commerce/billing-package.json",
      );
      await ctx.writeTemplateIfMissing(
        "packages/billing/src/creem.ts",
        "commerce/creem-adapter.ts",
      );
      await ctx.mergePackageJson("packages/billing/package.json", {
        dependencies: {
          creem_io: "^0.1.0",
        },
      });
      await ctx.appendEnvExample({
        CREEM_API_KEY: "",
        CREEM_WEBHOOK_SECRET: "",
      });
    },
  },
  {
    id: "commerce.mor:polar",
    layer: "commerce",
    key: "mor",
    value: "polar",
    label: "Polar",
    hint: "Polar Merchant-of-Record SDK (@polar-sh/sdk)",
    requires: [
      "backend.framework:hono",
      "data.database:postgres",
      "data.dal:kysely",
    ],
    recommends: ["data.kv:valkey"],
    async apply(ctx) {
      await ctx.writeTemplateIfMissing(
        "packages/billing/package.json",
        "commerce/billing-package.json",
      );
      await ctx.writeTemplateIfMissing(
        "packages/billing/src/polar.ts",
        "commerce/polar-adapter.ts",
      );
      await ctx.mergePackageJson("packages/billing/package.json", {
        dependencies: {
          "@polar-sh/sdk": "^0.32.0",
        },
      });
      await ctx.appendEnvExample({
        POLAR_ACCESS_TOKEN: "",
        POLAR_WEBHOOK_SECRET: "",
      });
    },
  },
  {
    id: "commerce.billing_di:true",
    layer: "commerce",
    key: "billing_di",
    value: "true",
    label: "BillingProvider DI",
    hint: "Provider-agnostic BillingProvider interface",
    when: (cfg) => cfg.commerce.mor !== "none",
    async apply(ctx) {
      await ctx.writeTemplateIfMissing(
        "packages/billing/src/provider.ts",
        "commerce/provider.ts",
      );
    },
  },
  {
    id: "commerce.entitlements:true",
    layer: "commerce",
    key: "entitlements",
    value: "true",
    label: "Entitlements",
    hint: "Kysely PG tables + optional Valkey cache",
    requires: ["data.database:postgres", "data.dal:kysely"],
    recommends: ["data.kv:valkey"],
    when: (cfg) => cfg.commerce.mor !== "none",
    async apply(ctx) {
      await ctx.writeTemplateIfMissing(
        "packages/billing/src/entitlements.ts",
        "commerce/entitlements.ts",
      );
    },
  },
  {
    id: "commerce.webhooks:true",
    layer: "commerce",
    key: "webhooks",
    value: "true",
    label: "Billing Webhooks",
    hint: "/webhooks & /billing Hono routes with deduplication",
    requires: ["backend.framework:hono", "data.database:postgres"],
    when: (cfg) => cfg.commerce.mor !== "none",
    async apply(ctx) {
      await ctx.writeTemplateIfMissing(
        "packages/billing/src/webhooks.ts",
        "commerce/webhooks.ts",
      );
    },
  },
  {
    id: "commerce.usage_ledger:true",
    layer: "commerce",
    key: "usage_ledger",
    value: "true",
    label: "Usage Ledger",
    hint: "Valkey atomic counter + PG ledger",
    requires: ["data.database:postgres", "data.kv:valkey"],
    when: (cfg) => cfg.commerce.mor !== "none",
    async apply(ctx) {
      await ctx.writeTemplateIfMissing(
        "packages/billing/src/usage-ledger.ts",
        "commerce/usage-ledger.ts",
      );
    },
  },
];
