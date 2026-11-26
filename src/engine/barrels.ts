import { existsSync } from "node:fs";
import path from "node:path";
import { Project } from "ts-morph";
import type { KfgConfig } from "../kfg/schema.js";
import type { ApplyContext } from "./apply.js";

function buildHonoRoutesBarrel(cfg: KfgConfig): string {
  const lines: string[] = [
    'import type { Hono } from "hono";',
    "",
    "export function registerKtrRoutes(app: Hono) {",
    '  app.get("/health", (c) => c.json({ ok: true }));',
  ];

  if (cfg.identity.auth === "better-auth") {
    lines.push("  // Better Auth routes mounted via @repo/auth");
  }
  if (cfg.commerce.webhooks) {
    lines.push("  // Billing webhook routes mounted via @repo/billing");
  }

  lines.push("}");
  lines.push("");
  return lines.join("\n");
}

function buildDbTablesBarrel(cfg: KfgConfig): string {
  const lines: string[] = ["export interface DatabaseTables {"];

  if (cfg.commerce.entitlements) {
    lines.push(
      "  entitlements: { user_id: string; feature: string; active: boolean };",
    );
  }
  if (cfg.commerce.webhooks) {
    lines.push(
      "  webhook_events: { id: string; provider: string; processed_at: string };",
    );
  }
  if (cfg.commerce.usage_ledger) {
    lines.push(
      "  usage_ledger: { account_id: string; metric: string; delta: number };",
    );
  }

  lines.push("}");
  lines.push("");
  return lines.join("\n");
}

function ensureHonoBarrelWired(cwd: string): void {
  const indexPath = path.join(cwd, "apps/api/src/index.ts");
  if (!existsSync(indexPath)) return;

  const project = new Project();
  const source = project.addSourceFileAtPath(indexPath);
  const text = source.getFullText();

  if (!text.includes("registerKtrRoutes")) {
    source.addImportDeclaration({
      moduleSpecifier: "./ktr/routes.js",
      namedImports: ["registerKtrRoutes"],
    });
    source.saveSync();
  }
}

export async function syncBarrels(
  ctx: ApplyContext,
  cfg: KfgConfig,
): Promise<void> {
  if (cfg.backend.framework === "hono") {
    await ctx.writeManaged(
      "apps/api/src/ktr/routes.ts",
      buildHonoRoutesBarrel(cfg),
    );
    if (!ctx.dryRun) {
      ensureHonoBarrelWired(ctx.cwd);
    }
  }

  if (cfg.data.database === "postgres" || cfg.data.dal === "kysely") {
    await ctx.writeManaged(
      "packages/db/src/ktr/tables.ts",
      buildDbTablesBarrel(cfg),
    );
  }
}
