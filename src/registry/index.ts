import type { LayerName } from "../kfg/schema.js";
import { backendModules } from "./layers/backend.js";
import { commerceModules } from "./layers/commerce.js";
import { dataModules } from "./layers/data.js";
import { frontendModules } from "./layers/frontend.js";
import { identityModules } from "./layers/identity.js";
import { infraModules } from "./layers/infra.js";
import { opsModules } from "./layers/ops.js";
import { sharedModules } from "./layers/shared.js";
import type { ModuleDefinition } from "./types.js";

export const ALL_MODULES: ModuleDefinition[] = [
  ...sharedModules,
  ...frontendModules,
  ...backendModules,
  ...dataModules,
  ...identityModules,
  ...commerceModules,
  ...opsModules,
  ...infraModules,
];

export const MODULE_REGISTRY = new Map<string, ModuleDefinition>(
  ALL_MODULES.map((mod) => [mod.id, mod]),
);

export function getModulesForLayer(layer: LayerName): ModuleDefinition[] {
  return ALL_MODULES.filter((mod) => mod.layer === layer);
}
