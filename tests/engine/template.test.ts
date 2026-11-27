import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { applyPlan } from "../../src/engine/apply.js";
import {
  applyTemplate,
  resolveTemplateSource,
} from "../../src/engine/template.js";
import { collectDoctorIssues } from "../../src/index.js";
import {
  createDefaultKfg,
  parseAndValidateKfg,
  serializeKfg,
} from "../../src/kfg/schema.js";
import { MODULE_REGISTRY } from "../../src/registry/index.js";

const tempDirs: string[] = [];

async function makeTempDir(prefix = "ktr-tpl-"): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((d) => fs.rm(d, { recursive: true, force: true })),
  );
});

describe("template resolver and applyTemplate", () => {
  it("resolves GitHub shorthand, full Git URLs, and local paths", () => {
    expect(resolveTemplateSource("gh/acme/store")).toEqual({
      kind: "git",
      url: "https://github.com/acme/store.git",
      branch: undefined,
    });
    expect(resolveTemplateSource("gh/acme/store#v2")).toEqual({
      kind: "git",
      url: "https://github.com/acme/store.git",
      branch: "v2",
    });
    expect(
      resolveTemplateSource("https://github.com/acme/store.git#main"),
    ).toEqual({
      kind: "git",
      url: "https://github.com/acme/store.git",
      branch: "main",
    });
    expect(resolveTemplateSource("./my-template", "/work")).toEqual({
      kind: "local",
      path: "/work/my-template",
    });
    const builtIn = resolveTemplateSource("ktr/vps-api");
    expect(builtIn.kind).toBe("local");
    if (builtIn.kind === "local") {
      expect(builtIn.path).toMatch(/templates\/starters\/vps-api$/);
    }
  });

  it("rejects empty input, invalid gh/ shorthand, and invalid ktr/ names", () => {
    expect(() => resolveTemplateSource("   ")).toThrow(
      "Template source cannot be empty",
    );
    expect(() => resolveTemplateSource("gh/only-owner")).toThrow(
      "Invalid GitHub shorthand",
    );
    expect(() => resolveTemplateSource("ktr/../evil")).toThrow(
      "Invalid built-in template",
    );
    expect(() => resolveTemplateSource("ktr/")).toThrow(
      "Invalid built-in template",
    );
  });

  it.each(["vps-api", "vps-app", "vps-spa"])(
    "applies built-in starter ktr/%s and passes doctor checks",
    async (starterName) => {
      const targetDir = await makeTempDir(`ktr-${starterName}-`);
      const applied = await applyTemplate({
        cwd: targetDir,
        sourceInput: `ktr/${starterName}`,
        projectName: `my-${starterName}`,
        dryRun: false,
      });

      expect(applied.config?.meta.project_name).toBe(`my-${starterName}`);
      const pkg = JSON.parse(
        await fs.readFile(path.join(targetDir, "package.json"), "utf8"),
      );
      expect(pkg.name).toBe(`my-${starterName}`);

      const kamal = await fs.readFile(
        path.join(targetDir, "infra/kamal/deploy.yml"),
        "utf8",
      );
      expect(kamal).toContain(`service: my-${starterName}`);
      expect(kamal).toContain(`image: my-${starterName}`);

      const loaded = parseAndValidateKfg(
        await fs.readFile(path.join(targetDir, "ktr.kfg"), "utf8"),
      );
      const issues = await collectDoctorIssues(targetDir, loaded);
      expect(issues).toEqual([]);
    },
  );

  it("applies a local template, strips .git, updates project_name, and supports later expansion", async () => {
    const sourceDir = await makeTempDir("ktr-src-");
    const targetDir = await makeTempDir("ktr-dst-");

    const tplKfg = createDefaultKfg("original-template");
    tplKfg.shared.workspace = "turborepo";
    tplKfg.frontend.framework = "astro";

    await fs.writeFile(
      path.join(sourceDir, "ktr.kfg"),
      serializeKfg(tplKfg),
      "utf8",
    );
    await fs.writeFile(
      path.join(sourceDir, "package.json"),
      JSON.stringify({ name: "original-template", private: true }),
      "utf8",
    );
    await fs.mkdir(path.join(sourceDir, ".git"), { recursive: true });
    await fs.writeFile(
      path.join(sourceDir, ".git/HEAD"),
      "ref: refs/heads/main\n",
      "utf8",
    );
    await fs.mkdir(path.join(sourceDir, "apps/web/src/pages"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(sourceDir, "apps/web/src/pages/index.astro"),
      "<h1>Storefront</h1>\n",
      "utf8",
    );

    const applied = await applyTemplate({
      cwd: targetDir,
      sourceInput: sourceDir,
      projectName: "my-store",
      dryRun: false,
    });

    expect(applied.config?.meta.project_name).toBe("my-store");
    await expect(fs.access(path.join(targetDir, ".git"))).rejects.toThrow();

    const pkg = JSON.parse(
      await fs.readFile(path.join(targetDir, "package.json"), "utf8"),
    );
    expect(pkg.name).toBe("my-store");

    const loadedKfg = parseAndValidateKfg(
      await fs.readFile(path.join(targetDir, "ktr.kfg"), "utf8"),
    );
    expect(loadedKfg.meta.project_name).toBe("my-store");

    // Verify ktr can expand on top of the template without touching template app files
    const expandedDesired = structuredClone(loadedKfg);
    expandedDesired.backend.framework = "hono";
    await applyPlan({
      cwd: targetDir,
      existing: loadedKfg,
      desired: expandedDesired,
      registry: MODULE_REGISTRY,
      dryRun: false,
    });

    expect(
      await fs.readFile(
        path.join(targetDir, "apps/web/src/pages/index.astro"),
        "utf8",
      ),
    ).toBe("<h1>Storefront</h1>\n");
    await expect(
      fs.access(path.join(targetDir, "apps/api/src/index.ts")),
    ).resolves.toBeUndefined();
  });

  it("fails on non-empty target directory or template missing ktr.kfg", async () => {
    const nonEmptyDir = await makeTempDir("ktr-nonempty-");
    await fs.writeFile(path.join(nonEmptyDir, "existing.txt"), "hello", "utf8");

    await expect(
      applyTemplate({
        cwd: nonEmptyDir,
        sourceInput: "/tmp",
        projectName: "app",
        dryRun: false,
      }),
    ).rejects.toThrow("Target directory is not empty");

    const sourceWithoutKfg = await makeTempDir("ktr-nokfg-");
    const emptyTarget = await makeTempDir("ktr-empty-");
    await expect(
      applyTemplate({
        cwd: emptyTarget,
        sourceInput: sourceWithoutKfg,
        projectName: "app",
        dryRun: false,
      }),
    ).rejects.toThrow("Template is missing required ktr.kfg");
  });

  it("leaves target directory empty in dry-run mode", async () => {
    const sourceDir = await makeTempDir("ktr-dry-src-");
    const targetDir = await makeTempDir("ktr-dry-dst-");
    await fs.writeFile(
      path.join(sourceDir, "ktr.kfg"),
      serializeKfg(createDefaultKfg("tpl")),
      "utf8",
    );

    await applyTemplate({
      cwd: targetDir,
      sourceInput: sourceDir,
      projectName: "dry-app",
      dryRun: true,
    });

    expect(await fs.readdir(targetDir)).toEqual([]);
  });

  it("initializes .git and .gitignore on template when useGit is true", async () => {
    const sourceDir = await makeTempDir("ktr-git-src-");
    const targetDir = await makeTempDir("ktr-git-dst-");
    await fs.writeFile(
      path.join(sourceDir, "ktr.kfg"),
      serializeKfg(createDefaultKfg("tpl")),
      "utf8",
    );

    await applyTemplate({
      cwd: targetDir,
      sourceInput: sourceDir,
      projectName: "git-tpl",
      dryRun: false,
      useGit: true,
    });

    await expect(
      fs.access(path.join(targetDir, ".git")),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(targetDir, ".gitignore")),
    ).resolves.toBeUndefined();
  });
});
