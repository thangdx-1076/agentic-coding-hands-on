import { describe, expect, it } from "vitest";

import { decodeCursor, encodeCursor } from "./cursor";

describe("encodeCursor / decodeCursor", () => {
  it("round-trip giữ nguyên giá trị", () => {
    const cursor = {
      createdAt: "2026-09-09T10:00:00.000Z",
      id: "11111111-2222-4333-8444-555555555555",
    };
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it("round-trip qua đủ các mức padding base64", () => {
    // `id` là UUID nên độ dài cố định — trục biến thiên phải là `createdAt`,
    // và các dạng ISO dưới đây có độ dài khác nhau nên phủ cả 3 mức padding.
    const id = "11111111-2222-4333-8444-555555555555";
    for (const createdAt of [
      "2026-01-01T00:00:00Z",
      "2026-01-01T00:00:00.0Z",
      "2026-01-01T00:00:00.00Z",
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:00:00.000+07:00",
    ]) {
      const cursor = { createdAt, id };
      expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
    }
  });

  it("cursor bị sửa tay mang ký tự cấu trúc PostgREST → null", () => {
    // `,` và `)` là ký tự cấu trúc trong filter `.or(...)`. Một cursor tự chế
    // mang chúng phải bị chặn ở biên, không được đi tiếp vào chuỗi truy vấn.
    for (const bad of [
      { createdAt: "2026-01-01T00:00:00Z", id: "abc,def" },
      { createdAt: "2026-01-01T00:00:00Z", id: "x),and(1.eq.1" },
      {
        createdAt: "2026-01-01),and(id.eq.x",
        id: "11111111-2222-4333-8444-555555555555",
      },
      { createdAt: "2026-01-01T00:00:00Z", id: "not-a-uuid-at-all" },
    ]) {
      expect(decodeCursor(btoa(JSON.stringify(bad)))).toBeNull();
    }
  });

  it("chuỗi mã hoá là base64url thật (không có +, /, =)", () => {
    const encoded = encodeCursor({
      createdAt: "2026-09-09T10:00:00.000Z",
      id: "11111111-2222-4333-8444-555555555555",
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
