import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import * as p from "@clack/prompts";
import { defineCommand, runMain } from "citty";
import pc from "picocolors";
import YAML from "yaml";
import { applyPlan, isGitWorkingTreeDirty } from "./engine/apply.js";
import { diffConfigs } from "./engine/diff.js";
import {
  createDefaultKfg,
  type KfgConfig,
  LAYER_NAMES,
  type LayerName,
  parseAndValidateKfg,
} from "./kfg/schema.js";
import { getDormantLayers, promptLayer, runWizard } from "./prompts/wizard.js";
import { MODULE_REGISTRY } from "./registry/index.js";

const execFileAsync = promisify(execFile);

async function loadExistingKfg(cwd: string): Promise<KfgConfig | null> {
  const kfgPath = path.join(cwd, "ktr.kfg");
  if (!existsSync(kfgPath)) return null;
  const raw = await fs.readFile(kfgPath, "utf8");
  return parseAndValidateKfg(raw);
}

async function runPostApplyInstall(cwd: string, cfg: KfgConfig): Promise<void> {
  if (!existsSync(path.join(cwd, "package.json"))) return;

  const spinner = p.spinner();
  spinner.start("Installing dependencies with pnpm...");
  try {
    await execFileAsync("pnpm", ["install"], { cwd });
    spinner.stop("Dependencies installed.");
  } catch {
    spinner.stop("Skipped pnpm install (run `pnpm install` manually).");
  }

  if (cfg.shared.quality === "biome") {
    try {
      await execFileAsync("pnpm", ["run", "check"], { cwd });
    } catch {
      // Non-fatal if biome is not yet executable.
    }
  }
}

async function executeApplyFlow(options: {
  cwd: string;
  existing: KfgConfig | null;
  desired: KfgConfig;
  dryRun: boolean;
  yes: boolean;
  noInstall: boolean;
}): Promise<void> {
  const { cwd, existing, desired, dryRun, yes, noInstall } = options;

  if (existing && !dryRun && !yes && (await isGitWorkingTreeDirty(cwd))) {
    const proceed = await p.confirm({
      message: "Git working tree has uncommitted changes. Continue?",
      initialValue: false,
    });
    if (p.isCancel(proceed) || !proceed) {
      p.cancel("Aborted.");
      process.exit(0);
    }
  }

  const preview = diffConfigs(existing, desired, MODULE_REGISTRY);
  if (preview.autoAdded.length > 0 && !yes && !dryRun) {
    p.note(preview.autoAdded.join("\n"), "DAG prerequisites to auto-enable");
    const confirmDeps = await p.confirm({
      message: "Enable these required dependencies?",
      initialValue: true,
    });
    if (p.isCancel(confirmDeps) || !confirmDeps) {
      p.cancel("Aborted.");
      process.exit(0);
    }
  }

  const result = await applyPlan({
    cwd,
    existing,
    desired,
    registry: MODULE_REGISTRY,
    dryRun,
  });

  if (dryRun) {
    p.note(
      result.operations.map((op) => `${op.type}: ${op.target}`).join("\n") ||
        "No changes.",
      "Dry-run plan",
    );
    return;
  }

  if (!noInstall) {
    await runPostApplyInstall(cwd, result.finalConfig);
  }

  p.outro(`Synced ${result.operations.length} operation(s) to ktr.kfg.`);
}

async function collectDoctorIssues(
  cwd: string,
  cfg: KfgConfig,
): Promise<string[]> {
  const issues: string[] = [];

  const workspaceChecks: [boolean, string][] = [
    [cfg.shared.workspace === "turborepo", "pnpm-workspace.yaml"],
    [cfg.shared.validation === "zod", "packages/shared/package.json"],
    [cfg.frontend.framework !== "none", "apps/web/package.json"],
    [cfg.backend.framework === "hono", "apps/api/package.json"],
    [
      cfg.data.database === "postgres" ||
        cfg.data.kv === "valkey" ||
        cfg.data.edge === "turso" ||
        cfg.data.storage === "r2",
      "packages/db/package.json",
    ],
    [cfg.identity.auth === "better-auth", "packages/auth/package.json"],
    [cfg.commerce.mor !== "none", "packages/billing/package.json"],
    [cfg.ops.queue !== "none", "apps/worker/package.json"],
  ];

  for (const [enabled, relPath] of workspaceChecks) {
    if (enabled && !existsSync(path.join(cwd, relPath))) {
      issues.push(`Missing workspace file: ${relPath}`);
    }
  }

  if (cfg.data.database === "postgres" || cfg.data.kv === "valkey") {
    const composePath = path.join(cwd, "compose.yml");
    if (!existsSync(composePath)) {
      issues.push("Missing compose.yml");
    } else {
      const composeDoc = YAML.parse(await fs.readFile(composePath, "utf8")) as {
        services?: Record<string, unknown>;
      };
      if (cfg.data.database === "postgres" && !composeDoc?.services?.postgres) {
        issues.push("compose.yml missing postgres service");
      }
      if (cfg.data.kv === "valkey" && !composeDoc?.services?.valkey) {
        issues.push("compose.yml missing valkey service");
      }
    }
  }

  const requiredEnvKeys: string[] = [];
  if (cfg.backend.framework === "hono") requiredEnvKeys.push("PORT");
  if (cfg.data.database === "postgres") requiredEnvKeys.push("DATABASE_URL");
  if (cfg.data.kv === "valkey") requiredEnvKeys.push("VALKEY_URL");
  if (cfg.commerce.mor === "creem") requiredEnvKeys.push("CREEM_API_KEY");
  if (cfg.commerce.mor === "polar") requiredEnvKeys.push("POLAR_ACCESS_TOKEN");

  if (requiredEnvKeys.length > 0) {
    const envPath = path.join(cwd, ".env.example");
    const envContent = existsSync(envPath)
      ? await fs.readFile(envPath, "utf8")
      : "";
    for (const key of requiredEnvKeys) {
      if (!envContent.includes(`${key}=`)) {
        issues.push(`.env.example missing ${key}`);
      }
    }
  }

  return issues;
}

