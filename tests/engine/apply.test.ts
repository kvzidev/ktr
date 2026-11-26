import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ApplyContext,
  deepMergePreservingExisting,
} from "../../src/engine/apply.js";

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

    await ctx.mergeDockerService("postgres", { image: "postgres:17-alpine" });
    await ctx.mergeDockerService("postgres", { image: "postgres:15" });
    const compose = await fs.readFile(path.join(cwd, "compose.yml"), "utf8");
    expect(compose).toContain("postgres:17-alpine");
    expect(compose).not.toContain("postgres:15");

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
});
