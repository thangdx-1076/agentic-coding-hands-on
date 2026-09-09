import { describe, expect, it } from "vitest";

import {
  NOTIFICATION_TYPES,
  isNotificationType,
  parseNotificationPayload,
  type NotificationType,
} from "./types";

describe("isNotificationType", () => {
  it.each(NOTIFICATION_TYPES)("chấp nhận '%s'", (type) => {
    expect(isNotificationType(type)).toBe(true);
  });

  it("từ chối chuỗi lạ", () => {
    expect(isNotificationType("bogus_type")).toBe(false);
  });

  it("từ chối giá trị không phải string", () => {
    expect(isNotificationType(42)).toBe(false);
    expect(isNotificationType(null)).toBe(false);
    expect(isNotificationType(undefined)).toBe(false);
  });
});

describe("parseNotificationPayload", () => {
  it("kudos_received: đủ khoá → giữ nguyên", () => {
    expect(
      parseNotificationPayload("kudos_received", {
        kudosId: "k1",
        senderName: "Anna",
      }),
    ).toEqual({ kudosId: "k1", senderName: "Anna" });
  });

  it("kudos_received: senderName null (user thật không có full_name) → giữ null, không bịa", () => {
    expect(
      parseNotificationPayload("kudos_received", {
        kudosId: "k1",
        senderName: null,
      }),
    ).toEqual({ kudosId: "k1", senderName: null });
  });

  it("kudos_received: thiếu khoá → fallback rỗng/null, không throw", () => {
    expect(parseNotificationPayload("kudos_received", {})).toEqual({
      kudosId: "",
      senderName: null,
    });
  });

  it("kudos_received: senderName sai kiểu (number) → null", () => {
    expect(
      parseNotificationPayload("kudos_received", {
        kudosId: "k1",
        senderName: 123,
      }),
    ).toEqual({ kudosId: "k1", senderName: null });
  });

  it("heart_received: đủ khoá", () => {
    expect(
      parseNotificationPayload("heart_received", {
        kudosId: "k1",
        actorId: "u2",
        actorName: "Bình",
      }),
    ).toEqual({ kudosId: "k1", actorId: "u2", actorName: "Bình" });
  });

  it("heart_received: thiếu khoá → fallback", () => {
    expect(parseNotificationPayload("heart_received", {})).toEqual({
      kudosId: "",
      actorId: "",
      actorName: null,
    });
  });

  it("secret_box_available: đủ khoá", () => {
    expect(
      parseNotificationPayload("secret_box_available", {
        boxId: "b1",
        sourceKudosId: "k9",
      }),
    ).toEqual({ boxId: "b1", sourceKudosId: "k9" });
  });

  it("secret_box_available: sourceKudosId vắng mặt (optional) → null", () => {
    expect(
      parseNotificationPayload("secret_box_available", { boxId: "b1" }),
    ).toEqual({ boxId: "b1", sourceKudosId: null });
  });

  it("kudos_hidden: đủ khoá", () => {
    expect(parseNotificationPayload("kudos_hidden", { kudosId: "k1" })).toEqual(
      { kudosId: "k1" },
    );
  });

  it("kudos_hidden: thiếu khoá → fallback rỗng", () => {
    expect(parseNotificationPayload("kudos_hidden", {})).toEqual({
      kudosId: "",
    });
  });

  it("raw không phải object (null/array/string/number) → coi như rỗng, không throw", () => {
    expect(parseNotificationPayload("kudos_hidden", null)).toEqual({
      kudosId: "",
    });
    expect(parseNotificationPayload("kudos_hidden", [1, 2])).toEqual({
      kudosId: "",
    });
    expect(parseNotificationPayload("kudos_hidden", "oops")).toEqual({
      kudosId: "",
    });
    expect(parseNotificationPayload("kudos_hidden", 5)).toEqual({
      kudosId: "",
    });
  });

  it("type không thuộc 4 giá trị (ép kiểu để mô phỏng dữ liệu hỏng) → throw", () => {
    expect(() =>
      parseNotificationPayload("bogus" as unknown as NotificationType, {}),
    ).toThrow();
  });
});
