import type { ModuleDefinition } from "../types.js";

export const frontendModules: ModuleDefinition[] = [
  {
    id: "frontend.framework:astro",
    layer: "frontend",
    key: "framework",
    value: "astro",
    label: "Astro",
    hint: "apps/web with Astro SSR/static",
    requires: ["shared.workspace:turborepo"],
    async apply(ctx, cfg) {
      await ctx.writeTemplateIfMissing(
        "apps/web/package.json",
        "frontend/astro-package.json",
        {
          projectName: cfg.meta.project_name,
        },
      );
      await ctx.writeTemplateIfMissing(
        "apps/web/astro.config.mjs",
        "frontend/astro.config.mjs",
      );
      await ctx.writeTemplateIfMissing(
        "apps/web/src/pages/index.astro",
        "frontend/index.astro",
        {
          projectName: cfg.meta.project_name,
        },
      );
    },
  },
  {
    id: "frontend.framework:vite-react",
    layer: "frontend",
    key: "framework",
    value: "vite-react",
    label: "Vite + React",
    hint: "apps/web with Vite and React",
    requires: ["shared.workspace:turborepo"],
    async apply(ctx, cfg) {
      await ctx.writeTemplateIfMissing(
        "apps/web/package.json",
        "frontend/vite-react-package.json",
        {
          projectName: cfg.meta.project_name,
        },
      );
      await ctx.writeTemplateIfMissing(
        "apps/web/index.html",
        "frontend/vite-index.html",
        {
          projectName: cfg.meta.project_name,
        },
      );
      await ctx.writeTemplateIfMissing(
        "apps/web/src/main.tsx",
        "frontend/vite-main.tsx",
      );
      await ctx.writeTemplateIfMissing(
        "apps/web/src/App.tsx",
        "frontend/vite-app.tsx",
        {
          projectName: cfg.meta.project_name,
        },
      );
    },
  },
  {
    id: "frontend.css:tailwind",
    layer: "frontend",
    key: "css",
    value: "tailwind",
    label: "Tailwind CSS",
    hint: "Utility-first styling in apps/web",
    when: (cfg) => cfg.frontend.framework !== "none",
    async apply(ctx) {
      await ctx.mergePackageJson("apps/web/package.json", {
        dependencies: {
          tailwindcss: "^4.0.0",
        },
      });
      await ctx.writeIfMissing(
        "apps/web/src/styles/global.css",
        '@import "tailwindcss";\n',
      );
    },
  },
  {
    id: "frontend.state:nanostores",
    layer: "frontend",
    key: "state",
    value: "nanostores",
    label: "Nano Stores",
    hint: "Lightweight atomic state (adds @nanostores/react for vite-react)",
    when: (cfg) => cfg.frontend.framework !== "none",
    async apply(ctx, cfg) {
      const deps: Record<string, string> = {
        nanostores: "^1.0.0",
      };
      if (cfg.frontend.framework === "vite-react") {
        deps["@nanostores/react"] = "^1.0.0";
      }
      await ctx.mergePackageJson("apps/web/package.json", {
        dependencies: deps,
      });
      await ctx.writeIfMissing(
        "apps/web/src/stores/app.ts",
        'import { atom } from "nanostores";\n\nexport const $counter = atom(0);\n',
      );
    },
  },
  {
    id: "frontend.data_fetching:tanstack-query",
    layer: "frontend",
    key: "data_fetching",
    value: "tanstack-query",
    label: "TanStack Query",
    hint: "Async server-state caching",
    when: (cfg) => cfg.frontend.framework !== "none",
    async apply(ctx) {
      await ctx.mergePackageJson("apps/web/package.json", {
        dependencies: {
          "@tanstack/react-query": "^5.70.0",
        },
      });
    },
  },
  {
    id: "frontend.forms:astro-actions",
    layer: "frontend",
    key: "forms",
    value: "astro-actions",
    label: "Astro Actions",
    hint: "Built-in Astro form actions",
    when: (cfg) => cfg.frontend.framework === "astro",
    async apply(ctx) {
      await ctx.writeIfMissing(
        "apps/web/src/actions/index.ts",
        "export const server = {};\n",
      );
    },
  },
  {
    id: "frontend.forms:react-hook-form",
    layer: "frontend",
    key: "forms",
    value: "react-hook-form",
    label: "React Hook Form",
    hint: "Form state with @hookform/resolvers",
    when: (cfg) => cfg.frontend.framework === "vite-react",
    async apply(ctx) {
      await ctx.mergePackageJson("apps/web/package.json", {
        dependencies: {
          "react-hook-form": "^7.55.0",
          "@hookform/resolvers": "^5.0.0",
        },
      });
    },
  },
];
