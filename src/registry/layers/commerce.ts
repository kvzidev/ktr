import type { CatalogLayer } from "../types.js";

export const commerceLayer: CatalogLayer = {
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
};
