import { createClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/supabase/next-path";

export type SignInWithGoogleOptions = {
  /**
   * Origin tuyệt đối của trang hiện tại (`window.location.origin`).
   *
   * Truyền vào thay vì đọc `window` ở đây: giữ module này không phụ thuộc
   * DOM, nên caller nào cũng dùng được và test không cần dựng browser.
   */
  origin: string;
  /**
   * Đường dẫn quay về sau khi callback đổi code lấy session.
   *
   * Giá trị luôn đi qua `safeNextPath` trước khi được nối vào URL, nên một
   * caller truyền nhầm dữ liệu người dùng vào đây cũng không mở được open
   * redirect — thứ không hợp lệ sẽ rơi về `/`. Đây là cùng bộ kiểm tra
   * mà `/auth/callback` dùng cho chiều đi vào; ràng buộc nằm ở code, không
   * nằm ở lời dặn trong comment.
   */
  next: string;
};

export type SignInWithGoogleResult = {
  /**
   * `false` khi Supabase trả lỗi hoặc ném exception. Thành công thì trình
   * duyệt đang trên đường điều hướng sang trang authorize của Google —
   * caller không nên coi `true` là "đã xong", mà là "đã bàn giao".
   */
  ok: boolean;
};

/**
 * Khởi động luồng Google OAuth qua Supabase.
 *
 * Nuốt lỗi và quy về một cờ boolean có chủ đích: phía UI chỉ hiển thị một
 * dòng thông báo cố định đã dịch sẵn, không bao giờ render nội dung lỗi
 * thô từ nhà cung cấp ra trang.
 */
export async function signInWithGoogle({
  origin,
  next,
}: SignInWithGoogleOptions): Promise<SignInWithGoogleResult> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${safeNextPath(next)}`,
      },
    });
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}
