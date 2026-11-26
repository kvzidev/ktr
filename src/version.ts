import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function readPackageVersion(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, "../package.json"),
    path.resolve(here, "../../package.json"),
  ];
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    const parsed = JSON.parse(readFileSync(candidate, "utf8")) as {
      version?: string;
    };
    if (parsed.version) return parsed.version;
  }
  return "0.0.3";
}

export const KTR_VERSION = readPackageVersion();
