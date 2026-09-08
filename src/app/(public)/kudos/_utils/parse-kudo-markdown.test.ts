import { describe, expect, it } from "vitest";

import { parseKudoMarkdown } from "./parse-kudo-markdown";

describe("parseKudoMarkdown", () => {
  it("chuỗi rỗng → []", () => {
    expect(parseKudoMarkdown("")).toEqual([]);
  });

  it("text thuần, không marker nào → một node text", () => {
    expect(parseKudoMarkdown("Cảm ơn bạn")).toEqual([
      { type: "text", text: "Cảm ơn bạn" },
    ]);
  });

  it("**a** → node bold", () => {
    expect(parseKudoMarkdown("**a**")).toEqual([
      { type: "bold", children: [{ type: "text", text: "a" }] },
    ]);
  });

  it("*a* → node italic", () => {
    expect(parseKudoMarkdown("*a*")).toEqual([
      { type: "italic", children: [{ type: "text", text: "a" }] },
    ]);
  });

  it("~~a~~ → node strike", () => {
    expect(parseKudoMarkdown("~~a~~")).toEqual([
      { type: "strike", children: [{ type: "text", text: "a" }] },
    ]);
  });

  it("lồng **a *b* c** → bold chứa text + italic + text", () => {
    expect(parseKudoMarkdown("**a *b* c**")).toEqual([
      {
        type: "bold",
        children: [
          { type: "text", text: "a " },
          { type: "italic", children: [{ type: "text", text: "b" }] },
          { type: "text", text: " c" },
        ],
      },
    ]);
  });

  it("marker lẻ **a (không đóng) → giữ nguyên dạng text thô, không throw", () => {
    expect(parseKudoMarkdown("**a")).toEqual([{ type: "text", text: "**a" }]);
  });

  it("marker lẻ *a (không đóng) → text thô", () => {
    expect(parseKudoMarkdown("*a")).toEqual([{ type: "text", text: "*a" }]);
  });

  it("1. Điểm 1 → node listItem", () => {
    expect(parseKudoMarkdown("1. Điểm 1")).toEqual([
      { type: "listItem", children: [{ type: "text", text: "Điểm 1" }] },
    ]);
  });

  it("> Đây là quote → node quote", () => {
    expect(parseKudoMarkdown("> Đây là quote")).toEqual([
      { type: "quote", children: [{ type: "text", text: "Đây là quote" }] },
    ]);
  });

  it("listItem vẫn parse inline marker bên trong (1. **abc**)", () => {
    expect(parseKudoMarkdown("1. **abc**")).toEqual([
      {
        type: "listItem",
        children: [{ type: "bold", children: [{ type: "text", text: "abc" }] }],
      },
    ]);
  });

  it("quote vẫn parse inline marker bên trong (> *abc*)", () => {
    expect(parseKudoMarkdown("> *abc*")).toEqual([
      {
        type: "quote",
        children: [
          { type: "italic", children: [{ type: "text", text: "abc" }] },
        ],
      },
    ]);
  });

  it("\\n giữa 2 dòng → chèn node lineBreak, không gộp thành 1 dòng", () => {
    expect(parseKudoMarkdown("Điểm 1\nĐiểm 2")).toEqual([
      { type: "text", text: "Điểm 1" },
      { type: "lineBreak" },
      { type: "text", text: "Điểm 2" },
    ]);
  });

  it("nhiều dòng '1. ' liên tiếp → mỗi dòng một listItem, tách bởi lineBreak", () => {
    expect(parseKudoMarkdown("1. Điểm 1\n1. Điểm 2")).toEqual([
      { type: "listItem", children: [{ type: "text", text: "Điểm 1" }] },
      { type: "lineBreak" },
      { type: "listItem", children: [{ type: "text", text: "Điểm 2" }] },
    ]);
  });

  it("[x](https://example.com) → node link với href và children text", () => {
    expect(parseKudoMarkdown("[x](https://example.com)")).toEqual([
      {
        type: "link",
        href: "https://example.com",
        children: [{ type: "text", text: "x" }],
      },
    ]);
  });

  it("[x](http://example.com) → http thường (không chỉ https) cũng hợp lệ", () => {
    expect(parseKudoMarkdown("[x](http://example.com)")).toEqual([
      {
        type: "link",
        href: "http://example.com",
        children: [{ type: "text", text: "x" }],
      },
    ]);
  });

  it("[x](javascript:alert(1)) → scheme không phải http(s) → hạ về text thô, không tạo link", () => {
    expect(parseKudoMarkdown("[x](javascript:alert(1))")).toEqual([
      { type: "text", text: "[x](javascript:alert(1))" },
    ]);
  });

  it("[x](/duong-dan-noi-bo) → đường dẫn tương đối cũng không phải http(s) → text thô", () => {
    expect(parseKudoMarkdown("[x](/duong-dan-noi-bo)")).toEqual([
      { type: "text", text: "[x](/duong-dan-noi-bo)" },
    ]);
  });

  it("[x thiếu dấu ] đóng → text thô", () => {
    expect(parseKudoMarkdown("[x thiếu")).toEqual([
      { type: "text", text: "[x thiếu" },
    ]);
  });

  it("[x] thiếu cặp (url) → text thô", () => {
    expect(parseKudoMarkdown("[x] còn lại")).toEqual([
      { type: "text", text: "[x] còn lại" },
    ]);
  });

  it("[x](https://example.com thiếu dấu ) đóng → text thô", () => {
    expect(parseKudoMarkdown("[x](https://example.com không đóng")).toEqual([
      { type: "text", text: "[x](https://example.com không đóng" },
    ]);
  });

  it("kết hợp bold + link + xuống dòng trong cùng nội dung", () => {
    expect(
      parseKudoMarkdown("**Cảm ơn** [đọc thêm](https://example.com)\nDòng 2"),
    ).toEqual([
      { type: "bold", children: [{ type: "text", text: "Cảm ơn" }] },
      { type: "text", text: " " },
      {
        type: "link",
        href: "https://example.com",
        children: [{ type: "text", text: "đọc thêm" }],
      },
      { type: "lineBreak" },
      { type: "text", text: "Dòng 2" },
    ]);
  });
});
