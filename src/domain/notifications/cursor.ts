/**
 * Base64url codec for `listNotifications`' keyset pagination cursor —
 * `(created_at, id)`, never `offset` (technical-spec.md § 4, FR-102 /
 * phase-04 Key Insight 6: a page inserted between reads would duplicate
 * or skip rows under `offset`).
 *
 * Uses `btoa`/`atob`, not Node's `Buffer`: this module is imported by BOTH
 * `src/dal` (server) and `src/api` (browser, phase 05), and `btoa`/`atob`
 * are the codec both environments carry natively (Node has had them as
 * globals since v16; every evergreen browser always has). The encoded
 * content is always plain ASCII — an ISO timestamp plus a UUID — so the
 * latin1 restriction of `atob`/`btoa` never bites.
 */

export type NotificationCursor = {
  createdAt: string;
  id: string;
};

export function encodeCursor(cursor: NotificationCursor): string {
  const json = JSON.stringify(cursor);
  return toBase64Url(btoa(json));
}

/**
 * Garbage in (empty string, `undefined`, a tampered/truncated base64
 * string, invalid JSON, or JSON missing a required key) → `null`, meaning
 * "first page" — this NEVER throws. The cursor arrives as a client-
 * controlled query parameter, so it is treated as boundary data a caller
 * may have hand-edited, not as a value the system can trust.
 */
export function decodeCursor(
  cursor: string | null | undefined,
): NotificationCursor | null {
  if (!cursor) {
    return null;
  }

  try {
    const json = atob(fromBase64Url(cursor));
    const parsed: unknown = JSON.parse(json);

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      isTimestamp((parsed as Record<string, unknown>).createdAt) &&
      isUuid((parsed as Record<string, unknown>).id)
    ) {
      return parsed as NotificationCursor;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Cả hai giá trị được nội suy THẲNG vào chuỗi filter PostgREST
 * (`src/api/notifications.ts` và `src/dal/notifications.ts`: `created_at.lt.
 * ${createdAt},and(...)`), nơi `,` và `)` là ký tự cấu trúc. Chỉ kiểm
 * `typeof === "string"` là chưa giữ đúng lời hứa ở docblock trên: một cursor
 * bị sửa tay có thể phá nhóm `and(...)` và làm sai chính truy vấn của người
 * gọi. RLS vẫn chặn việc đọc dữ liệu người khác — đây là lỗi đúng-đắn của
 * truy vấn, không phải lỗ hổng phân quyền.
 *
 * Hình dạng, không phải nội dung: `createdAt` phải parse được thành ngày,
 * `id` phải là UUID. Cả hai đều loại sạch ký tự cấu trúc.
 */
function isTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[\d:.TZ+-]{10,35}$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function toBase64Url(base64: string): string {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(base64Url: string): string {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (base64.length % 4)) % 4;
  return base64 + "=".repeat(padLength);
}
