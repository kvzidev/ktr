import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runCommand } from "citty";
import { afterEach, describe, expect, it, vi } from "vitest";
import { collectDoctorIssues, main } from "../../src/index.js";
import { createDefaultKfg, serializeKfg } from "../../src/kfg/schema.js";
import { KTR_VERSION } from "../../src/version.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ktr-cli-cmd-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    tempDirs.splice(0).map((d) => fs.rm(d, { recursive: true, force: true })),
  );
});

describe("CLI commands", () => {
  it("exposes package version in main meta", () => {
    expect(main.meta).toMatchObject({
      name: "ktr",
      version: KTR_VERSION,
    });
  });

  it("collectDoctorIssues detects missing workspaces, compose volumes, and env vars", async () => {
    const cwd = await makeTempDir();
    const cfg = createDefaultKfg("doc-app");
    cfg.shared.workspace = "turborepo";
    cfg.data.database = "postgres";
    cfg.ops.logging = "pino";

    await fs.writeFile(
      path.join(cwd, "compose.yml"),
      "services:\n  postgres:\n    image: postgres:17-alpine\n",
      "utf8",
    );

    const issues = await collectDoctorIssues(cwd, cfg);
    expect(issues).toContain("Missing workspace file: pnpm-workspace.yaml");
    expect(issues).toContain(
      "Missing workspace file: packages/db/package.json",
    );
    expect(issues).toContain(
      "Missing workspace file: packages/ops/package.json",
    );
    expect(issues).toContain("compose.yml missing postgres_data volume");
    expect(issues).toContain(".env.example missing DATABASE_URL");
  });

  it("runs status --json against an existing ktr.kfg", async () => {
    const cwd = await makeTempDir();
    const cfg = createDefaultKfg("status-app");
    cfg.shared.workspace = "turborepo";
    await fs.writeFile(path.join(cwd, "ktr.kfg"), serializeKfg(cfg), "utf8");

    vi.spyOn(process, "cwd").mockReturnValue(cwd);
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args) => {
      logs.push(args.map(String).join(" "));
    });

    await runCommand(main, { rawArgs: ["status", "--json"] });
    const parsed = JSON.parse(logs.join("\n")) as {
      project: string;
      active: string[];
      dormant: string[];
    };
    expect(parsed.project).toBe("status-app");
    expect(parsed.active).toContain("shared");
    expect(parsed.dormant).toContain("frontend");
  });

  it("runs --from with --dry-run without writing files", async () => {
    const cwd = await makeTempDir();
    const sourceCfg = createDefaultKfg("from-app");
    sourceCfg.shared.workspace = "turborepo";
    const fromPath = path.join(cwd, "preset.kfg");
    await fs.writeFile(fromPath, serializeKfg(sourceCfg), "utf8");

    vi.spyOn(process, "cwd").mockReturnValue(cwd);
    await runCommand(main, {
      rawArgs: ["--from", fromPath, "--dry-run", "--yes", "--no-install"],
    });

    await expect(fs.access(path.join(cwd, "ktr.kfg"))).rejects.toThrow();
    await expect(
      fs.access(path.join(cwd, "pnpm-workspace.yaml")),
    ).rejects.toThrow();
  });
});
