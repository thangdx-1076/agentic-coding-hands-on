import { createClient } from "@/lib/supabase/client";

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
   * PHẢI là đường dẫn nội bộ do chính code quyết định, không bao giờ lấy
   * thẳng từ query param của người dùng: giá trị này được nối trực tiếp
   * vào URL nên một caller bất cẩn sẽ mở đường cho open redirect. Nếu về
   * sau cần nhận `next` từ bên ngoài, cho nó đi qua cùng bộ kiểm tra mà
   * `lib/supabase/next-path.ts` đang dùng cho chiều đi vào.
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
        redirectTo: `${origin}/auth/callback?next=${next}`,
      },
    });
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}
