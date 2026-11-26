import type { ModuleDefinition } from "../types.js";

export const backendModules: ModuleDefinition[] = [
  {
    id: "backend.framework:hono",
    layer: "backend",
    key: "framework",
    value: "hono",
    label: "Hono",
    hint: "apps/api with Hono, zod-validator, hc RPC, and node-server",
    requires: ["shared.workspace:turborepo"],
    async apply(ctx) {
      await ctx.writeTemplateIfMissing(
        "apps/api/package.json",
        "backend/hono-package.json",
      );
      await ctx.writeTemplateIfMissing(
        "apps/api/src/index.ts",
        "backend/hono-index.ts",
      );
      await ctx.appendEnvExample({
        PORT: "3001",
      });
    },
  },
  {
    id: "backend.sanitizer:sanitize-html",
    layer: "backend",
    key: "sanitizer",
    value: "sanitize-html",
    label: "sanitize-html",
    hint: "HTML input sanitization in apps/api",
    requires: ["backend.framework:hono"],
    async apply(ctx) {
      await ctx.mergePackageJson("apps/api/package.json", {
        dependencies: {
          "sanitize-html": "^2.14.0",
        },
        devDependencies: {
          "@types/sanitize-html": "^2.13.0",
        },
      });
    },
  },
];
