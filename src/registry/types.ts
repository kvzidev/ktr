import type { ApplyContext } from "../engine/apply.js";
import type { KfgConfig } from "../kfg/schema.js";

export interface ModuleDefinition {
  id: string; // e.g. "commerce.mor:creem"
  layer: keyof KfgConfig; // e.g. "commerce"
  key: string; // e.g. "mor"
  value: string; // e.g. "creem"
  label: string; // Shown in @clack/prompts
  hint?: string; // Short explanation in prompt
  requires?: string[]; // Hard DAG deps: e.g. ["backend.framework:hono", "data.database:postgres"]
  recommends?: string[]; // Soft suggestions: e.g. ["data.kv:valkey"]
  when?: (cfg: KfgConfig) => boolean; // Conditional visibility (e.g. Astro Actions only if framework === "astro")
  apply: (ctx: ApplyContext, cfg: KfgConfig) => Promise<void>;
}
