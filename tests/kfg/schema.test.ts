import { describe, expect, it } from "vitest";
import {
  createDefaultKfg,
  parseAndValidateKfg,
  serializeKfg,
} from "../../src/kfg/schema.js";

describe("kfg schema", () => {
  it("validates a full ktr.kfg config and round-trips", () => {
    const input = `
[meta]
schema_version : 1
cli_version : 0.0.1
project_name : acme-app
package_manager : pnpm
created_at : 2026-11-25

[shared]
workspace : turborepo
validation : zod
quality : biome
testing : [vitest, playwright]

[frontend]
framework : astro
css : tailwind
state : nanostores
data_fetching : tanstack-query
forms : astro-actions
`;
    const cfg = parseAndValidateKfg(input);
    expect(cfg.meta.project_name).toBe("acme-app");
    expect(cfg.shared.testing).toEqual(["vitest", "playwright"]);
    expect(cfg.backend.framework).toBe("none");

    const reparsed = parseAndValidateKfg(serializeKfg(cfg));
    expect(reparsed).toEqual(cfg);
  });

  it("rejects invalid option values and missing project_name", () => {
    expect(() =>
      parseAndValidateKfg(`
[meta]
project_name : ""
`),
    ).toThrow();

    expect(() =>
      parseAndValidateKfg(`
[meta]
project_name : app
[frontend]
framework : nextjs
`),
    ).toThrow();
  });

  it("creates a default config with none across all layers", () => {
    const cfg = createDefaultKfg("starter");
    expect(cfg.meta.project_name).toBe("starter");
    expect(cfg.frontend.framework).toBe("none");
    expect(cfg.shared.testing).toEqual([]);
  });
});