const addCommand = defineCommand({
  meta: {
    name: "add",
    description: "Configure a single layer and resolve DAG dependencies",
  },
  args: {
    layer: {
      type: "positional",
      description: `Layer name (${LAYER_NAMES.join(", ")})`,
      required: true,
    },
    "dry-run": { type: "boolean", default: false },
    "no-install": { type: "boolean", default: false },
    yes: { type: "boolean", default: false },
  },
  async run({ args }) {
    const layer = args.layer as LayerName;
    if (!LAYER_NAMES.includes(layer)) {
      console.error(
        pc.red(
          `Unknown layer "${args.layer}". Expected one of: ${LAYER_NAMES.join(", ")}`,
        ),
      );
      process.exit(1);
    }

    const cwd = process.cwd();
    const existing = await loadExistingKfg(cwd);
    const base = existing ?? createDefaultKfg(path.basename(cwd));
    const desired = await promptLayer(base, layer);

    await executeApplyFlow({
      cwd,
      existing,
      desired,
      dryRun: Boolean(args["dry-run"]),
      yes: Boolean(args.yes),
      noInstall: Boolean(args["no-install"]),
    });
  },
});

const statusCommand = defineCommand({
  meta: {
    name: "status",
    description: "Show active and dormant layers from ktr.kfg",
  },
  args: {
    json: { type: "boolean", default: false },
  },
  async run({ args }) {
    const cfg = await loadExistingKfg(process.cwd());
    if (!cfg) {
      console.error(pc.red("No ktr.kfg found in the current directory."));
      process.exit(1);
    }

    const dormant = new Set(getDormantLayers(cfg));
    const active = LAYER_NAMES.filter((layer) => !dormant.has(layer));

    if (args.json) {
      console.log(
        JSON.stringify(
          {
            project: cfg.meta.project_name,
            active,
            dormant: [...dormant],
            config: cfg,
          },
          null,
          2,
        ),
      );
      return;
    }

    console.log(pc.bold(`ktr status — ${cfg.meta.project_name}`));
    for (const layer of LAYER_NAMES) {
      const state = dormant.has(layer) ? pc.dim("none") : pc.green("active");
      console.log(`  ${layer.padEnd(10)} ${state}`);
    }
  },
});

const doctorCommand = defineCommand({
  meta: {
    name: "doctor",
    description:
      "Verify ktr.kfg matches workspaces, env vars, and Docker services",
  },
  args: {
    fix: { type: "boolean", default: false },
  },
  async run({ args }) {
    const firstPositional = args._?.[0];
    if (firstPositional === "add" || firstPositional === "status" || firstPositional === "doctor") {
      return;
    }

    const cwd = process.cwd();
    const cfg = await loadExistingKfg(cwd);
    if (!cfg) {
      console.error(pc.red("No ktr.kfg found in the current directory."));
      process.exit(1);
    }

    const issues = await collectDoctorIssues(cwd, cfg);
    if (issues.length === 0) {
      console.log(pc.green("All ktr checks passed."));
      return;
    }

    for (const issue of issues) {
      console.log(pc.yellow(`- ${issue}`));
    }

    if (!args.fix) {
      process.exitCode = 1;
      return;
    }

    const proceed = await p.confirm({
      message: `Apply fixes for ${issues.length} issue(s)?`,
      initialValue: true,
    });
    if (p.isCancel(proceed) || !proceed) {
      p.cancel("No fixes applied.");
      return;
    }

    await applyPlan({
      cwd,
      existing: null,
      desired: cfg,
      registry: MODULE_REGISTRY,
      dryRun: false,
    });
    p.outro("Applied fixes from ktr.kfg.");
  },
});

const main = defineCommand({
  meta: {
    name: "ktr",
    version: "0.0.1",
    description: "Idempotent E2E web stack scaffolder and expander",
  },
  args: {
    "dry-run": { type: "boolean", default: false },
    yes: { type: "boolean", default: false },
    from: {
      type: "string",
      description: "Path to an existing ktr.kfg template",
    },
    "no-install": { type: "boolean", default: false },
  },
  subCommands: {
    add: addCommand,
    status: statusCommand,
    doctor: doctorCommand,
  },
  async run({ args }) {
    const firstPositional = args._?.[0];
    if (firstPositional === "add" || firstPositional === "status" || firstPositional === "doctor") {
      return;
    }

    const cwd = process.cwd();
    const existing = await loadExistingKfg(cwd);

    let desired: KfgConfig;
    if (args.from) {
      const fromRaw = await fs.readFile(path.resolve(cwd, args.from), "utf8");
      desired = parseAndValidateKfg(fromRaw);
    } else if (args.yes) {
      desired = existing ?? createDefaultKfg(path.basename(cwd));
    } else {
      desired = await runWizard(existing, path.basename(cwd));
    }

    await executeApplyFlow({
      cwd,
      existing,
      desired,
      dryRun: Boolean(args["dry-run"]),
      yes: Boolean(args.yes),
      noInstall: Boolean(args["no-install"]),
    });
  },
});

runMain(main);
