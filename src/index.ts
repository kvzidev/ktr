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
import { applyTemplate } from "./engine/template.js";
import {
  createDefaultKfg,
  type KfgConfig,
  LAYER_NAMES,
  type LayerName,
  parseAndValidateKfg,
} from "./kfg/schema.js";
import { getDormantLayers, promptLayer, runWizard } from "./prompts/wizard.js";
import { type CatalogOption, STACK_CATALOG } from "./registry/catalog.js";
import { MODULE_REGISTRY } from "./registry/index.js";
import { KTR_VERSION } from "./version.js";

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
  useGit?: boolean;
}): Promise<void> {
  const {
    cwd,
    existing,
    desired,
    dryRun,
    yes,
    noInstall,
    useGit = false,
  } = options;

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
    noInstall,
    useGit,
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

function getActiveCatalogOptions(cfg: KfgConfig): CatalogOption[] {
  const cfgRecord = cfg as unknown as Record<string, Record<string, unknown>>;
  const active: CatalogOption[] = [];

  for (const layer of STACK_CATALOG) {
    const section = cfgRecord[layer.name];
    if (!section) continue;
    for (const slot of layer.slots) {
      const val = section[slot.key];
      if (Array.isArray(val)) {
        for (const opt of slot.options) {
          if (val.includes(opt.value)) active.push(opt);
        }
      } else if (typeof val === "boolean") {
        if (val) {
          const opt = slot.options.find((o) => o.value === "true");
          if (opt) active.push(opt);
        }
      } else if (typeof val === "string" && val !== "none") {
        const opt = slot.options.find((o) => o.value === val);
        if (opt) active.push(opt);
      }
    }
  }

  return active;
}

async function collectDoctorIssues(
  cwd: string,
  cfg: KfgConfig,
): Promise<string[]> {
  const issues: string[] = [];
  const activeOptions = getActiveCatalogOptions(cfg);

  const expectedWorkspaces = new Set<string>();
  const expectedDockerServices = new Set<string>();
  const expectedDockerVolumes = new Set<string>();
  const expectedEnvKeys = new Set<string>();

  for (const opt of activeOptions) {
    if (opt.expectedWorkspace) expectedWorkspaces.add(opt.expectedWorkspace);
    for (const svc of opt.dockerServices ?? []) {
      expectedDockerServices.add(svc.name);
      for (const vol of svc.volumes ?? []) {
        expectedDockerVolumes.add(vol);
      }
    }
    for (const key of Object.keys(opt.envVars ?? {})) {
      expectedEnvKeys.add(key);
    }
  }

  for (const relPath of expectedWorkspaces) {
    if (!existsSync(path.join(cwd, relPath))) {
      issues.push(`Missing workspace file: ${relPath}`);
    }
  }

  if (expectedDockerServices.size > 0 || expectedDockerVolumes.size > 0) {
    const composePath = path.join(cwd, "compose.yml");
    if (!existsSync(composePath)) {
      issues.push("Missing compose.yml");
    } else {
      const composeDoc = YAML.parse(await fs.readFile(composePath, "utf8")) as {
        services?: Record<string, unknown>;
        volumes?: Record<string, unknown>;
      };
      for (const svcName of expectedDockerServices) {
        if (!composeDoc?.services?.[svcName]) {
          issues.push(`compose.yml missing ${svcName} service`);
        }
      }
      for (const volName of expectedDockerVolumes) {
        if (!composeDoc?.volumes?.[volName]) {
          issues.push(`compose.yml missing ${volName} volume`);
        }
      }
    }
  }

  if (expectedEnvKeys.size > 0) {
    const envPath = path.join(cwd, ".env.example");
    const envContent = existsSync(envPath)
      ? await fs.readFile(envPath, "utf8")
      : "";
    for (const key of expectedEnvKeys) {
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
    "no-install": { type: "boolean", default: false },
  },
  async run({ args }) {
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

    const noInstall = Boolean(args["no-install"]);
    await applyPlan({
      cwd,
      existing: null,
      desired: cfg,
      registry: MODULE_REGISTRY,
      dryRun: false,
      noInstall,
    });
    if (!noInstall) {
      await runPostApplyInstall(cwd, cfg);
    }
    p.outro("Applied fixes from ktr.kfg.");
  },
});

const main = defineCommand({
  meta: {
    name: "ktr",
    version: KTR_VERSION,
    description: "Idempotent E2E web stack scaffolder and expander",
  },
  args: {
    "dry-run": { type: "boolean", default: false },
    yes: { type: "boolean", default: false },
    from: {
      type: "string",
      description: "Path to an existing ktr.kfg config",
    },
    template: {
      type: "string",
      description:
        "Git URL, gh/owner/repo, or local path to a template project",
    },
    "no-install": { type: "boolean", default: false },
    "use-git": {
      type: "boolean",
      default: false,
      description: "Initialize a Git repository and .gitignore",
    },
  },
  subCommands: {
    add: addCommand,
    status: statusCommand,
    doctor: doctorCommand,
  },
  async run({ args }) {
    const firstPositional = args._?.[0];
    if (
      firstPositional === "add" ||
      firstPositional === "status" ||
      firstPositional === "doctor"
    ) {
      return;
    }

    const cwd = process.cwd();
    let targetCwd = cwd;
    let useGit = Boolean(args["use-git"]);

    if (args.template && args.from) {
      console.error(pc.red("Cannot combine --template and --from."));
      process.exit(1);
    }

    if (args.template) {
      if (!args.yes) {
        const enteredDir = await p.text({
          message: "Where should we create your new project?",
          initialValue: "./my-app",
          validate(value) {
            if (!value?.trim()) return "Target folder is required";
          },
        });
        if (p.isCancel(enteredDir)) {
          p.cancel("Aborted.");
          process.exit(0);
        }
        targetCwd = path.resolve(cwd, enteredDir.trim());
      }

      let projectName = path.basename(targetCwd);
      if (!args.yes) {
        const entered = await p.text({
          message: "Project name",
          initialValue: projectName,
          validate(value) {
            if (!value?.trim()) return "Project name is required";
          },
        });
        if (p.isCancel(entered)) {
          p.cancel("Aborted.");
          process.exit(0);
        }
        projectName = entered.trim();

        if (!useGit) {
          const confirmGit = await p.confirm({
            message: "Initialize a Git repository?",
            initialValue: false,
          });
          if (p.isCancel(confirmGit)) {
            p.cancel("Aborted.");
            process.exit(0);
          }
          useGit = confirmGit;
        }
      }

      const result = await applyTemplate({
        cwd: targetCwd,
        sourceInput: args.template,
        projectName,
        dryRun: Boolean(args["dry-run"]),
        useGit,
      });

      if (args["dry-run"]) {
        const target =
          result.source.kind === "git" ? result.source.url : result.source.path;
        p.note(`Would bootstrap ${projectName} from ${target}`, "Dry-run plan");
        return;
      }

      if (!args["no-install"] && result.config) {
        await runPostApplyInstall(targetCwd, result.config);
      }

      p.outro(`Bootstrapped ${projectName} from template.`);
      return;
    }

    const existing = await loadExistingKfg(cwd);

    let desired: KfgConfig;
    if (args.from) {
      const fromRaw = await fs.readFile(path.resolve(cwd, args.from), "utf8");
      desired = parseAndValidateKfg(fromRaw);
      if (!existing && !args.yes) {
        const enteredDir = await p.text({
          message: "Where should we create your new project?",
          initialValue: `./${desired.meta.project_name}`,
          validate(value) {
            if (!value?.trim()) return "Target folder is required";
          },
        });
        if (p.isCancel(enteredDir)) {
          p.cancel("Aborted.");
          process.exit(0);
        }
        targetCwd = path.resolve(cwd, enteredDir.trim());
      }
    } else if (args.yes) {
      desired = existing ?? createDefaultKfg(path.basename(cwd));
    } else {
      const wizardResult = await runWizard(existing, "./my-app", useGit);
      targetCwd = path.resolve(cwd, wizardResult.targetDir);
      desired = wizardResult.config;
      useGit = useGit || wizardResult.useGit;
    }

    await executeApplyFlow({
      cwd: targetCwd,
      existing,
      desired,
      dryRun: Boolean(args["dry-run"]),
      yes: Boolean(args.yes),
      noInstall: Boolean(args["no-install"]),
      useGit,
    });
  },
});

export { collectDoctorIssues, main };

if (!process.env.VITEST) {
  runMain(main);
}
