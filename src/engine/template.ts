import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import {
  type KfgConfig,
  parseAndValidateKfg,
  serializeKfg,
} from "../kfg/schema.js";

const execFileAsync = promisify(execFile);

export const TEMPLATE_ALIASES: Record<string, string> = {};

export type TemplateSource =
  | { kind: "local"; path: string }
  | { kind: "git"; url: string; branch?: string };

export function resolveTemplateSource(
  rawInput: string,
  cwd = process.cwd(),
): TemplateSource {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error("Template source cannot be empty.");
  }

  const aliased = TEMPLATE_ALIASES[trimmed];
  if (aliased) {
    return resolveTemplateSource(aliased, cwd);
  }

  if (trimmed.startsWith("gh/")) {
    const withoutPrefix = trimmed.slice(3);
    const [repoPart, branch] = withoutPrefix.split("#", 2);
    const segments = repoPart.split("/").filter(Boolean);
    if (segments.length !== 2) {
      throw new Error(
        `Invalid GitHub shorthand "${trimmed}". Expected gh/owner/repo or gh/owner/repo#branch.`,
      );
    }
    return {
      kind: "git",
      url: `https://github.com/${segments[0]}/${segments[1]}.git`,
      branch: branch || undefined,
    };
  }

  if (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("ssh://") ||
    trimmed.startsWith("git@")
  ) {
    const [url, branch] = trimmed.split("#", 2);
    return {
      kind: "git",
      url,
      branch: branch || undefined,
    };
  }

  return {
    kind: "local",
    path: path.resolve(cwd, trimmed),
  };
}

async function assertTargetDirectoryEmpty(cwd: string): Promise<void> {
  if (!existsSync(cwd)) return;
  const entries = await fs.readdir(cwd);
  if (entries.length > 0) {
    throw new Error(
      "Target directory is not empty. --template requires an empty directory.",
    );
  }
}

export async function applyTemplate(options: {
  cwd: string;
  sourceInput: string;
  projectName: string;
  dryRun: boolean;
}): Promise<{
  source: TemplateSource;
  config?: KfgConfig;
}> {
  const { cwd, sourceInput, projectName, dryRun } = options;
  await assertTargetDirectoryEmpty(cwd);

  const source = resolveTemplateSource(sourceInput, cwd);
  if (source.kind === "local") {
    if (!existsSync(source.path)) {
      throw new Error(`Template path does not exist: ${source.path}`);
    }
    const stat = await fs.stat(source.path);
    if (!stat.isDirectory()) {
      throw new Error(`Template path is not a directory: ${source.path}`);
    }
  }

  if (dryRun) {
    return { source };
  }

  const stageDir = await fs.mkdtemp(path.join(os.tmpdir(), "ktr-template-"));
  try {
    if (source.kind === "local") {
      await fs.cp(source.path, stageDir, { recursive: true });
    } else {
      const cloneArgs = ["clone", "--depth", "1"];
      if (source.branch) {
        cloneArgs.push("--branch", source.branch);
      }
      cloneArgs.push(source.url, stageDir);
      await execFileAsync("git", cloneArgs);
    }

    await fs.rm(path.join(stageDir, ".git"), { recursive: true, force: true });

    const kfgPath = path.join(stageDir, "ktr.kfg");
    if (!existsSync(kfgPath)) {
      throw new Error("Template is missing required ktr.kfg.");
    }

    const rawKfg = await fs.readFile(kfgPath, "utf8");
    const parsedKfg = parseAndValidateKfg(rawKfg);
    parsedKfg.meta.project_name = projectName;
    await fs.writeFile(kfgPath, serializeKfg(parsedKfg), "utf8");

    const pkgPath = path.join(stageDir, "package.json");
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(await fs.readFile(pkgPath, "utf8")) as Record<
        string,
        unknown
      >;
      pkg.name = projectName;
      await fs.writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
    }

    await fs.mkdir(cwd, { recursive: true });
    await fs.cp(stageDir, cwd, { recursive: true });

    return { source, config: parsedKfg };
  } finally {
    await fs.rm(stageDir, { recursive: true, force: true });
  }
}
