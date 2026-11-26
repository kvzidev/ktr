import type { CatalogLayer } from "../types.js";

export const dataLayer: CatalogLayer = {
  name: "data",
  slots: [
    {
      key: "database",
      kind: "select",
      message: "Primary database",
      options: [
        {
          value: "postgres",
          label: "PostgreSQL",
          requires: ["shared.workspace:turborepo"],
          expectedWorkspace: "packages/db/package.json",
          templates: [
            {
              targetPath: "packages/db/package.json",
              templatePath: "data/db-package.json",
            },
            {
              targetPath: "packages/db/src/index.ts",
              templatePath: "data/db-index.ts",
            },
          ],
          packages: [
            { name: "pg", target: "packages/db" },
            { name: "@types/pg", target: "packages/db", dev: true },
          ],
          dockerServices: [
            {
              name: "postgres",
              definition: {
                image: "postgres:17-alpine",
                restart: "unless-stopped",
                environment: {
                  POSTGRES_USER: "ktr",
                  POSTGRES_PASSWORD: "ktr",
                  POSTGRES_DB: "ktr",
                },
                ports: ["5432:5432"],
                volumes: ["postgres_data:/var/lib/postgresql/data"],
              },
            },
          ],
          envVars: { DATABASE_URL: "postgresql://ktr:ktr@localhost:5432/ktr" },
        },
      ],
    },
    {
      key: "kv",
      kind: "select",
      message: "KV store / cache",
      options: [
        {
          value: "valkey",
          label: "Valkey",
          requires: ["shared.workspace:turborepo"],
          expectedWorkspace: "packages/db/package.json",
          templates: [
            {
              targetPath: "packages/db/package.json",
              templatePath: "data/db-package.json",
            },
          ],
          packages: [{ name: "iovalkey", target: "packages/db" }],
          dockerServices: [
            {
              name: "valkey",
              definition: {
                image: "valkey/valkey:8-alpine",
                restart: "unless-stopped",
                ports: ["6379:6379"],
              },
            },
          ],
          envVars: { VALKEY_URL: "redis://localhost:6379" },
        },
      ],
    },
    {
      key: "edge",
      kind: "select",
      message: "Edge SQLite",
      options: [
        {
          value: "turso",
          label: "Turso",
          requires: ["shared.workspace:turborepo"],
          expectedWorkspace: "packages/db/package.json",
          templates: [
            {
              targetPath: "packages/db/package.json",
              templatePath: "data/db-package.json",
            },
          ],
          packages: [{ name: "@libsql/client", target: "packages/db" }],
          envVars: {
            TURSO_DATABASE_URL: "libsql://your-db.turso.io",
            TURSO_AUTH_TOKEN: "",
          },
        },
      ],
    },
    {
      key: "dal",
      kind: "select",
      message: "Data access layer",
      options: [
        {
          value: "kysely",
          label: "Kysely",
          requires: ["data.database:postgres"],
          templates: [
            {
              targetPath: "packages/db/src/kysely.ts",
              templatePath: "data/kysely.ts",
            },
          ],
          packages: [{ name: "kysely", target: "packages/db" }],
        },
      ],
    },
    {
      key: "storage",
      kind: "select",
      message: "Object storage",
      options: [
        {
          value: "r2",
          label: "Cloudflare R2",
          requires: ["shared.workspace:turborepo"],
          expectedWorkspace: "packages/db/package.json",
          templates: [
            {
              targetPath: "packages/db/package.json",
              templatePath: "data/db-package.json",
            },
          ],
          packages: [{ name: "@aws-sdk/client-s3", target: "packages/db" }],
          envVars: {
            R2_ACCOUNT_ID: "",
            R2_ACCESS_KEY_ID: "",
            R2_SECRET_ACCESS_KEY: "",
            R2_BUCKET: "",
          },
        },
      ],
    },
  ],
};
