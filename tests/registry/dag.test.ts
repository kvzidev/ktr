import { describe, expect, it } from "vitest";
import { createDefaultKfg } from "../../src/kfg/schema.js";
import {
  applyModuleIdsToConfig,
  extractSelectedModuleIds,
  resolveModules,
} from "../../src/registry/dag.js";
import { MODULE_REGISTRY } from "../../src/registry/index.js";
import type { ModuleDefinition } from "../../src/registry/types.js";

describe("registry DAG resolver", () => {
  it("resolves prerequisites before dependents and records auto-added deps", () => {
    const { ordered, autoAdded } = resolveModules(
      ["commerce.mor:creem"],
      MODULE_REGISTRY,
    );
    const orderedIds = ordered.map((m) => m.id);

    expect(autoAdded).toEqual([
      "backend.framework:hono",
      "shared.workspace:turborepo",
      "data.database:postgres",
      "data.dal:kysely",
    ]);
    expect(orderedIds.indexOf("shared.workspace:turborepo")).toBeLessThan(
      orderedIds.indexOf("backend.framework:hono"),
    );
    expect(orderedIds.indexOf("data.database:postgres")).toBeLessThan(
      orderedIds.indexOf("data.dal:kysely"),
    );
    expect(orderedIds.indexOf("data.dal:kysely")).toBeLessThan(
      orderedIds.indexOf("commerce.mor:creem"),
    );
  });

  it("throws on unknown modules and circular dependencies", () => {
    expect(() =>
      resolveModules(["nonexistent.mod:foo"], MODULE_REGISTRY),
    ).toThrow("Unknown module");

    const cyclicRegistry = new Map<string, ModuleDefinition>([
      [
        "a",
        {
          id: "a",
          layer: "shared",
          key: "a",
          value: "a",
          label: "A",
          requires: ["b"],
          async apply() {},
        },
      ],
      [
        "b",
        {
          id: "b",
          layer: "shared",
          key: "b",
          value: "b",
          label: "B",
          requires: ["a"],
          async apply() {},
        },
      ],
    ]);

    expect(() => resolveModules(["a"], cyclicRegistry)).toThrow(
      "Circular module dependency",
    );
  });

  it("handles empty selection and round-trips config module IDs", () => {
    expect(resolveModules([], MODULE_REGISTRY)).toEqual({
      ordered: [],
      autoAdded: [],
    });

    const base = createDefaultKfg("demo");
    const updated = applyModuleIdsToConfig(base, [
      "frontend.framework:astro",
      "shared.testing:vitest",
      "commerce.billing_di:true",
    ]);
    const extracted = extractSelectedModuleIds(updated, MODULE_REGISTRY);
    expect(extracted).toContain("frontend.framework:astro");
    expect(extracted).toContain("shared.testing:vitest");
    expect(extracted).toContain("commerce.billing_di:true");
  });
});
