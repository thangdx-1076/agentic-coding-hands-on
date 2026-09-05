import { describe, expect, it } from "vitest";

import { normalizeLocale } from "./locale";

/**
 * `normalizeLocale` is the single choke point every locale-bearing input
 * (cookie value, Server Action argument) must pass through before it is
 * trusted — it enforces the {vi,en} whitelist and defends the dynamic
 * `import(messages/${locale}.json)` in `i18n/request.ts` against cookie
 * injection / path traversal (see clarifications.md § gap resolution).
 */
describe("normalizeLocale", () => {
  it("passes through the supported 'en' locale", () => {
    expect(normalizeLocale("en")).toBe("en");
  });

  it("passes through the supported 'vi' locale", () => {
    expect(normalizeLocale("vi")).toBe("vi");
  });

  it("falls back to 'vi' when the input is undefined", () => {
    expect(normalizeLocale(undefined)).toBe("vi");
  });

  it("falls back to 'vi' when the input is null", () => {
    expect(normalizeLocale(null)).toBe("vi");
  });

  it("falls back to 'vi' when the input is an empty string", () => {
    expect(normalizeLocale("")).toBe("vi");
  });

  it("falls back to 'vi' for an unsupported locale code", () => {
    expect(normalizeLocale("fr")).toBe("vi");
  });

  it("falls back to 'vi' for a case-mismatched locale (case-sensitive whitelist)", () => {
    expect(normalizeLocale("EN")).toBe("vi");
  });

  it("falls back to 'vi' for a malformed/injected cookie value", () => {
    expect(normalizeLocale("vi; en")).toBe("vi");
  });
});
