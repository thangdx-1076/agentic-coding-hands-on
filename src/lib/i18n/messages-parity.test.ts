import * as fs from "fs";
import * as path from "path";

import { describe, expect, it } from "vitest";

// Load JSON messages files
const enMessages = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "../../../messages/en.json"),
    "utf-8",
  ),
) as Record<string, unknown>;
const viMessages = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "../../../messages/vi.json"),
    "utf-8",
  ),
) as Record<string, unknown>;

/**
 * Flattens a nested object into a list of dot-notation paths (e.g.
 * `{ a: { b: "x" } }` → `["a.b"]`). Ensures the key structure is
 * identical between locales at every nesting level.
 */
function flattenKeys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) {
    return [];
  }

  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null) {
      // Recurse into nested objects
      keys.push(...flattenKeys(value, path));
    } else {
      // Leaf node — add to key list
      keys.push(path);
    }
  }
  return keys;
}

/**
 * Flattens a nested object into a list of `[path, value]` pairs, keeping the
 * leaf value alongside its dot-notation path. Non-string leaves are skipped
 * since the diacritic guard only inspects display text.
 */
function flattenEntries(obj: unknown, prefix = ""): [string, string][] {
  if (typeof obj !== "object" || obj === null) {
    return [];
  }

  const entries: [string, string][] = [];
  for (const [key, value] of Object.entries(obj)) {
    const entryPath = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null) {
      entries.push(...flattenEntries(value, entryPath));
    } else if (typeof value === "string") {
      entries.push([entryPath, value]);
    }
  }
  return entries;
}

// Explicit Vietnamese diacritic character class: precomposed vowels carrying
// a Vietnamese tone/quality mark, the letters đ/Đ, and the standalone
// combining marks (U+0300 grave, U+0301 acute, U+0303 tilde, U+0309 hook
// above, U+0323 dot below) used by Vietnamese diacritics. Deliberately NOT
// `/[^\x00-\x7F]/` — that would also flag legitimate non-ASCII characters in
// English copy such as `Sun*`, the ellipsis `…`, or emoji.
const VI_DIACRITICS =
  /[ăâđêôơưĂÂĐÊÔƠƯáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵÁÀẢÃẠẤẦẨẪẬẮẰẲẴẶÉÈẺẼẸẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌỐỒỔỖỘỚỜỞỠỢÚÙỦŨỤỨỪỬỮỰÝỲỶỸỴ̣̀́̃̉]/u;

describe("i18n messages parity (MODEL003)", () => {
  it("English and Vietnamese messages have identical key sets (bidirectional)", () => {
    const enKeys = new Set(flattenKeys(enMessages));
    const viKeys = new Set(flattenKeys(viMessages));

    const enKeysArray = Array.from(enKeys).sort();
    const viKeysArray = Array.from(viKeys).sort();

    // Check keys in en but missing from vi
    const missingInVi = enKeysArray.filter((key) => !viKeys.has(key));
    // Check keys in vi but missing from en
    const missingInEn = viKeysArray.filter((key) => !enKeys.has(key));

    const errors = [];
    if (missingInVi.length > 0) {
      errors.push(
        `Keys in en.json but missing from vi.json:\n  ${missingInVi.join("\n  ")}`,
      );
    }
    if (missingInEn.length > 0) {
      errors.push(
        `Keys in vi.json but missing from en.json:\n  ${missingInEn.join("\n  ")}`,
      );
    }

    if (errors.length > 0) {
      throw new Error(errors.join("\n"));
    }
    expect(errors).toHaveLength(0);
  });

  it("English and Vietnamese messages have matching key count", () => {
    const enKeys = flattenKeys(enMessages);
    const viKeys = flattenKeys(viMessages);

    expect(viKeys.length).toBe(enKeys.length);
  });

  it("en.json has 0 leaves containing Vietnamese diacritics", () => {
    const enEntries = flattenEntries(enMessages);
    const offending = enEntries
      .filter(([, value]) => VI_DIACRITICS.test(value))
      .map(([key, value]) => `  ${key} = "${value}"`);

    if (offending.length > 0) {
      throw new Error(
        `en.json must be pure English, but found Vietnamese text in ${offending.length} leaf(ves):\n${offending.join("\n")}`,
      );
    }

    expect(offending).toHaveLength(0);
  });
});
