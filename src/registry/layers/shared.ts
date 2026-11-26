import type { CatalogLayer } from "../types.js";

export const sharedLayer: CatalogLayer = {
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
          packages: [{ name: "zod", version: "^4", target: "packages/shared" }],
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
};
