import { describe, expect, it } from "vitest";

import { strings, t } from "../src/i18n";

/**
 * Every string key must carry BOTH languages with real content. A key that
 * exists in English only silently renders English inside a Chichewa session;
 * this test makes that drift impossible to merge.
 */
describe("i18n completeness", () => {
  const keys = Object.keys(strings) as Array<keyof typeof strings>;

  it("has entries for every key", () => {
    expect(keys.length).toBeGreaterThan(20);
  });

  it("every key has non-empty en and ny strings", () => {
    const incomplete: string[] = [];
    for (const key of keys) {
      for (const lang of ["en", "ny"] as const) {
        const value = strings[key]?.[lang];
        if (typeof value !== "string" || value.trim().length === 0) {
          incomplete.push(`${key}.${lang}`);
        }
      }
    }
    expect(incomplete).toEqual([]);
  });

  it("falls back to the key itself for unknown keys at runtime", () => {
    // t() is typed to StringKey; the runtime guard still avoids `undefined`.
    const rogue = "not_a_real_key" as never;
    expect(t(rogue, "en")).toBe("not_a_real_key");
  });
});
