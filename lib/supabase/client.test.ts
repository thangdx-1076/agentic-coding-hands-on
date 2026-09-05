import { createBrowserClient } from "@supabase/ssr";
import { describe, expect, it, vi } from "vitest";

import { createClient } from "./client";

/**
 * `@supabase/ssr` bị mock toàn bộ ở ranh giới module — hàm này chỉ là một
 * lớp bọc mỏng, nên phần đáng khoá lại không phải "gọi được" mà là
 * `createBrowserClient` nhận đúng cặp (url, publishable key) đọc từ biến
 * môi trường, đúng thứ tự, đúng số lượng tham số, và giá trị trả về được
 * truyền nguyên vẹn ra ngoài. Giá trị môi trường đọc trực tiếp từ
 * `process.env` (đã set trong `vitest.config.ts`) thay vì hardcode lại, để
 * test không rời khỏi nguồn thật khi cấu hình đổi.
 */
vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn(),
}));

describe("createClient", () => {
  it("gọi createBrowserClient đúng 1 lần với (url, publishable key) từ env và trả nguyên client ra ngoài", () => {
    const fakeClient = {};
    vi.mocked(createBrowserClient).mockReturnValueOnce(
      fakeClient as unknown as ReturnType<typeof createBrowserClient>,
    );

    const client = createClient();

    expect(createBrowserClient).toHaveBeenCalledExactlyOnceWith(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );
    expect(client).toBe(fakeClient);
  });
});
