import * as p from "@clack/prompts";
import {
  createDefaultKfg,
  type KfgConfig,
  LAYER_NAMES,
  type LayerName,
} from "../kfg/schema.js";
import { STACK_CATALOG } from "../registry/catalog.js";

function handleCancel<T>(value: T): Exclude<T, symbol> {
  if (p.isCancel(value)) {
    p.cancel("No changes made.");
    process.exit(0);
  }
  return value as Exclude<T, symbol>;
}

export function getDormantLayers(cfg: KfgConfig): LayerName[] {
  return LAYER_NAMES.filter((layer) => {
    const section = cfg[layer] as Record<string, unknown>;
    return Object.values(section).every((val) => {
      if (Array.isArray(val)) return val.length === 0;
      if (typeof val === "boolean") return val === false;
      return val === "none";
    });
  });
}

export async function promptLayer(
  base: KfgConfig,
  layer: LayerName,
): Promise<KfgConfig> {
  const next = structuredClone(base);
  const layerDef = STACK_CATALOG.find((item) => item.name === layer);
  if (!layerDef) return next;

  const cfgRecord = next as unknown as Record<string, Record<string, unknown>>;
  const section = cfgRecord[layer];

  for (const slot of layerDef.slots) {
    if (slot.when && !slot.when(cfgRecord)) {
      section[slot.key] =
        slot.kind === "boolean" ? false : slot.kind === "multi" ? [] : "none";
      continue;
    }

    const visibleOptions = slot.options.filter((opt) =>
      opt.when ? opt.when(cfgRecord) : true,
    );

    if (slot.kind === "boolean") {
      section[slot.key] = handleCancel(
        await p.confirm({
          message: slot.message,
          initialValue:
            typeof slot.defaultValue === "boolean" ? slot.defaultValue : false,
        }),
      );
      continue;
    }

    if (slot.kind === "multi") {
      const selected = handleCancel(
        await p.multiselect({
          message: slot.message,
          options: visibleOptions.map((opt) => ({
            value: opt.value,
            label: opt.label,
            hint: opt.hint,
          })),
          initialValues: Array.isArray(section[slot.key])
            ? (section[slot.key] as string[])
            : [],
          required: false,
        }),
      );
      section[slot.key] = selected as string[];
      continue;
    }

    const options = [
      ...visibleOptions.map((opt) => ({
        value: opt.value,
        label: opt.label,
        hint: opt.hint,
      })),
      { value: "none", label: "none" },
    ];
    const currentVal = String(section[slot.key] ?? "none");
    const initialValue = options.some((opt) => opt.value === currentVal)
      ? currentVal
      : "none";

    section[slot.key] = handleCancel(
      await p.select({
        message: slot.message,
        options: options as p.Option<string>[],
        initialValue,
      }),
    );
  }

  return next;
}

export async function promptSelectedLayers(
  existing: KfgConfig,
  selected: string[],
): Promise<KfgConfig> {
  let targetLayers: LayerName[];
  if (selected.includes("_all")) {
    const picked = handleCancel(
      await p.multiselect({
        message: "Select layers to reconfigure",
        options: LAYER_NAMES.map((layer) => ({ value: layer, label: layer })),
        required: true,
      }),
    );
    targetLayers = picked as LayerName[];
  } else {
    targetLayers = selected as LayerName[];
  }

  let current = structuredClone(existing);
  for (const layer of targetLayers) {
    current = await promptLayer(current, layer);
  }
  return current;
}

export async function promptFromPreset(
  mode: string,
  projectName: string,
): Promise<KfgConfig> {
  let cfg = createDefaultKfg(projectName);

  if (mode === "frontend-only") {
    cfg.shared.workspace = "turborepo";
    cfg.shared.quality = "biome";
    cfg = await promptLayer(cfg, "frontend");
    return cfg;
  }

  if (mode === "api-only") {
    cfg.shared.workspace = "turborepo";
    cfg.shared.validation = "zod";
    cfg.shared.quality = "biome";
    cfg = await promptLayer(cfg, "backend");
    cfg = await promptLayer(cfg, "data");
    return cfg;
  }

  if (mode === "full-stack") {
    for (const layer of LAYER_NAMES) {
      cfg = await promptLayer(cfg, layer);
    }
    return cfg;
  }

  const picked = handleCancel(
    await p.multiselect({
      message: "Pick which layers to enable",
      options: LAYER_NAMES.map((layer) => ({ value: layer, label: layer })),
      required: true,
    }),
  );
  for (const layer of picked as LayerName[]) {
    cfg = await promptLayer(cfg, layer);
  }
  return cfg;
}

export async function runWizard(
  existing: KfgConfig | null,
  defaultProjectName = "my-app",
): Promise<KfgConfig> {
  p.intro(
    existing
      ? `ktr — expanding ${existing.meta.project_name}`
      : "ktr — new E2E project",
  );

  if (existing) {
    const dormantLayers = getDormantLayers(existing);
    const toConfigure = handleCancel(
      await p.multiselect({
        message: "Which layers do you want to add or update?",
        options: [
          ...dormantLayers.map((layer) => ({
            value: layer,
            label: layer,
            hint: "currently none",
          })),
          {
            value: "_all",
            label: "Reconfigure any existing layer",
            hint: "advanced",
          },
        ],
        required: true,
      }),
    );
    return promptSelectedLayers(existing, toConfigure as string[]);
  }

  const projectName = handleCancel(
    await p.text({
      message: "Project name",
      initialValue: defaultProjectName,
      validate(value) {
        if (!value?.trim()) return "Project name is required";
      },
    }),
  );

  const mode = handleCancel(
    await p.select({
      message: "Starting shape",
      options: [
        {
          value: "frontend-only",
          label: "Frontend only",
          hint: "Astro/Vite + Shared; add backend later",
        },
        {
          value: "api-only",
          label: "API / Backend only",
          hint: "Hono + Data; add frontend later",
        },
        {
          value: "full-stack",
          label: "Full E2E stack",
          hint: "Configure all 8 layers now",
        },
        {
          value: "custom",
          label: "Custom layer selection",
          hint: "Pick exactly which layers to enable",
        },
      ],
    }),
  );

  return promptFromPreset(mode as string, projectName.trim());
}
