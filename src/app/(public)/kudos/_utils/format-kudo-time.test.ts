import { describe, expect, it } from "vitest";

import { formatKudoTime } from "./format-kudo-time";

describe("formatKudoTime", () => {
  it("định dạng đúng HH:mm - MM/DD/YYYY (thứ tự tháng/ngày kiểu Mỹ)", () => {
    expect(formatKudoTime("2025-10-30T10:00:00Z")).toBe("10:00 - 10/30/2025");
  });

  it("đệm số 0 cho giờ/phút/tháng/ngày một chữ số", () => {
    expect(formatKudoTime("2025-01-05T09:05:00Z")).toBe("09:05 - 01/05/2025");
  });

  it("nửa đêm hiện đúng 00:00", () => {
    expect(formatKudoTime("2025-10-30T00:00:00Z")).toBe("00:00 - 10/30/2025");
  });

  it("không phụ thuộc offset — dùng đúng thời điểm UTC được truyền vào", () => {
    expect(formatKudoTime("2025-10-30T10:00:00.000Z")).toBe(
      "10:00 - 10/30/2025",
    );
  });

  it("chuỗi rác trả về rỗng, không throw", () => {
    expect(formatKudoTime("not-a-timestamp")).toBe("");
  });

  it("chuỗi rỗng trả về rỗng, không throw", () => {
    expect(formatKudoTime("")).toBe("");
  });
});
