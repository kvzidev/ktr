import type { KfgConfig } from "../kfg/schema.js";
import {
  applyModuleIdsToConfig,
  extractSelectedModuleIds,
  resolveModules,
} from "../registry/dag.js";
import type { ModuleDefinition } from "../registry/types.js";

export interface ConfigDiff {
  modulesToApply: ModuleDefinition[];
  autoAdded: string[];
  finalConfig: KfgConfig;
}

export function diffConfigs(
  existing: KfgConfig | null,
  desired: KfgConfig,
  registry: Map<string, ModuleDefinition>,
): ConfigDiff {
  const existingIds = new Set(
    existing ? extractSelectedModuleIds(existing, registry) : [],
  );
  const desiredIds = extractSelectedModuleIds(desired, registry);
  const newOrChangedIds = desiredIds.filter((id) => !existingIds.has(id));

  const { ordered, autoAdded } = resolveModules(newOrChangedIds, registry);
  const modulesToApply = ordered.filter((mod) => !existingIds.has(mod.id));
  const finalConfig = applyModuleIdsToConfig(desired, autoAdded);

  return {
    modulesToApply,
    autoAdded,
    finalConfig,
  };
}
