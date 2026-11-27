import type { CatalogLayer } from "../types.js";

export const infraLayer: CatalogLayer = {
  name: "infra",
  slots: [
    {
      key: "edge_network",
      kind: "select",
      message: "Edge network",
      options: [{ value: "cloudflare", label: "Cloudflare" }],
    },
    {
      key: "containers",
      kind: "select",
      message: "Containers",
      options: [
        {
          value: "docker-compose",
          label: "Docker Compose + Dockerfile",
          templates: [
            {
              targetPath: "infra/docker/Dockerfile",
              templatePath: "infra/Dockerfile",
            },
          ],
          files: [{ targetPath: "compose.yml", content: "services: {}\n" }],
        },
      ],
    },
    {
      key: "hosting",
      kind: "select",
      message: "Hosting target",
      options: [
        { value: "vps", label: "Generic VPS" },
        { value: "hetzner", label: "Hetzner" },
        { value: "railway", label: "Railway" },
        { value: "fly", label: "Fly.io" },
      ],
    },
    {
      key: "deploy",
      kind: "select",
      message: "Deploy tool",
      options: [
        {
          value: "kamal2",
          label: "Kamal 2",
          requires: ["infra.containers:docker-compose"],
          templates: [
            {
              targetPath: "infra/kamal/deploy.yml",
              templatePath: "infra/kamal-deploy.yml",
              interpolateProjectName: true,
            },
          ],
        },
        {
          value: "coolify",
          label: "Coolify",
          requires: ["infra.containers:docker-compose"],
        },
        {
          value: "dokploy",
          label: "Dokploy",
          requires: ["infra.containers:docker-compose"],
        },
      ],
    },
    {
      key: "ci",
      kind: "select",
      message: "CI pipeline",
      options: [
        {
          value: "github-actions",
          label: "GitHub Actions",
          templates: [
            {
              targetPath: ".github/workflows/ci.yml",
              templatePath: "infra/github-ci.yml",
            },
          ],
        },
      ],
    },
    {
      key: "secrets",
      kind: "select",
      message: "Secrets manager",
      options: [
        {
          value: "infisical",
          label: "Infisical",
          envVars: { INFISICAL_PROJECT_ID: "" },
        },
        {
          value: "doppler",
          label: "Doppler",
          envVars: { DOPPLER_TOKEN: "" },
        },
      ],
    },
    {
      key: "backups",
      kind: "select",
      message: "Database backups",
      options: [
        {
          value: "pg-dump-rclone-r2",
          label: "pg_dump + rclone -> R2",
          requires: ["data.database:postgres", "data.storage:r2"],
          templates: [
            {
              targetPath: "infra/backups/backup.sh",
              templatePath: "infra/backup.sh",
            },
          ],
        },
      ],
    },
  ],
};
