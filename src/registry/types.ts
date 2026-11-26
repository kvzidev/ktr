import type { ApplyContext } from "../engine/apply.js";
import type { KfgConfig } from "../kfg/schema.js";

export interface PackageSpec {
  name: string;
  version?: string;
  target?: string;
  dev?: boolean;
  when?: (cfg: Record<string, Record<string, unknown>>) => boolean;
}

export interface CreateCliSpec {
  targetDir: string;
  command: string;
  args: string[];
  fallbackPackage?: {
    path: string;
    name: string;
  };
}

export interface TemplateSpec {
  targetPath: string;
  templatePath: string;
  interpolateProjectName?: boolean;
}

export interface InlineFileSpec {
  targetPath: string;
  content: string;
}

export interface DockerServiceSpec {
  name: string;
  definition: Record<string, unknown>;
}

export interface CatalogOption {
  value: string;
  label: string;
  hint?: string;
  requires?: string[];
  recommends?: string[];
  when?: (cfg: Record<string, Record<string, unknown>>) => boolean;
  create?: CreateCliSpec;
  packages?: PackageSpec[];
  templates?: TemplateSpec[];
  files?: InlineFileSpec[];
  packagePatches?: { path: string; patch: Record<string, unknown> }[];
  dockerServices?: DockerServiceSpec[];
  envVars?: Record<string, string>;
  expectedWorkspace?: string;
}

export type SlotKind = "select" | "multi" | "boolean";

export interface CatalogSlot {
  key: string;
  kind: SlotKind;
  message: string;
  defaultValue?: unknown;
  when?: (cfg: Record<string, Record<string, unknown>>) => boolean;
  options: CatalogOption[];
}

export interface CatalogLayer {
  name:
    | "shared"
    | "frontend"
    | "backend"
    | "data"
    | "identity"
    | "commerce"
    | "ops"
    | "infra";
  slots: CatalogSlot[];
}

export interface ModuleDefinition {
  id: string;
  layer: keyof KfgConfig;
  key: string;
  value: string;
  label: string;
  hint?: string;
  requires?: string[];
  recommends?: string[];
  when?: (cfg: KfgConfig) => boolean;
  apply: (ctx: ApplyContext, cfg: KfgConfig) => Promise<void>;
}
