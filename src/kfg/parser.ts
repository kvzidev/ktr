export type KfgValue = string | number | boolean | string[];
export type KfgDoc = Record<string, Record<string, KfgValue>>;

export const KFG_VERSION_PATTERN = /^\d+(\.\d+){2,3}$/;
export const KFG_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function stripInlineComment(raw: string): string {
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (quote) {
      if (ch === quote && raw[i - 1] !== "\\") {
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === ";") {
      return raw.slice(0, i).trim();
    }
  }
  return raw.trim();
}

function unquote(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\"/g, '"');
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/\\'/g, "'");
  }
  return value;
}

function parseValue(raw: string): KfgValue {
  const cleaned = stripInlineComment(raw);
  if (cleaned === "true") return true;
  if (cleaned === "false") return false;
  if (KFG_VERSION_PATTERN.test(cleaned)) return cleaned;
  if (KFG_DATE_PATTERN.test(cleaned)) return cleaned;
  if (/^-?\d+(\.\d+)?$/.test(cleaned)) return Number(cleaned);
  if (cleaned.startsWith("[") && cleaned.endsWith("]")) {
    const inner = cleaned.slice(1, -1).trim();
    if (!inner || inner === "none") return [];
    return inner
      .split(",")
      .map((item) => unquote(item.trim()))
      .filter(Boolean);
  }
  return unquote(cleaned);
}

export function isKfgVersion(value: unknown): value is string {
  return typeof value === "string" && KFG_VERSION_PATTERN.test(value);
}

export function isKfgDate(value: unknown): value is string {
  if (typeof value !== "string" || !KFG_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
  );
}

export function parseKfg(input: string): KfgDoc {
  const withoutBlockComments = input.replace(/\/;[\s\S]*?;\//g, "");
  const doc: KfgDoc = {};
  let currentSection = "meta";

  for (const rawLine of withoutBlockComments.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith(";")) continue;

    const sectionMatch = line.match(/^\[([a-zA-Z0-9_.-]+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      doc[currentSection] ??= {};
      continue;
    }

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    if (!key) continue;
    const val = parseValue(line.slice(colonIdx + 1));
    doc[currentSection] ??= {};
    doc[currentSection][key] = val;
  }
  return doc;
}

function formatScalar(val: string | number | boolean): string {
  if (typeof val !== "string") return String(val);
  const needsQuotes =
    val.length === 0 ||
    val.includes(";") ||
    val !== val.trim() ||
    val.startsWith("[") ||
    val.startsWith('"') ||
    val.startsWith("'");
  if (!needsQuotes) return val;
  return `"${val.replace(/"/g, '\\"')}"`;
}

export function stringifyKfg(doc: KfgDoc): string {
  const lines: string[] = [
    "; ktr.kfg — managed by `npx ktr` (safe to edit; re-run `npx ktr` to sync)",
    "",
  ];
  for (const [section, entries] of Object.entries(doc)) {
    lines.push(`[${section}]`);
    for (const [key, val] of Object.entries(entries)) {
      if (val === undefined) continue;
      const formatted = Array.isArray(val)
        ? val.length === 0
          ? "none"
          : `[${val.map(formatScalar).join(", ")}]`
        : formatScalar(val);
      lines.push(`${key} : ${formatted}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
