import type { ModuleDefinition } from "../types.js";

export const dataModules: ModuleDefinition[] = [
  {
    id: "data.database:postgres",
    layer: "data",
    key: "database",
    value: "postgres",
    label: "PostgreSQL",
    hint: "Primary relational database + compose.yml service",
    requires: ["shared.workspace:turborepo"],
    async apply(ctx) {
      await ctx.writeTemplateIfMissing(
        "packages/db/package.json",
        "data/db-package.json",
      );
      await ctx.writeTemplateIfMissing(
        "packages/db/src/index.ts",
        "data/db-index.ts",
      );
      await ctx.mergePackageJson("packages/db/package.json", {
        dependencies: {
          pg: "^8.14.0",
        },
        devDependencies: {
          "@types/pg": "^8.11.0",
        },
      });
      await ctx.mergeDockerService("postgres", {
        image: "postgres:17-alpine",
        restart: "unless-stopped",
        environment: {
          POSTGRES_USER: "ktr",
          POSTGRES_PASSWORD: "ktr",
          POSTGRES_DB: "ktr",
        },
        ports: ["5432:5432"],
        volumes: ["postgres_data:/var/lib/postgresql/data"],
      });
      await ctx.appendEnvExample({
        DATABASE_URL: "postgresql://ktr:ktr@localhost:5432/ktr",
      });
    },
  },
  {
    id: "data.kv:valkey",
    layer: "data",
    key: "kv",
    value: "valkey",
    label: "Valkey",
    hint: "In-memory KV cache and counters + compose.yml service",
    requires: ["shared.workspace:turborepo"],
    async apply(ctx) {
      await ctx.writeTemplateIfMissing(
        "packages/db/package.json",
        "data/db-package.json",
      );
      await ctx.mergePackageJson("packages/db/package.json", {
        dependencies: {
          iovalkey: "^0.3.3",
        },
      });
      await ctx.mergeDockerService("valkey", {
        image: "valkey/valkey:8-alpine",
        restart: "unless-stopped",
        ports: ["6379:6379"],
      });
      await ctx.appendEnvExample({
        VALKEY_URL: "redis://localhost:6379",
      });
    },
  },
  {
    id: "data.edge:turso",
    layer: "data",
    key: "edge",
    value: "turso",
    label: "Turso (libSQL)",
    hint: "Edge SQLite client",
    requires: ["shared.workspace:turborepo"],
    async apply(ctx) {
      await ctx.writeTemplateIfMissing(
        "packages/db/package.json",
        "data/db-package.json",
      );
      await ctx.mergePackageJson("packages/db/package.json", {
        dependencies: {
          "@libsql/client": "^0.14.0",
        },
      });
      await ctx.appendEnvExample({
        TURSO_DATABASE_URL: "libsql://your-db.turso.io",
        TURSO_AUTH_TOKEN: "",
      });
    },
  },
  {
    id: "data.dal:kysely",
    layer: "data",
    key: "dal",
    value: "kysely",
    label: "Kysely",
    hint: "Type-safe SQL query builder",
    requires: ["data.database:postgres"],
    async apply(ctx) {
      await ctx.mergePackageJson("packages/db/package.json", {
        dependencies: {
          kysely: "^0.27.6",
        },
      });
      await ctx.writeTemplateIfMissing(
        "packages/db/src/kysely.ts",
        "data/kysely.ts",
      );
    },
  },
  {
    id: "data.storage:r2",
    layer: "data",
    key: "storage",
    value: "r2",
    label: "Cloudflare R2",
    hint: "S3-compatible object storage client",
    requires: ["shared.workspace:turborepo"],
    async apply(ctx) {
      await ctx.writeTemplateIfMissing(
        "packages/db/package.json",
        "data/db-package.json",
      );
      await ctx.mergePackageJson("packages/db/package.json", {
        dependencies: {
          "@aws-sdk/client-s3": "^3.750.0",
        },
      });
      await ctx.appendEnvExample({
        R2_ACCOUNT_ID: "",
        R2_ACCESS_KEY_ID: "",
        R2_SECRET_ACCESS_KEY: "",
        R2_BUCKET: "",
      });
    },
  },
];
