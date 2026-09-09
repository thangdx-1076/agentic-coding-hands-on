import { describe, expect, it } from "vitest";

import {
  formatNotificationMessage,
  type NotificationMessageTemplates,
} from "./notification-message";

import type { NotificationRow } from "@/domain/notifications/types";

const TEMPLATES: NotificationMessageTemplates = {
  kudos_received: "**{senderName}** đã gửi Kudos cho bạn",
  heart_received: "**{actorName}** đã thả tim Kudos của bạn",
  secret_box_available: "Bạn có một Hộp bí mật mới, mở ngay nhé!",
  kudos_hidden:
    "Kudos của bạn đã bị ẩn do vi phạm <link>Tiêu chuẩn cộng đồng ↗</link>",
};

function makeRow(overrides: Partial<NotificationRow>): NotificationRow {
  return {
    id: "n-1",
    type: "kudos_received",
    payload: {},
    isRead: false,
    createdAt: "2026-09-09T00:00:00Z",
    ...overrides,
  };
}

describe("formatNotificationMessage", () => {
  it("kudos_received với senderName thật → tên nằm trong segment bold", () => {
    const row = makeRow({
      type: "kudos_received",
      payload: { kudosId: "k-1", senderName: "Nguyễn Văn A" },
    });

    expect(formatNotificationMessage(TEMPLATES, row)).toEqual([
      { type: "bold", value: "Nguyễn Văn A" },
      { type: "text", value: " đã gửi Kudos cho bạn" },
    ]);
  });

  it("kudos_received với senderName null → fallback 'Sunner' (TC-010b)", () => {
    const row = makeRow({
      type: "kudos_received",
      payload: { kudosId: "k-1", senderName: null },
    });

    expect(formatNotificationMessage(TEMPLATES, row)).toEqual([
      { type: "bold", value: "Sunner" },
      { type: "text", value: " đã gửi Kudos cho bạn" },
    ]);
  });

  it("heart_received với actorName thật → tên nằm trong segment bold", () => {
    const row = makeRow({
      type: "heart_received",
      payload: { kudosId: "k-1", actorId: "a-1", actorName: "Trần Thị B" },
    });

    expect(formatNotificationMessage(TEMPLATES, row)).toEqual([
      { type: "bold", value: "Trần Thị B" },
      { type: "text", value: " đã thả tim Kudos của bạn" },
    ]);
  });

  it("heart_received với actorName null → fallback 'Sunner'", () => {
    const row = makeRow({
      type: "heart_received",
      payload: { kudosId: "k-1", actorId: "a-1", actorName: null },
    });

    expect(formatNotificationMessage(TEMPLATES, row)).toEqual([
      { type: "bold", value: "Sunner" },
      { type: "text", value: " đã thả tim Kudos của bạn" },
    ]);
  });

  it("secret_box_available không có placeholder → giữ nguyên template, không có segment bold", () => {
    const row = makeRow({
      type: "secret_box_available",
      payload: { boxId: "b-1", sourceKudosId: null },
    });

    expect(formatNotificationMessage(TEMPLATES, row)).toEqual([
      { type: "text", value: "Bạn có một Hộp bí mật mới, mở ngay nhé!" },
    ]);
  });

  it("kudos_hidden → tách đúng segment text + link, không có segment bold", () => {
    const row = makeRow({
      type: "kudos_hidden",
      payload: { kudosId: "k-1" },
    });

    expect(formatNotificationMessage(TEMPLATES, row)).toEqual([
      { type: "text", value: "Kudos của bạn đã bị ẩn do vi phạm " },
      { type: "link", value: "Tiêu chuẩn cộng đồng ↗" },
    ]);
  });

  it("nhiều đoạn bold trong cùng một template → tách đủ từng đoạn", () => {
    const templates: NotificationMessageTemplates = {
      ...TEMPLATES,
      kudos_received: "**{senderName}** vừa **gửi Kudos** cho bạn",
    };
    const row = makeRow({
      type: "kudos_received",
      payload: { kudosId: "k-1", senderName: "An" },
    });

    expect(formatNotificationMessage(templates, row)).toEqual([
      { type: "bold", value: "An" },
      { type: "text", value: " vừa " },
      { type: "bold", value: "gửi Kudos" },
      { type: "text", value: " cho bạn" },
    ]);
  });

  it("template không có bold cũng không có link → một segment text duy nhất", () => {
    const templates: NotificationMessageTemplates = {
      ...TEMPLATES,
      secret_box_available: "Không có định dạng gì cả",
    };
    const row = makeRow({
      type: "secret_box_available",
      payload: { boxId: "b-1", sourceKudosId: null },
    });

    expect(formatNotificationMessage(templates, row)).toEqual([
      { type: "text", value: "Không có định dạng gì cả" },
    ]);
  });
});
