import { describe, expect, it } from "vitest";
import {
  isKfgDate,
  isKfgVersion,
  parseKfg,
  stringifyKfg,
} from "../../src/kfg/parser.js";

describe("kfg parser", () => {
  it("parses sections, colon assignments, inline comments, block comments, and native types", () => {
    const input = `
; header comment
/;
  multi-line block comment
  ignored_key : should_not_appear
;/
[meta]
schema_version : 1
cli_version : 0.0.1.2
project_name : acme-app
created_at : 2026-11-25

[shared]
testing : [vitest, playwright] ; inline comment

[commerce]
billing_di : true
usage_ledger : false
note : "value ; with semicolon" ; trailing comment
`;

    const parsed = parseKfg(input);
    expect(parsed.meta).toEqual({
      schema_version: 1,
      cli_version: "0.0.1.2",
      project_name: "acme-app",
      created_at: "2026-11-25",
    });
    expect(parsed.shared).toEqual({
      testing: ["vitest", "playwright"],
    });
    expect(parsed.commerce).toEqual({
      billing_di: true,
      usage_ledger: false,
      note: "value ; with semicolon",
    });
  });

  it("handles empty input, missing values, and none arrays", () => {
    expect(parseKfg("")).toEqual({});
    const parsed = parseKfg(`
[shared]
testing : none
empty_arr : []
no_colon_line
: missing_key
`);
    expect(parsed.shared).toEqual({
      testing: "none",
      empty_arr: [],
    });
  });

  it("validates version and calendar date boundaries", () => {
    expect(isKfgVersion("1.0.0")).toBe(true);
    expect(isKfgVersion("1.2.3.4")).toBe(true);
    expect(isKfgVersion("1.2")).toBe(false);
    expect(isKfgDate("2026-11-25")).toBe(true);
    expect(isKfgDate("2026-02-30")).toBe(false);
  });

  it("round-trips through stringifyKfg using colon syntax", () => {
    const doc = {
      meta: { schema_version: 1, project_name: "demo" },
      shared: { testing: [] },
    };
    const serialized = stringifyKfg(doc);
    expect(serialized).toContain("schema_version : 1");
    expect(serialized).toContain("testing : none");
    expect(parseKfg(serialized)).toEqual({
      meta: { schema_version: 1, project_name: "demo" },
      shared: { testing: "none" },
    });
  });
});
