import { getAnonKey, getServiceRoleKey, getSupabaseUrl } from "./service-role";

/**
 * Tạo kudo / thả tim / bỏ tim qua PostgREST bằng JWT của CHÍNH người dùng.
 *
 * Vì sao không dùng service role: emitter của F012 là trigger trên
 * `public.kudos` và `public.kudo_hearts`. Muốn chứng minh trigger chạy đúng
 * thì phải đi qua đúng con đường mà người dùng thật đi — tức là dưới RLS,
 * với `auth.uid()` là người gửi. Ghi bằng service role sẽ bỏ qua RLS và
 * `auth.uid()` là NULL, nên test sẽ không chứng minh được gì về đường thật.
 *
 * Mọi hàm ở đây NÉM khi thất bại. Không nuốt lỗi — cleanup/seed im lặng là
 * cách repo này từng rò 2 499 user rác.
 */

type Session = { access_token: string; user_id: string };

function anonKey(): string {
  const key = getAnonKey();
  if (!key) {
    throw new Error(
      "Không lấy được anon key (env hoặc `supabase status`) — Supabase local đã chạy chưa?",
    );
  }
  return key;
}

function userHeaders(session: Session): Record<string, string> {
  return {
    apikey: anonKey(),
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

async function expectOk(response: Response, what: string): Promise<void> {
  if (!response.ok) {
    throw new Error(
      `${what} thất bại: ${response.status} ${response.statusText}\n${await response.text()}`,
    );
  }
}

/** Gửi một kudo với tư cách `sender`. Trả về id của kudo vừa tạo. */
export async function createKudoAs(
  sender: Session,
  opts: {
    receiverId: string;
    content?: string;
    isAnonymous?: boolean;
    anonymousName?: string | null;
  },
): Promise<string> {
  const response = await fetch(`${getSupabaseUrl()}/rest/v1/kudos`, {
    method: "POST",
    headers: { ...userHeaders(sender), Prefer: "return=representation" },
    body: JSON.stringify({
      sender_id: sender.user_id,
      receiver_id: opts.receiverId,
      content: opts.content ?? "Cảm ơn bạn rất nhiều!",
      is_anonymous: opts.isAnonymous ?? false,
      anonymous_name: opts.anonymousName ?? null,
    }),
  });
  await expectOk(response, "Tạo kudo");
  const rows = (await response.json()) as Array<{ id: string }>;
  if (rows.length !== 1) {
    throw new Error(`Tạo kudo: mong đợi 1 dòng, nhận ${rows.length}`);
  }
  return rows[0].id;
}

/** Thả tim một kudo với tư cách `actor`. */
export async function heartKudoAs(
  actor: Session,
  kudoId: string,
): Promise<void> {
  const response = await fetch(`${getSupabaseUrl()}/rest/v1/kudo_hearts`, {
    method: "POST",
    headers: userHeaders(actor),
    body: JSON.stringify({ kudo_id: kudoId, user_id: actor.user_id }),
  });
  await expectOk(response, "Thả tim");
}

/** Bỏ tim một kudo với tư cách `actor`. */
export async function unheartKudoAs(
  actor: Session,
  kudoId: string,
): Promise<void> {
  const response = await fetch(
    `${getSupabaseUrl()}/rest/v1/kudo_hearts?kudo_id=eq.${kudoId}&user_id=eq.${actor.user_id}`,
    { method: "DELETE", headers: userHeaders(actor) },
  );
  await expectOk(response, "Bỏ tim");
}

/**
 * Liệt kê notification của một người bằng service role (bỏ qua RLS).
 *
 * Phải dùng service role: test kiểm HẬU QUẢ của trigger, mà người nhận có
 * thể còn chưa từng mở trình duyệt. Đọc bằng JWT của người gửi sẽ luôn rỗng
 * và không phân biệt được "trigger không chạy" với "RLS che mất".
 */
export async function listNotificationsAsService(
  userId: string,
  type?: string,
): Promise<
  Array<{ id: string; type: string; payload: Record<string, unknown> }>
> {
  const key = getServiceRoleKey();
  if (!key) {
    throw new Error(
      "Không đọc được notification: thiếu service-role key (env hoặc `supabase status`)",
    );
  }
  const typeFilter = type ? `&type=eq.${type}` : "";
  const response = await fetch(
    `${getSupabaseUrl()}/rest/v1/notifications?user_id=eq.${userId}${typeFilter}&select=id,type,payload`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  await expectOk(response, `Đọc notification của ${userId}`);
  return (await response.json()) as Array<{
    id: string;
    type: string;
    payload: Record<string, unknown>;
  }>;
}

/** Đếm kudo mà một người đã NHẬN, bằng service role. */
export async function countKudosReceived(userId: string): Promise<number> {
  const key = getServiceRoleKey();
  if (!key) {
    throw new Error("Không đếm được kudo: thiếu service-role key");
  }
  const response = await fetch(
    `${getSupabaseUrl()}/rest/v1/kudos?receiver_id=eq.${userId}&select=id`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  await expectOk(response, `Đếm kudo của ${userId}`);
  return ((await response.json()) as unknown[]).length;
}

/**
 * Đặt `full_name` cho một user bằng service role.
 *
 * Cần thiết vì `createTestSession` đăng ký bằng email/mật khẩu, không có
 * `raw_user_meta_data.full_name`, nên `handle_new_user` (migration 0002)
 * để `full_name` NULL. Trên DB thật hiện có 9/21 user rơi vào trạng thái
 * này — đó là dữ liệu hợp lệ, không phải dị thường của test.
 */
export async function setFullName(
  userId: string,
  fullName: string,
): Promise<void> {
  const key = getServiceRoleKey();
  if (!key) {
    throw new Error("Không đặt được full_name: thiếu service-role key");
  }
  const response = await fetch(
    `${getSupabaseUrl()}/rest/v1/users?id=eq.${userId}`,
    {
      method: "PATCH",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ full_name: fullName }),
    },
  );
  await expectOk(response, `Đặt full_name cho ${userId}`);
}
