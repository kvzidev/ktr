import * as p from "@clack/prompts";
import {
  createDefaultKfg,
  type KfgConfig,
  LAYER_NAMES,
  type LayerName,
} from "../kfg/schema.js";

function handleCancel<T>(value: T): Exclude<T, symbol> {
  if (p.isCancel(value)) {
    p.cancel("No changes made.");
    process.exit(0);
  }
  return value as Exclude<T, symbol>;
}

export function getDormantLayers(cfg: KfgConfig): LayerName[] {
  return LAYER_NAMES.filter((layer) => {
    const section = cfg[layer] as Record<string, unknown>;
    return Object.values(section).every((val) => {
      if (Array.isArray(val)) return val.length === 0;
      if (typeof val === "boolean") return val === false;
      return val === "none";
    });
  });
}

async function selectOption<T extends string>(
  message: string,
  options: { value: T; label: string; hint?: string }[],
  initialValue?: T,
): Promise<T> {
  const result = await p.select({
    message,
    options: options as p.Option<T>[],
    initialValue,
  });
  return handleCancel(result as T | symbol);
}

export async function promptLayer(
  base: KfgConfig,
  layer: LayerName,
): Promise<KfgConfig> {
  const next = structuredClone(base);

  switch (layer) {
    case "shared": {
      next.shared.workspace = await selectOption(
        "Workspace manager",
        [
          {
            value: "turborepo",
            label: "Turborepo",
            hint: "pnpm workspaces + turbo",
          },
          { value: "none", label: "none" },
        ],
        next.shared.workspace,
      );
      next.shared.validation = await selectOption(
        "Shared validation",
        [
          { value: "zod", label: "Zod", hint: "packages/shared schemas" },
          { value: "none", label: "none" },
        ],
        next.shared.validation,
      );
      next.shared.quality = await selectOption(
        "Formatter & linter",
        [
          { value: "biome", label: "Biome" },
          { value: "none", label: "none" },
        ],
        next.shared.quality,
      );
      const testing = handleCancel(
        await p.multiselect({
          message: "Testing tools (space to toggle, enter to continue)",
          options: [
            { value: "vitest", label: "Vitest" },
            { value: "playwright", label: "Playwright" },
          ],
          initialValues: next.shared.testing,
          required: false,
        }),
      );
      next.shared.testing = testing as ("vitest" | "playwright")[];
      break;
    }

    case "frontend": {
      next.frontend.framework = await selectOption(
        "Frontend framework",
        [
          { value: "astro", label: "Astro" },
          { value: "vite-react", label: "Vite + React" },
          { value: "none", label: "none" },
        ],
        next.frontend.framework,
      );
      if (next.frontend.framework === "none") {
        next.frontend.css = "none";
        next.frontend.state = "none";
        next.frontend.data_fetching = "none";
        next.frontend.forms = "none";
        break;
      }
      next.frontend.css = await selectOption(
        "CSS framework",
        [
          { value: "tailwind", label: "Tailwind CSS" },
          { value: "none", label: "none" },
        ],
        next.frontend.css,
      );
      next.frontend.state = await selectOption(
        "Client state",
        [
          { value: "nanostores", label: "Nano Stores" },
          { value: "none", label: "none" },
        ],
        next.frontend.state,
      );
      next.frontend.data_fetching = await selectOption(
        "Data fetching",
        [
          { value: "tanstack-query", label: "TanStack Query" },
          { value: "none", label: "none" },
        ],
        next.frontend.data_fetching,
      );
      next.frontend.forms =
        next.frontend.framework === "astro"
          ? await selectOption(
              "Forms",
              [
                { value: "astro-actions", label: "Astro Actions" },
                { value: "none", label: "none" },
              ],
              next.frontend.forms === "astro-actions"
                ? "astro-actions"
                : "none",
            )
          : await selectOption(
              "Forms",
              [
                { value: "react-hook-form", label: "React Hook Form" },
                { value: "none", label: "none" },
              ],
              next.frontend.forms === "react-hook-form"
                ? "react-hook-form"
                : "none",
            );
      break;
    }

    case "backend": {
      next.backend.framework = await selectOption(
        "Backend framework",
        [
          {
            value: "hono",
            label: "Hono",
            hint: "apps/api with RPC & zod-validator",
          },
          { value: "none", label: "none" },
        ],
        next.backend.framework,
      );
      next.backend.sanitizer =
        next.backend.framework === "none"
          ? "none"
          : await selectOption(
              "HTML sanitizer",
              [
                { value: "sanitize-html", label: "sanitize-html" },
                { value: "none", label: "none" },
              ],
              next.backend.sanitizer,
            );
      break;
    }

    case "data": {
      next.data.database = await selectOption(
        "Primary database",
        [
          { value: "postgres", label: "PostgreSQL" },
          { value: "none", label: "none" },
        ],
        next.data.database,
      );
      next.data.kv = await selectOption(
        "KV store / cache",
        [
          { value: "valkey", label: "Valkey" },
          { value: "none", label: "none" },
        ],
        next.data.kv,
      );
      next.data.edge = await selectOption(
        "Edge SQLite",
        [
          { value: "turso", label: "Turso" },
          { value: "none", label: "none" },
        ],
        next.data.edge,
      );
      next.data.dal = await selectOption(
        "Data access layer",
        [
          { value: "kysely", label: "Kysely" },
          { value: "none", label: "none" },
        ],
        next.data.dal,
      );
      next.data.storage = await selectOption(
        "Object storage",
        [
          { value: "r2", label: "Cloudflare R2" },
          { value: "none", label: "none" },
        ],
        next.data.storage,
      );
      break;
    }

    case "identity": {
      next.identity.auth = await selectOption(
        "Authentication",
        [
          { value: "better-auth", label: "Better Auth" },
          { value: "none", label: "none" },
        ],
        next.identity.auth,
      );
      next.identity.bot_shield = await selectOption(
        "Bot protection",
        [
          { value: "turnstile", label: "Cloudflare Turnstile" },
          { value: "none", label: "none" },
        ],
        next.identity.bot_shield,
      );
      break;
    }

    case "commerce": {
      next.commerce.mor = await selectOption(
        "Merchant of Record",
        [
          { value: "creem", label: "Creem" },
          { value: "polar", label: "Polar" },
          { value: "none", label: "none" },
        ],
        next.commerce.mor,
      );
      if (next.commerce.mor === "none") {
        next.commerce.billing_di = false;
        next.commerce.entitlements = false;
        next.commerce.webhooks = false;
        next.commerce.usage_ledger = false;
        break;
      }
      next.commerce.billing_di = handleCancel(
        await p.confirm({
          message: "Include BillingProvider DI interface?",
          initialValue: true,
        }),
      );
      next.commerce.entitlements = handleCancel(
        await p.confirm({
          message: "Include entitlements module?",
          initialValue: true,
        }),
      );
      next.commerce.webhooks = handleCancel(
        await p.confirm({
          message: "Include webhook deduplication routes?",
          initialValue: true,
        }),
      );
      next.commerce.usage_ledger = handleCancel(
        await p.confirm({
          message: "Include usage ledger (Valkey + PG)?",
          initialValue: false,
        }),
      );
      break;
    }

    case "ops": {
      next.ops.queue = await selectOption(
        "Background job queue",
        [
          { value: "pg-boss", label: "pg-boss (PostgreSQL)" },
          { value: "bullmq", label: "BullMQ (Valkey)" },
          { value: "none", label: "none" },
        ],
        next.ops.queue,
      );
      next.ops.email = await selectOption(
        "Transactional email",
        [
          { value: "resend", label: "Resend" },
          { value: "postmark", label: "Postmark" },
          { value: "none", label: "none" },
        ],
        next.ops.email,
      );
      next.ops.logging = await selectOption(
        "Structured logging",
        [
          { value: "pino", label: "Pino" },
          { value: "none", label: "none" },
        ],
        next.ops.logging,
      );
      next.ops.errors = await selectOption(
        "Error tracking",
        [
          { value: "sentry", label: "Sentry" },
          { value: "glitchtip", label: "GlitchTip" },
          { value: "none", label: "none" },
        ],
        next.ops.errors,
      );
      next.ops.uptime = await selectOption(
        "Uptime monitoring",
        [
          { value: "betterstack", label: "Better Stack" },
          { value: "uptime-kuma", label: "Uptime Kuma" },
          { value: "none", label: "none" },
        ],
        next.ops.uptime,
      );
      break;
    }

    case "infra": {
      next.infra.edge_network = await selectOption(
        "Edge network",
        [
          { value: "cloudflare", label: "Cloudflare" },
          { value: "none", label: "none" },
        ],
        next.infra.edge_network,
      );
      next.infra.containers = await selectOption(
        "Containers",
        [
          { value: "docker-compose", label: "Docker Compose + Dockerfile" },
          { value: "none", label: "none" },
        ],
        next.infra.containers,
      );
      next.infra.hosting = await selectOption(
        "Hosting target",
        [
          { value: "hetzner", label: "Hetzner" },
          { value: "railway", label: "Railway" },
          { value: "fly", label: "Fly.io" },
          { value: "none", label: "none" },
        ],
        next.infra.hosting,
      );
      next.infra.deploy = await selectOption(
        "Deploy tool",
        [
          { value: "kamal2", label: "Kamal 2" },
          { value: "coolify", label: "Coolify" },
          { value: "dokploy", label: "Dokploy" },
          { value: "none", label: "none" },
        ],
        next.infra.deploy,
      );
      next.infra.ci = await selectOption(
        "CI pipeline",
        [
          { value: "github-actions", label: "GitHub Actions" },
          { value: "none", label: "none" },
        ],
        next.infra.ci,
      );
      next.infra.secrets = await selectOption(
        "Secrets manager",
        [
          { value: "infisical", label: "Infisical" },
          { value: "doppler", label: "Doppler" },
          { value: "none", label: "none" },
        ],
        next.infra.secrets,
      );
      next.infra.backups = await selectOption(
        "Database backups",
        [
          { value: "pg-dump-rclone-r2", label: "pg_dump + rclone -> R2" },
          { value: "none", label: "none" },
        ],
        next.infra.backups,
      );
      break;
    }
  }

  return next;
}

