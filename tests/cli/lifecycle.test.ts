import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import YAML from "yaml";
import { applyPlan } from "../../src/engine/apply.js";
import { createDefaultKfg, parseAndValidateKfg } from "../../src/kfg/schema.js";
import { MODULE_REGISTRY } from "../../src/registry/index.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ktr-lifecycle-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((d) => fs.rm(d, { recursive: true, force: true })),
  );
});

describe("multi-year lifecycle integration", () => {
  it("initializes frontend-only, preserves custom.ts, expands backend + data, then adds commerce", async () => {
    const cwd = await makeTempDir();

    // 1. Greenfield init: frontend only
    const step1Desired = createDefaultKfg("acme-app");
    step1Desired.shared.workspace = "turborepo";
    step1Desired.shared.quality = "biome";
    step1Desired.frontend.framework = "astro";
    step1Desired.frontend.css = "tailwind";

    const step1 = await applyPlan({
      cwd,
      existing: null,
      desired: step1Desired,
      registry: MODULE_REGISTRY,
      dryRun: false,
      noInstall: true,
    });

    expect(step1.finalConfig.frontend.framework).toBe("astro");

    const workspaceYaml = await fs.readFile(
      path.join(cwd, "pnpm-workspace.yaml"),
      "utf8",
    );
    expect(workspaceYaml).toContain("minimumReleaseAge: 4320");

    // 2. User adds custom code in apps/web/src/custom.ts
    const customFilePath = path.join(cwd, "apps/web/src/custom.ts");
    const customContent = "export const userFeature = 'untouched';\n";
    await fs.mkdir(path.dirname(customFilePath), { recursive: true });
    await fs.writeFile(customFilePath, customContent, "utf8");

    // 3. Re-run later: add backend (hono) + postgres + valkey
    const kfgAfterStep1 = parseAndValidateKfg(
      await fs.readFile(path.join(cwd, "ktr.kfg"), "utf8"),
    );
    const step2Desired = structuredClone(kfgAfterStep1);
    step2Desired.backend.framework = "hono";
    step2Desired.data.database = "postgres";
    step2Desired.data.kv = "valkey";

    await applyPlan({
      cwd,
      existing: kfgAfterStep1,
      desired: step2Desired,
      registry: MODULE_REGISTRY,
      dryRun: false,
      noInstall: true,
    });

    // 4. Re-run again: add commerce (creem) + entitlements + webhooks
    const kfgAfterStep2 = parseAndValidateKfg(
      await fs.readFile(path.join(cwd, "ktr.kfg"), "utf8"),
    );
    const step3Desired = structuredClone(kfgAfterStep2);
    step3Desired.commerce.mor = "creem";
    step3Desired.commerce.billing_di = true;
    step3Desired.commerce.entitlements = true;
    step3Desired.commerce.webhooks = true;

    const step3 = await applyPlan({
      cwd,
      existing: kfgAfterStep2,
      desired: step3Desired,
      registry: MODULE_REGISTRY,
      dryRun: false,
      noInstall: true,
    });

    // Kysely should have been auto-added by DAG for commerce.mor:creem
    expect(step3.autoAdded).toContain("data.dal:kysely");

    // Verify user custom file is untouched
    expect(await fs.readFile(customFilePath, "utf8")).toBe(customContent);

    // Verify ktr.kfg parses cleanly
    const finalKfg = parseAndValidateKfg(
      await fs.readFile(path.join(cwd, "ktr.kfg"), "utf8"),
    );
    expect(finalKfg.frontend.framework).toBe("astro");
    expect(finalKfg.backend.framework).toBe("hono");
    expect(finalKfg.data.database).toBe("postgres");
    expect(finalKfg.data.kv).toBe("valkey");
    expect(finalKfg.data.dal).toBe("kysely");
    expect(finalKfg.commerce.mor).toBe("creem");

    // Verify compose.yml has both postgres and valkey
    const compose = YAML.parse(
      await fs.readFile(path.join(cwd, "compose.yml"), "utf8"),
    ) as { services: Record<string, unknown> };
    expect(compose.services.postgres).toBeDefined();
    expect(compose.services.valkey).toBeDefined();

    // Verify managed barrels and billing package exist
    const tablesBarrel = await fs.readFile(
      path.join(cwd, "packages/db/src/ktr/tables.ts"),
      "utf8",
    );
    expect(tablesBarrel).toContain("entitlements:");
    expect(tablesBarrel).toContain("webhook_events:");
  });
});
