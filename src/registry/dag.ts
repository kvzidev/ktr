import type { KfgConfig, LayerName } from "../kfg/schema.js";
import type { ModuleDefinition } from "./types.js";

export function makeModuleId(
  layer: LayerName,
  key: string,
  value: string,
): string {
  return `${layer}.${key}:${value}`;
}

export function extractSelectedModuleIds(
  cfg: KfgConfig,
  registry: Map<string, ModuleDefinition>,
): string[] {
  const selected: string[] = [];

  for (const [layer, section] of Object.entries(cfg)) {
    if (layer === "meta") continue;
    for (const [key, val] of Object.entries(
      section as Record<string, unknown>,
    )) {
      if (Array.isArray(val)) {
        for (const item of val) {
          const id = `${layer}.${key}:${String(item)}`;
          if (registry.has(id)) selected.push(id);
        }
      } else if (typeof val === "boolean") {
        if (val) {
          const id = `${layer}.${key}:true`;
          if (registry.has(id)) selected.push(id);
        }
      } else if (typeof val === "string" && val !== "none") {
        const id = `${layer}.${key}:${val}`;
        if (registry.has(id)) selected.push(id);
      }
    }
  }

  return selected;
}

export function applyModuleIdsToConfig(
  cfg: KfgConfig,
  ids: string[],
): KfgConfig {
  const next = structuredClone(cfg);

  for (const id of ids) {
    const dotIdx = id.indexOf(".");
    const colonIdx = id.indexOf(":");
    if (dotIdx === -1 || colonIdx === -1) continue;

    const layer = id.slice(0, dotIdx) as LayerName;
    const key = id.slice(dotIdx + 1, colonIdx);
    const value = id.slice(colonIdx + 1);
    const section = next[layer] as Record<string, unknown> | undefined;
    if (!section || !(key in section)) continue;

    if (Array.isArray(section[key])) {
      const current = section[key] as string[];
      if (!current.includes(value)) {
        section[key] = [...current, value];
      }
    } else if (typeof section[key] === "boolean") {
      section[key] = value === "true";
    } else {
      section[key] = value;
    }
  }

  return next;
}

export function resolveModules(
  selectedIds: string[],
  registry: Map<string, ModuleDefinition>,
): { ordered: ModuleDefinition[]; autoAdded: string[] } {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const ordered: ModuleDefinition[] = [];
  const autoAdded: string[] = [];
  const requested = new Set(selectedIds);

  function visit(id: string) {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      throw new Error(`Circular module dependency detected at ${id}`);
    }
    const mod = registry.get(id);
    if (!mod) {
      throw new Error(`Unknown module: ${id}`);
    }

    visiting.add(id);
    for (const depId of mod.requires ?? []) {
      if (!requested.has(depId) && !autoAdded.includes(depId)) {
        autoAdded.push(depId);
      }
      visit(depId);
    }
    visiting.delete(id);
    visited.add(id);
    ordered.push(mod);
  }

  for (const id of selectedIds) {
    visit(id);
  }
  return { ordered, autoAdded };
}