export async function promptSelectedLayers(
  existing: KfgConfig,
  selected: string[],
): Promise<KfgConfig> {
  let targetLayers: LayerName[];
  if (selected.includes("_all")) {
    const picked = handleCancel(
      await p.multiselect({
        message: "Select layers to reconfigure",
        options: LAYER_NAMES.map((layer) => ({ value: layer, label: layer })),
        required: true,
      }),
    );
    targetLayers = picked as LayerName[];
  } else {
    targetLayers = selected as LayerName[];
  }

  let current = structuredClone(existing);
  for (const layer of targetLayers) {
    current = await promptLayer(current, layer);
  }
  return current;
}

export async function promptFromPreset(
  mode: string,
  projectName: string,
): Promise<KfgConfig> {
  let cfg = createDefaultKfg(projectName);

  if (mode === "frontend-only") {
    cfg.shared.workspace = "turborepo";
    cfg.shared.quality = "biome";
    cfg = await promptLayer(cfg, "frontend");
    return cfg;
  }

  if (mode === "api-only") {
    cfg.shared.workspace = "turborepo";
    cfg.shared.validation = "zod";
    cfg.shared.quality = "biome";
    cfg = await promptLayer(cfg, "backend");
    cfg = await promptLayer(cfg, "data");
    return cfg;
  }

  if (mode === "full-stack") {
    for (const layer of LAYER_NAMES) {
      cfg = await promptLayer(cfg, layer);
    }
    return cfg;
  }

  const picked = handleCancel(
    await p.multiselect({
      message: "Pick which layers to enable",
      options: LAYER_NAMES.map((layer) => ({ value: layer, label: layer })),
      required: true,
    }),
  );
  for (const layer of picked as LayerName[]) {
    cfg = await promptLayer(cfg, layer);
  }
  return cfg;
}

