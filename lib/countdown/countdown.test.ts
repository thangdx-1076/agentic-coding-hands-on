import { describe, expect, it } from "vitest";

import { pad2, parseTargetDate, remaining } from "./countdown";

/**
 * ALG-001 / BR-004: pure calc only, no React, no timers. `parseTargetDate`
 * must never throw on hostile/absent env input (`EVENT_START_AT` is
 * server-only and unvalidated at the source) — every bad shape resolves to
 * `null`, never an exception.
 */
describe("parseTargetDate", () => {
  it("trả null khi không có giá trị (undefined)", () => {
    expect(parseTargetDate(undefined)).toBeNull();
  });

  it("trả null khi giá trị là null", () => {
    expect(parseTargetDate(null)).toBeNull();
  });

  it("trả null khi chuỗi rỗng", () => {
    expect(parseTargetDate("")).toBeNull();
  });

  it("trả null khi chuỗi không parse được thành ngày hợp lệ", () => {
    expect(parseTargetDate("not-a-date")).toBeNull();
  });

  it("trả Date khi ISO-8601 hợp lệ", () => {
    const result = parseTargetDate("2026-12-26T18:30:00+07:00");
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe("2026-12-26T11:30:00.000Z");
  });
});

describe("remaining", () => {
  it("còn 1 ngày 2 giờ 3 phút thì trả đúng days/hours/minutes, chưa reached", () => {
    const nowMs = Date.UTC(2026, 0, 1, 0, 0, 0);
    const target = new Date(nowMs + ((1 * 24 + 2) * 60 + 3) * 60_000);

    expect(remaining(target, nowMs)).toEqual({
      days: 1,
      hours: 2,
      minutes: 3,
      reached: false,
    });
  });

  it("đúng mốc thì mọi số về 0 và reached true", () => {
    const nowMs = Date.UTC(2026, 0, 1, 0, 0, 0);
    const target = new Date(nowMs);

    expect(remaining(target, nowMs)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      reached: true,
    });
  });

  it("đã qua mốc thì không âm, mọi số về 0 và reached true", () => {
    const nowMs = Date.UTC(2026, 0, 1, 0, 0, 0);
    const target = new Date(nowMs - 60_000 * 90); // 90 phút TRƯỚC nowMs

    expect(remaining(target, nowMs)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      reached: true,
    });
  });

  it("từ 100 ngày trở lên vẫn tính đúng days (không giới hạn 2 chữ số)", () => {
    const nowMs = Date.UTC(2026, 0, 1, 0, 0, 0);
    const target = new Date(nowMs + 123 * 24 * 60 * 60_000);

    expect(remaining(target, nowMs)).toEqual({
      days: 123,
      hours: 0,
      minutes: 0,
      reached: false,
    });
  });
});

describe("pad2", () => {
  it("0 → '00'", () => {
    expect(pad2(0)).toBe("00");
  });

  it("7 → '07'", () => {
    expect(pad2(7)).toBe("07");
  });

  it("123 → '123' (không cắt bớt số ≥100)", () => {
    expect(pad2(123)).toBe("123");
  });
});
