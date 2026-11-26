import type { ModuleDefinition } from "../types.js";

export const sharedModules: ModuleDefinition[] = [
  {
    id: "shared.workspace:turborepo",
    layer: "shared",
    key: "workspace",
    value: "turborepo",
    label: "Turborepo",
    hint: "pnpm workspaces + turbo.json task pipeline",
    async apply(ctx, cfg) {
      await ctx.writeTemplateIfMissing(
        "pnpm-workspace.yaml",
        "shared/pnpm-workspace.yaml",
      );
      await ctx.writeTemplateIfMissing("turbo.json", "shared/turbo.json");
      await ctx.writeTemplateIfMissing(
        "package.json",
        "shared/root-package.json",
        {
          projectName: cfg.meta.project_name,
        },
      );
      await ctx.mergePackageJson("package.json", {
        devDependencies: {
          turbo: "^2.5.0",
        },
      });
    },
  },
  {
    id: "shared.validation:zod",
    layer: "shared",
    key: "validation",
    value: "zod",
    label: "Zod",
    hint: "packages/shared with Zod DTOs and schemas",
    async apply(ctx) {
      await ctx.writeTemplateIfMissing(
        "packages/shared/package.json",
        "shared/shared-package.json",
      );
      await ctx.writeTemplateIfMissing(
        "packages/shared/src/index.ts",
        "shared/shared-index.ts",
      );
      await ctx.mergePackageJson("packages/shared/package.json", {
        dependencies: {
          zod: "^4.0.0",
        },
      });
    },
  },
  {
    id: "shared.quality:biome",
    layer: "shared",
    key: "quality",
    value: "biome",
    label: "Biome",
    hint: "Root formatter and linter",
    async apply(ctx) {
      await ctx.writeTemplateIfMissing("biome.json", "shared/biome.json");
      await ctx.mergePackageJson("package.json", {
        scripts: {
          check: "biome check --write .",
        },
        devDependencies: {
          "@biomejs/biome": "^2.0.0",
        },
      });
    },
  },
  {
    id: "shared.testing:vitest",
    layer: "shared",
    key: "testing",
    value: "vitest",
    label: "Vitest",
    hint: "Unit and integration testing",
    async apply(ctx) {
      await ctx.mergePackageJson("package.json", {
        scripts: {
          test: "turbo run test",
        },
        devDependencies: {
          vitest: "^3.0.0",
        },
      });
    },
  },
  {
    id: "shared.testing:playwright",
    layer: "shared",
    key: "testing",
    value: "playwright",
    label: "Playwright",
    hint: "End-to-end browser testing",
    async apply(ctx) {
      await ctx.mergePackageJson("package.json", {
        scripts: {
          "test:e2e": "playwright test",
        },
        devDependencies: {
          "@playwright/test": "^1.50.0",
        },
      });
    },
  },
];
