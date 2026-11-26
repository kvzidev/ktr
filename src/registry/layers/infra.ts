import type { ModuleDefinition } from "../types.js";

export const infraModules: ModuleDefinition[] = [
  {
    id: "infra.edge_network:cloudflare",
    layer: "infra",
    key: "edge_network",
    value: "cloudflare",
    label: "Cloudflare",
    hint: "Edge DNS, WAF, and SSL conventions",
    async apply() {},
  },
  {
    id: "infra.containers:docker-compose",
    layer: "infra",
    key: "containers",
    value: "docker-compose",
    label: "Docker Compose",
    hint: "Root compose.yml + multi-stage Dockerfile",
    async apply(ctx) {
      await ctx.writeTemplateIfMissing(
        "infra/docker/Dockerfile",
        "infra/Dockerfile",
      );
      await ctx.writeIfMissing("compose.yml", "services: {}\n");
    },
  },
  {
    id: "infra.hosting:hetzner",
    layer: "infra",
    key: "hosting",
    value: "hetzner",
    label: "Hetzner",
    hint: "Hetzner Cloud VPS target",
    async apply() {},
  },
  {
    id: "infra.hosting:railway",
    layer: "infra",
    key: "hosting",
    value: "railway",
    label: "Railway",
    hint: "Railway deployment target",
    async apply() {},
  },
  {
    id: "infra.hosting:fly",
    layer: "infra",
    key: "hosting",
    value: "fly",
    label: "Fly.io",
    hint: "Fly.io deployment target",
    async apply() {},
  },
  {
    id: "infra.deploy:kamal2",
    layer: "infra",
    key: "deploy",
    value: "kamal2",
    label: "Kamal 2",
    hint: "infra/kamal/deploy.yml zero-downtime config",
    requires: ["infra.containers:docker-compose"],
    async apply(ctx, cfg) {
      await ctx.writeTemplateIfMissing(
        "infra/kamal/deploy.yml",
        "infra/kamal-deploy.yml",
        {
          projectName: cfg.meta.project_name,
        },
      );
    },
  },
  {
    id: "infra.deploy:coolify",
    layer: "infra",
    key: "deploy",
    value: "coolify",
    label: "Coolify",
    hint: "Coolify-compatible Dockerfile & compose",
    requires: ["infra.containers:docker-compose"],
    async apply() {},
  },
  {
    id: "infra.deploy:dokploy",
    layer: "infra",
    key: "deploy",
    value: "dokploy",
    label: "Dokploy",
    hint: "Dokploy-compatible Dockerfile & compose",
    requires: ["infra.containers:docker-compose"],
    async apply() {},
  },
  {
    id: "infra.ci:github-actions",
    layer: "infra",
    key: "ci",
    value: "github-actions",
    label: "GitHub Actions",
    hint: ".github/workflows/ci.yml for pnpm + turbo",
    async apply(ctx) {
      await ctx.writeTemplateIfMissing(
        ".github/workflows/ci.yml",
        "infra/github-ci.yml",
      );
    },
  },
  {
    id: "infra.secrets:infisical",
    layer: "infra",
    key: "secrets",
    value: "infisical",
    label: "Infisical",
    hint: "Infisical secrets sync env contract",
    async apply(ctx) {
      await ctx.appendEnvExample({
        INFISICAL_PROJECT_ID: "",
      });
    },
  },
  {
    id: "infra.secrets:doppler",
    layer: "infra",
    key: "secrets",
    value: "doppler",
    label: "Doppler",
    hint: "Doppler secrets sync env contract",
    async apply(ctx) {
      await ctx.appendEnvExample({
        DOPPLER_TOKEN: "",
      });
    },
  },
  {
    id: "infra.backups:pg-dump-rclone-r2",
    layer: "infra",
    key: "backups",
    value: "pg-dump-rclone-r2",
    label: "pg_dump + rclone -> R2",
    hint: "Automated PostgreSQL backup script to Cloudflare R2",
    requires: ["data.database:postgres", "data.storage:r2"],
    async apply(ctx) {
      await ctx.writeTemplateIfMissing(
        "infra/backups/backup.sh",
        "infra/backup.sh",
      );
    },
  },
];
