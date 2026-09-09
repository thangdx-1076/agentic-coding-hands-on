import { getServiceRoleKey, getSupabaseUrl } from "./service-role";

/**
 * Seed a single notification row via service-role key.
 * Used for testing notifications list display and interactions.
 *
 * Note: In phase 1 (before schema creation), this will fail with
 * "relation notifications does not exist", but the test still captures
 * what we intend to seed.
 */
export async function seedNotification(
  userId: string,
  type:
    | "kudos_received"
    | "heart_received"
    | "secret_box_available"
    | "kudos_hidden",
  payload: Record<string, unknown>,
  isRead: boolean = false,
): Promise<string> {
  const key = getServiceRoleKey();
  if (!key) {
    throw new Error(
      "Cannot seed notification: no service-role key (env or `supabase status`)",
    );
  }

  const url = getSupabaseUrl();
  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  const response = await fetch(`${url}/rest/v1/notifications`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      user_id: userId,
      type,
      payload,
      is_read: isRead,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Failed to seed notification: ${response.status} ${response.statusText}\n${error}`,
    );
  }

  const data = (await response.json()) as Array<{ id: string }>;
  return data[0]?.id || "";
}

/**
 * Clean up all notifications for a user.
 * Used in afterEach to prevent test data leakage.
 */
export async function cleanupNotifications(userId: string): Promise<void> {
  const key = getServiceRoleKey();
  if (!key) {
    console.warn(
      `[cleanup] no service-role key — notifications for ${userId} left in DB`,
    );
    return;
  }

  const url = getSupabaseUrl();
  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  try {
    const response = await fetch(
      `${url}/rest/v1/notifications?user_id=eq.${userId}`,
      {
        method: "DELETE",
        headers,
      },
    );
    if (!response.ok) {
      console.warn(
        `[cleanup] delete notifications for ${userId} returned ${response.status}`,
      );
    }
  } catch (error) {
    console.warn(`[cleanup] delete notifications for ${userId} failed:`, error);
  }
}

/**
 * Đọc một dòng notification bằng service role, bỏ qua RLS.
 *
 * Dùng để kiểm HẬU QUẢ của một thao tác bị RLS chặn: sau khi user A cố sửa
 * dòng của user B, ta cần nhìn dòng đó bằng con mắt không bị RLS lọc để
 * khẳng định nó KHÔNG đổi. Đọc bằng JWT của A sẽ luôn trả rỗng, nên không
 * phân biệt được "bị chặn" với "đã sửa rồi bị ẩn".
 *
 * Ném khi không đọc được — cleanup/kiểm chứng im lặng là cách repo này từng
 * rò 2 499 user rác.
 */
export async function readNotificationAsService(
  id: string,
): Promise<{ id: string; is_read: boolean; user_id: string }> {
  const key = getServiceRoleKey();
  if (!key) {
    throw new Error(
      "Cannot read notification: no service-role key (env or `supabase status`)",
    );
  }

  const url = getSupabaseUrl();
  const response = await fetch(
    `${url}/rest/v1/notifications?id=eq.${id}&select=id,is_read,user_id`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to read notification ${id}: ${response.status} ${response.statusText}\n${await response.text()}`,
    );
  }

  const rows = (await response.json()) as Array<{
    id: string;
    is_read: boolean;
    user_id: string;
  }>;
  if (rows.length !== 1) {
    throw new Error(
      `Expected exactly 1 notification row for ${id}, got ${rows.length}`,
    );
  }
  return rows[0];
}