export async function runWizard(
  existing: KfgConfig | null,
  defaultProjectName = "my-app",
): Promise<KfgConfig> {
  p.intro(
    existing
      ? `ktr — expanding ${existing.meta.project_name}`
      : "ktr — new E2E project",
  );

  if (existing) {
    const dormantLayers = getDormantLayers(existing);
    const toConfigure = handleCancel(
      await p.multiselect({
        message: "Which layers do you want to add or update?",
        options: [
          ...dormantLayers.map((layer) => ({
            value: layer,
            label: layer,
            hint: "currently none",
          })),
          {
            value: "_all",
            label: "Reconfigure any existing layer",
            hint: "advanced",
          },
        ],
        required: true,
      }),
    );
    return promptSelectedLayers(existing, toConfigure as string[]);
  }

  const projectName = handleCancel(
    await p.text({
      message: "Project name",
      initialValue: defaultProjectName,
      validate(value) {
        if (!value?.trim()) return "Project name is required";
      },
    }),
  );

  const mode = handleCancel(
    await p.select({
      message: "Starting shape",
      options: [
        {
          value: "frontend-only",
          label: "Frontend only",
          hint: "Astro/Vite + Shared; add backend later",
        },
        {
          value: "api-only",
          label: "API / Backend only",
          hint: "Hono + Data; add frontend later",
        },
        {
          value: "full-stack",
          label: "Full E2E stack",
          hint: "Configure all 8 layers now",
        },
        {
          value: "custom",
          label: "Custom layer selection",
          hint: "Pick exactly which layers to enable",
        },
      ],
    }),
  );

  return promptFromPreset(mode as string, projectName.trim());
}
