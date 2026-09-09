import { describe, expect, it } from "vitest";

import { formatRelativeTime } from "./relative-time";

const NOW = new Date("2026-09-09T12:00:00.000Z");

describe("formatRelativeTime", () => {
  it("biên giây (< 60s)", () => {
    const date = new Date(NOW.getTime() - 30 * 1000);
    expect(formatRelativeTime(date, NOW, "en")).toBe("30 seconds ago");
  });

  it("đúng 60 giây → chuyển sang bucket phút, không còn ở giây", () => {
    const date = new Date(NOW.getTime() - 60 * 1000);
    expect(formatRelativeTime(date, NOW, "en")).toBe("1 minute ago");
  });

  it("biên phút (< 60 phút)", () => {
    const date = new Date(NOW.getTime() - 5 * 60 * 1000);
    expect(formatRelativeTime(date, NOW, "en")).toBe("5 minutes ago");
  });

  it("đúng 60 phút → chuyển sang bucket giờ", () => {
    const date = new Date(NOW.getTime() - 60 * 60 * 1000);
    expect(formatRelativeTime(date, NOW, "en")).toBe("1 hour ago");
  });

  it("biên giờ (< 24 giờ)", () => {
    const date = new Date(NOW.getTime() - 5 * 60 * 60 * 1000);
    expect(formatRelativeTime(date, NOW, "en")).toBe("5 hours ago");
  });

  it("đúng 24 giờ → chuyển sang bucket ngày", () => {
    const date = new Date(NOW.getTime() - 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(date, NOW, "en")).toBe("yesterday");
  });

  it("biên ngày (nhiều ngày)", () => {
    const date = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(date, NOW, "en")).toBe("3 days ago");
  });

  it("thời điểm tương lai", () => {
    const date = new Date(NOW.getTime() + 5 * 60 * 1000);
    expect(formatRelativeTime(date, NOW, "en")).toBe("in 5 minutes");
  });

  it("nhận chuỗi ISO thay vì Date", () => {
    expect(formatRelativeTime("2026-09-09T11:59:30.000Z", NOW, "en")).toBe(
      "30 seconds ago",
    );
  });

  it("chuỗi ngày hỏng → chuỗi rỗng, không throw", () => {
    expect(formatRelativeTime("not-a-date", NOW, "en")).toBe("");
  });
});
