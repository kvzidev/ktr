import type { CatalogLayer } from "../types.js";

export const backendLayer: CatalogLayer = {
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
};
