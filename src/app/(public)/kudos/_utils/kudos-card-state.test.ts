import { describe, expect, it } from "vitest";

import {
  deriveKudosCardState,
  type HeartOverride,
  type KudosHeartContext,
} from "./kudos-card-state";

import type { KudosCard as KudosCardModel } from "@/dal/kudos";

const VIEWER_ID = "viewer-1";

function makeCard(senderId: string): KudosCardModel {
  const person = {
    id: senderId,
    fullName: "Sender",
    avatarUrl: null,
    department: "Dev",
    kudosReceived: 3,
  };
  return {
    id: "kudo-1",
    content: "Cảm ơn bạn",
    hashtags: [],
    imageUrls: [],
    heartCount: 7,
    createdAt: "2026-09-07T00:00:00Z",
    sender: person,
    receiver: { ...person, id: "receiver-1" },
  };
}

function makeContext(
  overrides: Partial<KudosHeartContext> = {},
): KudosHeartContext {
  return {
    viewerId: VIEWER_ID,
    heartedIds: new Set<string>(),
    overrides: {},
    signInTitle: "Đăng nhập để thả tim",
    ...overrides,
  };
}

describe("deriveKudosCardState", () => {
  it("khách chưa đăng nhập → tim bị khoá kèm title mời đăng nhập (C22)", () => {
    const state = deriveKudosCardState(
      makeCard("someone-else"),
      makeContext({ viewerId: null }),
    );

    expect(state.heartDisabled).toBe(true);
    expect(state.heartTitle).toBe("Đăng nhập để thả tim");
    expect(state.isOwnKudo).toBe(false);
  });

  it("kudo do chính mình gửi → khoá tim, KHÔNG có title (C26)", () => {
    const state = deriveKudosCardState(makeCard(VIEWER_ID), makeContext());

    expect(state.isOwnKudo).toBe(true);
    expect(state.heartDisabled).toBe(true);
    expect(state.heartTitle).toBeUndefined();
  });

  it("kudo của người khác, đã đăng nhập → tim mở, không title", () => {
    const state = deriveKudosCardState(makeCard("someone-else"), makeContext());

    expect(state.heartDisabled).toBe(false);
    expect(state.heartTitle).toBeUndefined();
    expect(state.isOwnKudo).toBe(false);
  });

  it("id nằm trong heartedIds (server xác thực) → hearted true, count giữ nguyên", () => {
    const card = makeCard("someone-else");
    const state = deriveKudosCardState(
      card,
      makeContext({ heartedIds: new Set([card.id]) }),
    );

    expect(state.hearted).toBe(true);
    expect(state.heartCount).toBe(7);
  });

  it("không có override, không nằm trong heartedIds → đọc thẳng từ card", () => {
    const state = deriveKudosCardState(makeCard("someone-else"), makeContext());

    expect(state.hearted).toBe(false);
    expect(state.heartCount).toBe(7);
  });

  it("override thắng cả heartedIds lẫn heartCount của card", () => {
    const card = makeCard("someone-else");
    const override: HeartOverride = { hearted: false, heartCount: 42 };
    const state = deriveKudosCardState(
      card,
      makeContext({
        heartedIds: new Set([card.id]),
        overrides: { [card.id]: override },
      }),
    );

    expect(state.hearted).toBe(false);
    expect(state.heartCount).toBe(42);
  });
});
