import { z } from "zod";
import {
  type CatalogLayer,
  type CatalogSlot,
  STACK_CATALOG,
} from "../registry/catalog.js";
import {
  isKfgDate,
  KFG_DATE_PATTERN,
  KFG_VERSION_PATTERN,
  type KfgDoc,
  parseKfg,
  stringifyKfg,
} from "./parser.js";

const versionSchema = z
  .string()
  .regex(
    KFG_VERSION_PATTERN,
    "Expected version with 3 or 4 dot-separated numbers",
  );

const dateSchema = z
  .string()
  .regex(KFG_DATE_PATTERN, "Expected date in YYYY-MM-DD format")
  .refine(isKfgDate, "Expected valid calendar date");

function buildSlotSchema(slot: CatalogSlot): z.ZodTypeAny {
  if (slot.kind === "boolean") {
    return z.boolean().default(false);
  }

  const values = slot.options.map((opt) => opt.value);
  if (slot.kind === "multi") {
    const itemEnum = z.enum(values as [string, ...string[]]);
    return z
      .union([
        z.literal("none").transform(() => [] as string[]),
        z.array(itemEnum),
      ])
      .default([]);
  }

  return z.enum(["none", ...values] as [string, ...string[]]).default("none");
}

function buildLayerSchema(
  layer: CatalogLayer,
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};
  const defaults: Record<string, unknown> = {};

  for (const slot of layer.slots) {
    shape[slot.key] = buildSlotSchema(slot);
    defaults[slot.key] =
      slot.kind === "boolean" ? false : slot.kind === "multi" ? [] : "none";
  }

  return z.object(shape);
}

const layerSchemas: Record<string, z.ZodTypeAny> = {};
for (const layer of STACK_CATALOG) {
  const objSchema = buildLayerSchema(layer);
  const defaults: Record<string, unknown> = {};
  for (const slot of layer.slots) {
    defaults[slot.key] =
      slot.kind === "boolean" ? false : slot.kind === "multi" ? [] : "none";
  }
  layerSchemas[layer.name] = objSchema.default(defaults);
}

export const kfgSchema = z.object({
  meta: z.object({
    schema_version: z.number().int().positive().default(1),
    cli_version: versionSchema.default("0.0.1"),
    project_name: z.string().min(1),
    package_manager: z.literal("pnpm").default("pnpm"),
    created_at: dateSchema.optional(),
  }),
  ...layerSchemas,
}) as unknown as z.ZodType<KfgConfig>;

export type LayerName = (typeof STACK_CATALOG)[number]["name"];

export interface KfgConfig {
  meta: {
    schema_version: number;
    cli_version: string;
    project_name: string;
    package_manager: "pnpm";
    created_at?: string;
  };
  shared: {
    workspace: string;
    validation: string;
    quality: string;
    testing: string[];
  };
  frontend: {
    framework: string;
    css: string;
    state: string;
    data_fetching: string;
    forms: string;
  };
  backend: {
    framework: string;
    sanitizer: string;
  };
  data: {
    database: string;
    kv: string;
    edge: string;
    dal: string;
    storage: string;
  };
  identity: {
    auth: string;
    bot_shield: string;
  };
  commerce: {
    mor: string;
    billing_di: boolean;
    entitlements: boolean;
    webhooks: boolean;
    usage_ledger: boolean;
  };
  ops: {
    queue: string;
    email: string;
    logging: string;
    errors: string;
    uptime: string;
  };
  infra: {
    edge_network: string;
    containers: string;
    hosting: string;
    deploy: string;
    ci: string;
    secrets: string;
    backups: string;
  };
}

export const LAYER_NAMES: readonly LayerName[] = STACK_CATALOG.map(
  (layer) => layer.name,
);

export function createDefaultKfg(
  projectName: string,
  cliVersion = "0.0.1",
): KfgConfig {
  return kfgSchema.parse({
    meta: {
      schema_version: 1,
      cli_version: cliVersion,
      project_name: projectName,
      package_manager: "pnpm",
    },
  });
}

export function parseAndValidateKfg(input: string): KfgConfig {
  const doc = parseKfg(input);
  return kfgSchema.parse(doc);
}

export function serializeKfg(config: KfgConfig): string {
  return stringifyKfg(config as unknown as KfgDoc);
}
