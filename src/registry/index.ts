import {
  type CatalogOption,
  type CatalogSlot,
  STACK_CATALOG,
} from "../catalog.js";
import type { LayerName } from "../kfg/schema.js";
import type { ModuleDefinition } from "./types.js";

function buildModule(
  layerName: LayerName,
  slot: CatalogSlot,
  option: CatalogOption,
): ModuleDefinition {
  const whenFn = option.when;

  return {
    id: `${layerName}.${slot.key}:${option.value}`,
    layer: layerName,
    key: slot.key,
    value: option.value,
    label: option.label,
    hint: option.hint,
    requires: option.requires,
    recommends: option.recommends,
    when: whenFn
      ? (cfg) =>
          whenFn(cfg as unknown as Record<string, Record<string, unknown>>)
      : undefined,
    async apply(ctx, cfg) {
      if (option.create) {
        await ctx.runCreateCli(option.create);
      }

      for (const tpl of option.templates ?? []) {
        const vars: Record<string, string> = tpl.interpolateProjectName
          ? { projectName: cfg.meta.project_name }
          : {};
        await ctx.writeTemplateIfMissing(
          tpl.targetPath,
          tpl.templatePath,
          vars,
        );
      }

      for (const file of option.files ?? []) {
        await ctx.writeIfMissing(file.targetPath, file.content);
      }

      for (const pkgPatch of option.packagePatches ?? []) {
        await ctx.mergePackageJson(pkgPatch.path, pkgPatch.patch);
      }

      if (option.packages && option.packages.length > 0) {
        ctx.queuePackages(
          option.packages,
          cfg as unknown as Record<string, Record<string, unknown>>,
        );
      }

      for (const svc of option.dockerServices ?? []) {
        await ctx.mergeDockerService(svc.name, svc.definition);
      }

      if (option.envVars) {
        await ctx.appendEnvExample(option.envVars);
      }
    },
  };
}

export const ALL_MODULES: ModuleDefinition[] = STACK_CATALOG.flatMap((layer) =>
  layer.slots.flatMap((slot) =>
    slot.options.map((option) => buildModule(layer.name, slot, option)),
  ),
);

export const MODULE_REGISTRY = new Map<string, ModuleDefinition>(
  ALL_MODULES.map((mod) => [mod.id, mod]),
);

export function getModulesForLayer(layer: LayerName): ModuleDefinition[] {
  return ALL_MODULES.filter((mod) => mod.layer === layer);
}
