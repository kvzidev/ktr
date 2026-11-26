import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ApplyContext,
  applyPlan,
  deepMergePreservingExisting,
  formatPackageArg,
} from "../../src/engine/apply.js";
import { createDefaultKfg } from "../../src/kfg/schema.js";
import { MODULE_REGISTRY } from "../../src/registry/index.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ktr-apply-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((d) => fs.rm(d, { recursive: true, force: true })),
  );
});

describe("ApplyContext", () => {
  it("preserves existing files, merges package.json, compose.yml, and .env.example", async () => {
    const cwd = await makeTempDir();
    const ctx = new ApplyContext(cwd, false);

    await ctx.writeIfMissing("custom.ts", "export const v = 1;\n");
    const second = await ctx.writeIfMissing(
      "custom.ts",
      "export const v = 2;\n",
    );
    expect(second.status).toBe("skipped");
    expect(await fs.readFile(path.join(cwd, "custom.ts"), "utf8")).toBe(
      "export const v = 1;\n",
    );

    await fs.writeFile(
      path.join(cwd, "package.json"),
      JSON.stringify({
        name: "app",
        scripts: { dev: "custom" },
        dependencies: { zod: "^4.0.0" },
      }),
    );
    await ctx.mergePackageJson("package.json", {
      scripts: { dev: "turbo dev", build: "turbo build" },
      dependencies: { zod: "^3.0.0", hono: "^4.7.0" },
    });
    const pkg = JSON.parse(
      await fs.readFile(path.join(cwd, "package.json"), "utf8"),
    );
    expect(pkg.scripts.dev).toBe("custom");
    expect(pkg.scripts.build).toBe("turbo build");
    expect(pkg.dependencies.zod).toBe("^4.0.0");
    expect(pkg.dependencies.hono).toBe("^4.7.0");

    await ctx.mergeDockerService("postgres", { image: "postgres:17-alpine" }, [
      "postgres_data",
    ]);
    await ctx.mergeDockerService("postgres", { image: "postgres:15" }, [
      "postgres_data",
    ]);
    const compose = await fs.readFile(path.join(cwd, "compose.yml"), "utf8");
    expect(compose).toContain("postgres:17-alpine");
    expect(compose).not.toContain("postgres:15");
    expect(compose).toContain("volumes:");
    expect(compose).toContain("postgres_data:");

    await ctx.appendEnvExample({ DATABASE_URL: "pg://a", PORT: "3001" });
    await ctx.appendEnvExample({
      DATABASE_URL: "pg://b",
      VALKEY_URL: "redis://a",
    });
    const env = await fs.readFile(path.join(cwd, ".env.example"), "utf8");
    expect(env).toContain("DATABASE_URL=pg://a");
    expect(env).toContain("VALKEY_URL=redis://a");
    expect(env).not.toContain("pg://b");
  });

  it("writes nothing in dry-run mode", async () => {
    const cwd = await makeTempDir();
    const ctx = new ApplyContext(cwd, true);

    await ctx.writeIfMissing("a.txt", "hello");
    await ctx.appendEnvExample({ FOO: "bar" });

    await expect(fs.access(path.join(cwd, "a.txt"))).rejects.toThrow();
    await expect(fs.access(path.join(cwd, ".env.example"))).rejects.toThrow();
  });

  it("deepMergePreservingExisting handles empty and nested objects", () => {
    expect(deepMergePreservingExisting({}, { a: 1 })).toEqual({ a: 1 });
    expect(
      deepMergePreservingExisting({ a: { x: 1 } }, { a: { x: 2, y: 3 } }),
    ).toEqual({
      a: { x: 1, y: 3 },
    });
  });

  it("formats package args and skips create/install under noInstall", async () => {
    expect(formatPackageArg({ name: "hono" })).toBe("hono");
    expect(formatPackageArg({ name: "zod", version: "^4" })).toBe("zod@^4");

    const cwd = await makeTempDir();
    const ctx = new ApplyContext(cwd, false, true);

    await ctx.runCreateCli({
      targetDir: "apps/web",
      command: "pnpm",
      args: ["create", "astro", "apps/web"],
      fallbackPackage: { path: "apps/web/package.json", name: "@repo/web" },
    });
    ctx.queuePackages(
      [
        { name: "nanostores", target: "apps/web" },
        {
          name: "@nanostores/react",
          target: "apps/web",
          when: (cfg) => cfg.frontend?.framework === "vite-react",
        },
      ],
      { frontend: { framework: "astro" } },
    );
    await ctx.flushPackages();

    const pkg = JSON.parse(
      await fs.readFile(path.join(cwd, "apps/web/package.json"), "utf8"),
    );
    expect(pkg.name).toBe("@repo/web");
    expect(ctx.operations).toContainEqual({
      type: "install",
      target: "apps/web: nanostores",
    });
  });

  it("creates .gitignore and initializes git only when useGit is true", async () => {
    const noGitDir = await makeTempDir();
    await applyPlan({
      cwd: noGitDir,
      existing: null,
      desired: createDefaultKfg("no-git-app"),
      registry: MODULE_REGISTRY,
      dryRun: false,
      noInstall: true,
      useGit: false,
    });
    await expect(
      fs.access(path.join(noGitDir, ".gitignore")),
    ).rejects.toThrow();
    await expect(fs.access(path.join(noGitDir, ".git"))).rejects.toThrow();

    const dryGitDir = await makeTempDir();
    const dryRes = await applyPlan({
      cwd: dryGitDir,
      existing: null,
      desired: createDefaultKfg("dry-git-app"),
      registry: MODULE_REGISTRY,
      dryRun: true,
      noInstall: true,
      useGit: true,
    });
    expect(dryRes.operations).toContainEqual({
      type: "git",
      target: "git init",
    });
    await expect(
      fs.access(path.join(dryGitDir, ".gitignore")),
    ).rejects.toThrow();
    await expect(fs.access(path.join(dryGitDir, ".git"))).rejects.toThrow();

    const gitDir = await makeTempDir();
    await applyPlan({
      cwd: gitDir,
      existing: null,
      desired: createDefaultKfg("git-app"),
      registry: MODULE_REGISTRY,
      dryRun: false,
      noInstall: true,
      useGit: true,
    });
    const gitignore = await fs.readFile(
      path.join(gitDir, ".gitignore"),
      "utf8",
    );
    expect(gitignore).toContain("node_modules/");
    await expect(fs.access(path.join(gitDir, ".git"))).resolves.toBeUndefined();
  });
});
