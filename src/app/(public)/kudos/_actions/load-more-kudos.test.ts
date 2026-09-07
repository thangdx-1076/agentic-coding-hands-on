import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadMoreKudos } from "./load-more-kudos";

import { getKudosBoard } from "@/dal/kudos";
import type { KudosBoard, KudosCard } from "@/dal/kudos";
import { createClient } from "@/lib/supabase/server";

/**
 * `@/dal/kudos` và `@/lib/supabase/server` được mock toàn bộ — cùng lý do
 * `toggle-kudo-heart.test.ts` đưa ra: `loadMoreKudos` chỉ cần biết
 * `getKudosBoard` trả gì (dữ liệu hay lỗi), một Supabase/DB thật không
 * thêm gì cho các nhánh thuần logic ở đây (đã có `getKudosBoard`'s own
 * test cho phần đó).
 */
vi.mock("@/dal/kudos", () => ({ getKudosBoard: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const VALID_CURSOR = "2025-10-30T10:00:00Z";

const SENDER: KudosCard["sender"] = {
  id: "sender-1",
  fullName: "Người gửi",
  avatarUrl: null,
  department: "CEVC10",
  kudosReceived: 12,
};

const CARD: KudosCard = {
  id: "kudo-1",
  content: "Cảm ơn bạn!",
  hashtags: ["#teamwork"],
  imageUrls: [],
  heartCount: 3,
  createdAt: "2025-10-29T10:00:00Z",
  sender: SENDER,
  receiver: { ...SENDER, id: "receiver-1", fullName: "Người nhận" },
};

function boardWithFeed(feed: KudosBoard["feed"]): KudosBoard {
  return {
    highlight: [],
    feed,
    spotlightTotal: 0,
    spotlightNames: [],
    filters: { hashtags: [], departments: [] },
  };
}

function stubSupabase() {
  vi.mocked(createClient).mockResolvedValue(
    {} as unknown as Awaited<ReturnType<typeof createClient>>,
  );
}

describe("loadMoreKudos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cursor hợp lệ → trả đúng board.feed từ getKudosBoard", async () => {
    stubSupabase();
    const feed: KudosBoard["feed"] = {
      items: [CARD],
      nextCursor: "2025-10-28T00:00:00Z",
    };
    vi.mocked(getKudosBoard).mockResolvedValueOnce(boardWithFeed(feed));

    const result = await loadMoreKudos({ cursor: VALID_CURSOR });

    expect(result).toEqual(feed);
    expect(getKudosBoard).toHaveBeenCalledExactlyOnceWith(expect.anything(), {
      cursor: VALID_CURSOR,
      hashtag: undefined,
      department: undefined,
    });
  });

  it("truyền hashtag/department tiếp cho getKudosBoard", async () => {
    stubSupabase();
    vi.mocked(getKudosBoard).mockResolvedValueOnce(
      boardWithFeed({ items: [], nextCursor: null }),
    );

    await loadMoreKudos({
      cursor: VALID_CURSOR,
      hashtag: "#teamwork",
      department: "CEVC10",
    });

    expect(getKudosBoard).toHaveBeenCalledExactlyOnceWith(expect.anything(), {
      cursor: VALID_CURSOR,
      hashtag: "#teamwork",
      department: "CEVC10",
    });
  });

  it("cursor rỗng → fail-open, không gọi getKudosBoard", async () => {
    const result = await loadMoreKudos({ cursor: "" });

    expect(result).toEqual({ items: [], nextCursor: null });
    expect(getKudosBoard).not.toHaveBeenCalled();
  });

  it("cursor sai định dạng (không phải ISO) → fail-open, không gọi getKudosBoard", async () => {
    const result = await loadMoreKudos({ cursor: "30/10/2025" });

    expect(result).toEqual({ items: [], nextCursor: null });
    expect(getKudosBoard).not.toHaveBeenCalled();
  });

  it("cursor đúng khuôn dạng nhưng ngày không tồn tại (tháng 13) → fail-open", async () => {
    const result = await loadMoreKudos({ cursor: "2025-13-01T00:00:00Z" });

    expect(result).toEqual({ items: [], nextCursor: null });
    expect(getKudosBoard).not.toHaveBeenCalled();
  });

  it("cursor không phải string ở runtime (bỏ qua kiểu TS) → fail-open", async () => {
    const result = await loadMoreKudos({
      cursor: 12345 as unknown as string,
    });

    expect(result).toEqual({ items: [], nextCursor: null });
    expect(getKudosBoard).not.toHaveBeenCalled();
  });

  it("createClient() ném lỗi → fail-open", async () => {
    vi.mocked(createClient).mockRejectedValueOnce(new Error("no cookies"));

    const result = await loadMoreKudos({ cursor: VALID_CURSOR });

    expect(result).toEqual({ items: [], nextCursor: null });
  });

  it("getKudosBoard ném lỗi (phòng hờ, dù DAL tự fail-open) → fail-open", async () => {
    stubSupabase();
    vi.mocked(getKudosBoard).mockRejectedValueOnce(new Error("boom"));

    const result = await loadMoreKudos({ cursor: VALID_CURSOR });

    expect(result).toEqual({ items: [], nextCursor: null });
  });
});
