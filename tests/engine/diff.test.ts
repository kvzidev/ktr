import { describe, expect, it } from "vitest";
import { diffConfigs } from "../../src/engine/diff.js";
import { createDefaultKfg } from "../../src/kfg/schema.js";
import { MODULE_REGISTRY } from "../../src/registry/index.js";

describe("diffConfigs", () => {
  it("computes delta and auto-adds prerequisites on expansion", () => {
    const existing = createDefaultKfg("app");
    existing.shared.workspace = "turborepo";
    existing.frontend.framework = "astro";

    const desired = structuredClone(existing);
    desired.commerce.mor = "creem";

    const diff = diffConfigs(existing, desired, MODULE_REGISTRY);
    const applyIds = diff.modulesToApply.map((m) => m.id);

    expect(applyIds).not.toContain("shared.workspace:turborepo");
    expect(applyIds).not.toContain("frontend.framework:astro");
    expect(applyIds).toContain("backend.framework:hono");
    expect(applyIds).toContain("data.database:postgres");
    expect(applyIds).toContain("data.dal:kysely");
    expect(applyIds).toContain("commerce.mor:creem");
    expect(diff.autoAdded).not.toContain("shared.workspace:turborepo");
    expect(diff.autoAdded).toContain("backend.framework:hono");
    expect(diff.finalConfig.backend.framework).toBe("hono");
    expect(diff.finalConfig.data.database).toBe("postgres");
  });

  it("returns empty delta when configs match", () => {
    const cfg = createDefaultKfg("app");
    cfg.shared.workspace = "turborepo";
    const diff = diffConfigs(cfg, cfg, MODULE_REGISTRY);
    expect(diff.modulesToApply).toEqual([]);
    expect(diff.autoAdded).toEqual([]);
  });
});
