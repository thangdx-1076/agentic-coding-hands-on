import { describe, expect, it } from "vitest";

import { decodeCursor, encodeCursor } from "./cursor";

describe("encodeCursor / decodeCursor", () => {
  it("round-trip giữ nguyên giá trị", () => {
    const cursor = { createdAt: "2026-09-09T10:00:00.000Z", id: "abc-123" };
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it("round-trip với độ dài id khác nhau (bao các mức padding base64 khác nhau)", () => {
    for (const id of ["a", "ab", "abc", "abcd", "abcde"]) {
      const cursor = { createdAt: "2026-01-01T00:00:00.000Z", id };
      expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
    }
  });

  it("chuỗi mã hoá là base64url thật (không có +, /, =)", () => {
    const encoded = encodeCursor({
      createdAt: "2026-09-09T10:00:00.000Z",
      id: "abc-123",
    });
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it("cursor undefined/null/rỗng → trang đầu (null)", () => {
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor("")).toBeNull();
  });

  it("base64 không hợp lệ (ký tự lạ) → null, không throw", () => {
    expect(decodeCursor("!!!not-base64!!!")).toBeNull();
  });

  it("base64 hợp lệ nhưng JSON hỏng → null", () => {
    const brokenJson = btoa("{not valid json");
    expect(decodeCursor(brokenJson)).toBeNull();
  });

  it("JSON hợp lệ nhưng là primitive (không phải object) → null", () => {
    expect(decodeCursor(btoa(JSON.stringify("just a string")))).toBeNull();
    expect(decodeCursor(btoa(JSON.stringify(42)))).toBeNull();
  });

  it("JSON là object nhưng thiếu 'id' → null", () => {
    expect(
      decodeCursor(btoa(JSON.stringify({ createdAt: "2026-01-01" }))),
    ).toBeNull();
  });

  it("JSON là object nhưng thiếu 'createdAt' → null", () => {
    expect(decodeCursor(btoa(JSON.stringify({ id: "abc" })))).toBeNull();
  });

  it("JSON có đủ khoá nhưng sai kiểu → null", () => {
    expect(
      decodeCursor(btoa(JSON.stringify({ createdAt: 123, id: "abc" }))),
    ).toBeNull();
  });
});
