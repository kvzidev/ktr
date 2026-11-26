import type { CatalogLayer } from "../types.js";

export const frontendLayer: CatalogLayer = {
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
              "--no-interactive",
              "--no-immediate",
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
};
