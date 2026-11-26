import type { CatalogLayer } from "./types.js";

import { backendLayer } from "./layers/backend.js";
import { commerceLayer } from "./layers/commerce.js";
import { dataLayer } from "./layers/data.js";
import { frontendLayer } from "./layers/frontend.js";
import { identityLayer } from "./layers/identity.js";
import { infraLayer } from "./layers/infra.js";
import { opsLayer } from "./layers/ops.js";
import { sharedLayer } from "./layers/shared.js";

export type {
  CatalogLayer,
  CatalogOption,
  CatalogSlot,
  CreateCliSpec,
  DockerServiceSpec,
  InlineFileSpec,
  PackageSpec,
  SlotKind,
  TemplateSpec,
} from "./types.js";

export const STACK_CATALOG: readonly CatalogLayer[] = [
  sharedLayer,
  frontendLayer,
  backendLayer,
  dataLayer,
  identityLayer,
  commerceLayer,
  opsLayer,
  infraLayer,
];
