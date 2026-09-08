import { describe, expect, it } from "vitest";

import { validateLinkDraft, validateLinkUrl } from "./validate-link-draft";

const VALID_TEXT = "Sample Link";
const VALID_URL = "https://www.example.com";
/** Exactly 2048 chars after `trim()` — the C row's upper bound (aad5791a). */
const URL_2048 = "https://a.com/" + "x".repeat(2048 - "https://a.com/".length);
const URL_2049 = `${URL_2048}x`;

describe("validateLinkDraft", () => {
  it("cả 2 trường hợp lệ → không có lỗi nào (BR-007, BR-008)", () => {
    expect(validateLinkDraft({ text: VALID_TEXT, url: VALID_URL })).toEqual({});
  });

  it("text rỗng → errorRequired", () => {
    expect(validateLinkDraft({ text: "", url: VALID_URL })).toEqual({
      text: "errorRequired",
    });
  });

  it("text chỉ khoảng trắng → errorRequired (L05)", () => {
    expect(validateLinkDraft({ text: "   ", url: VALID_URL })).toEqual({
      text: "errorRequired",
    });
  });

  it("text đúng 100 ký tự → không lỗi text (biên dưới errorTextTooLong, L06)", () => {
    const text100 = "a".repeat(100);
    expect(validateLinkDraft({ text: text100, url: VALID_URL })).toEqual({});
  });

  it("text 100 ký tự + khoảng trắng đầu/cuối → không lỗi (đo trên trim)", () => {
    const padded = "  " + "a".repeat(100) + " ";
    expect(validateLinkDraft({ text: padded, url: VALID_URL })).toEqual({});
  });

  it("text 101 ký tự → errorTextTooLong (L06)", () => {
    const text101 = "a".repeat(101);
    expect(validateLinkDraft({ text: text101, url: VALID_URL })).toEqual({
      text: "errorTextTooLong",
    });
  });

  it("url rỗng → errorRequired", () => {
    expect(validateLinkDraft({ text: VALID_TEXT, url: "" })).toEqual({
      url: "errorRequired",
    });
  });

  it("url 'www' (3 ký tự, dưới 5) → errorUrlLength (L07)", () => {
    expect(validateLinkDraft({ text: VALID_TEXT, url: "www" })).toEqual({
      url: "errorUrlLength",
    });
  });

  it("url đúng 2048 ký tự và hợp lệ → không lỗi url (biên trên)", () => {
    expect(validateLinkDraft({ text: VALID_TEXT, url: URL_2048 })).toEqual({});
  });

  it("url 2049 ký tự → errorUrlLength (vượt biên trên)", () => {
    expect(validateLinkDraft({ text: VALID_TEXT, url: URL_2049 })).toEqual({
      url: "errorUrlLength",
    });
  });

  it("url không parse được ('invalid-url') → errorUrlInvalid (L07)", () => {
    expect(validateLinkDraft({ text: VALID_TEXT, url: "invalid-url" })).toEqual(
      {
        url: "errorUrlInvalid",
      },
    );
  });

  it("url scheme javascript: → errorUrlInvalid (parse được nhưng protocol không nằm trong whitelist)", () => {
    expect(
      validateLinkDraft({ text: VALID_TEXT, url: "javascript:alert(1)" }),
    ).toEqual({ url: "errorUrlInvalid" });
  });

  it("url scheme ftp: → errorUrlInvalid (L07)", () => {
    expect(
      validateLinkDraft({ text: VALID_TEXT, url: "ftp://x.com/abc" }),
    ).toEqual({ url: "errorUrlInvalid" });
  });

  it("url 'http://a' (host một nhãn, không TLD) → hợp lệ, không lỗi", () => {
    expect(validateLinkDraft({ text: VALID_TEXT, url: "http://a" })).toEqual(
      {},
    );
  });

  it("cả 2 trường trống → cả 2 lỗi cùng lúc (L04)", () => {
    expect(validateLinkDraft({ text: "", url: "" })).toEqual({
      text: "errorRequired",
      url: "errorRequired",
    });
  });
});

describe("validateLinkUrl", () => {
  it("hợp lệ → undefined (dùng cho onBlur)", () => {
    expect(validateLinkUrl(VALID_URL)).toBeUndefined();
  });

  it("rỗng → errorRequired", () => {
    expect(validateLinkUrl("   ")).toBe("errorRequired");
  });

  it("dưới 5 ký tự → errorUrlLength", () => {
    expect(validateLinkUrl("www")).toBe("errorUrlLength");
  });

  it("trên 2048 ký tự → errorUrlLength", () => {
    expect(validateLinkUrl(URL_2049)).toBe("errorUrlLength");
  });

  it("không parse được → errorUrlInvalid", () => {
    expect(validateLinkUrl("invalid-url")).toBe("errorUrlInvalid");
  });

  it("protocol ngoài whitelist → errorUrlInvalid", () => {
    expect(validateLinkUrl("ftp://x.com/abc")).toBe("errorUrlInvalid");
  });
});
