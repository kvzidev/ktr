import type { CatalogLayer } from "../types.js";

export const identityLayer: CatalogLayer = {
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
};
