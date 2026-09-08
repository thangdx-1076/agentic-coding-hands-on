import { describe, expect, it } from "vitest";

import { insertMarkdownMarker } from "./insert-markdown-marker";

describe("insertMarkdownMarker", () => {
  it("bold có bôi đen → bọc **…** quanh vùng chọn, selection giữ trên nội dung gốc (ID-27, C09)", () => {
    const result = insertMarkdownMarker("Cảm ơn bạn", 0, 10, "bold");

    expect(result).toEqual({
      value: "**Cảm ơn bạn**",
      selectionStart: 2,
      selectionEnd: 12,
    });
  });

  it("italic có bôi đen → bọc *…* (ID-28)", () => {
    const result = insertMarkdownMarker("Cảm ơn bạn", 0, 10, "italic");

    expect(result).toEqual({
      value: "*Cảm ơn bạn*",
      selectionStart: 1,
      selectionEnd: 11,
    });
  });

  it("strike có bôi đen → bọc ~~…~~ (ID-29)", () => {
    const result = insertMarkdownMarker("Cảm ơn bạn", 0, 10, "strike");

    expect(result).toEqual({
      value: "~~Cảm ơn bạn~~",
      selectionStart: 2,
      selectionEnd: 12,
    });
  });

  it("bold không bôi đen → chèn cặp marker, con trỏ nằm giữa", () => {
    const result = insertMarkdownMarker("abc", 1, 1, "bold");

    expect(result).toEqual({
      value: "a****bc",
      selectionStart: 3,
      selectionEnd: 3,
    });
  });

  it("number chèn ở đầu dòng chứa con trỏ, dịch selection theo độ dài prefix (ID-30)", () => {
    const result = insertMarkdownMarker("abc\ndef", 5, 5, "number");

    expect(result).toEqual({
      value: "abc\n1. def",
      selectionStart: 8,
      selectionEnd: 8,
    });
  });

  it("number chèn hai lần trên cùng một dòng → không nhân đôi prefix", () => {
    const firstPass = insertMarkdownMarker("abc\ndef", 5, 5, "number");
    const secondPass = insertMarkdownMarker(
      firstPass.value,
      firstPass.selectionStart,
      firstPass.selectionEnd,
      "number",
    );

    expect(secondPass).toEqual(firstPass);
  });

  it("quote chèn ở đầu dòng chứa con trỏ (ID-32)", () => {
    const result = insertMarkdownMarker("abc\ndef", 5, 5, "quote");

    expect(result).toEqual({
      value: "abc\n> def",
      selectionStart: 7,
      selectionEnd: 7,
    });
  });

  it("quote chèn hai lần trên cùng một dòng → không nhân đôi prefix", () => {
    const firstPass = insertMarkdownMarker("abc\ndef", 5, 5, "quote");
    const secondPass = insertMarkdownMarker(
      firstPass.value,
      firstPass.selectionStart,
      firstPass.selectionEnd,
      "quote",
    );

    expect(secondPass).toEqual(firstPass);
  });

  it("quote áp dụng đúng dòng đầu tiên khi con trỏ ở dòng đầu, không đụng dòng sau", () => {
    const result = insertMarkdownMarker("abc\ndef", 1, 1, "quote");

    expect(result).toEqual({
      value: "> abc\ndef",
      selectionStart: 3,
      selectionEnd: 3,
    });
  });

  it("link có bôi đen → [selected](url), selection phủ lại đúng phần text (ID-31)", () => {
    const result = insertMarkdownMarker(
      "Thanks abc",
      7,
      10,
      "link",
      "https://example.com",
    );

    expect(result).toEqual({
      value: "Thanks [abc](https://example.com)",
      selectionStart: 8,
      selectionEnd: 11,
    });
  });

  it("link không bôi đen → chèn [text](url), selection phủ từ 'text'", () => {
    const result = insertMarkdownMarker(
      "Thanks ",
      7,
      7,
      "link",
      "https://example.com",
    );

    expect(result).toEqual({
      value: "Thanks [text](https://example.com)",
      selectionStart: 8,
      selectionEnd: 12,
    });
  });

  it("link với url rỗng (hộp thoại bị huỷ) → không đổi gì", () => {
    const result = insertMarkdownMarker("Thanks abc", 7, 10, "link", "");

    expect(result).toEqual({
      value: "Thanks abc",
      selectionStart: 7,
      selectionEnd: 10,
    });
  });

  it("link không truyền url → coi như rỗng, không đổi gì", () => {
    const result = insertMarkdownMarker("Thanks abc", 7, 10, "link");

    expect(result).toEqual({
      value: "Thanks abc",
      selectionStart: 7,
      selectionEnd: 10,
    });
  });

  it("link với linkText (có bôi đen) → thay [start,end) bằng [linkText](url), caret collapsed sau ')' (dialog Thêm đường dẫn)", () => {
    const result = insertMarkdownMarker(
      "Thanks abc",
      7,
      10,
      "link",
      "https://example.com",
      "Sample Link",
    );

    expect(result).toEqual({
      value: "Thanks [Sample Link](https://example.com)",
      selectionStart: 41,
      selectionEnd: 41,
    });
  });

  it("link với linkText (selection 'hello' đầu chuỗi, TC L09) → thay [0,5) bằng [hello](url), con trỏ sau ')', giữ nguyên phần đuôi ' world'", () => {
    const result = insertMarkdownMarker(
      "hello world",
      0,
      5,
      "link",
      "https://a.com/x",
      "hello",
    );

    expect(result).toEqual({
      value: "[hello](https://a.com/x) world",
      selectionStart: 24,
      selectionEnd: 24,
    });
  });
});
