import { describe, expect, it } from "vitest";
import { diffConfigs } from "../../src/engine/diff.js";
import { parseAndValidateKfg, serializeKfg } from "../../src/kfg/schema.js";
import { createVpsPresetConfig } from "../../src/prompts/wizard.js";
import { MODULE_REGISTRY } from "../../src/registry/index.js";

describe("VPS self-hosted preset", () => {
  it("builds api-only VPS config with zero SaaS dependencies and validates cleanly", () => {
    const cfg = createVpsPresetConfig("vps-api", "api-only");

    expect(cfg.shared.workspace).toBe("turborepo");
    expect(cfg.shared.testing).toEqual(["vitest"]);
    expect(cfg.frontend.framework).toBe("none");
    expect(cfg.backend.framework).toBe("hono");
    expect(cfg.data.database).toBe("postgres");
    expect(cfg.data.kv).toBe("valkey");
    expect(cfg.data.dal).toBe("kysely");
    expect(cfg.data.edge).toBe("none");
    expect(cfg.data.storage).toBe("none");
    expect(cfg.identity.auth).toBe("better-auth");
    expect(cfg.identity.bot_shield).toBe("none");
    expect(cfg.commerce.mor).toBe("none");
    expect(cfg.ops.queue).toBe("pg-boss");
    expect(cfg.ops.email).toBe("none");
    expect(cfg.ops.logging).toBe("pino");
    expect(cfg.ops.errors).toBe("glitchtip");
    expect(cfg.ops.uptime).toBe("uptime-kuma");
    expect(cfg.infra.containers).toBe("docker-compose");
    expect(cfg.infra.hosting).toBe("vps");
    expect(cfg.infra.deploy).toBe("kamal2");
    expect(cfg.infra.edge_network).toBe("none");
    expect(cfg.infra.secrets).toBe("none");

    const reparsed = parseAndValidateKfg(serializeKfg(cfg));
    expect(reparsed).toEqual(cfg);

    const diff = diffConfigs(null, cfg, MODULE_REGISTRY);
    expect(diff.autoAdded).toEqual([]);
  });

  it("builds full-e2e VPS config with Astro frontend and Playwright", () => {
    const cfg = createVpsPresetConfig("vps-web", "full-e2e");

    expect(cfg.shared.testing).toEqual(["vitest", "playwright"]);
    expect(cfg.frontend.framework).toBe("astro");
    expect(cfg.frontend.css).toBe("tailwind");
    expect(cfg.frontend.state).toBe("nanostores");
    expect(cfg.frontend.data_fetching).toBe("tanstack-query");
    expect(cfg.frontend.forms).toBe("astro-actions");
    expect(cfg.infra.hosting).toBe("vps");

    const reparsed = parseAndValidateKfg(serializeKfg(cfg));
    expect(reparsed).toEqual(cfg);

    const diff = diffConfigs(null, cfg, MODULE_REGISTRY);
    expect(diff.autoAdded).toEqual([]);
  });
});
