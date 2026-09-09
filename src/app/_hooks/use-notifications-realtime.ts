"use client";

import { useEffect, useRef } from "react";

import { subscribeToNotifications } from "@/api/notifications";

/**
 * The realtime half of `use-notifications.ts`, split out to keep that file
 * under this repo's 200-line cap (phase-05 Todo list). Subscribes once per
 * `userId` for the whole hook lifetime — the bell renders across all 4
 * pages — independent of `open`.
 *
 * `openRef` — not the `open` value itself — is what the subscription's
 * callback reads: the `useEffect` below intentionally does NOT list `open`
 * as a dependency, because doing so would tear down and recreate the
 * realtime channel on every panel toggle. Mirroring it into a ref lets the
 * callback see the CURRENT `open` state without resubscribing.
 */
export function useNotificationsRealtime(
  userId: string,
  open: boolean,
  refetchCount: () => void,
  fetchFirstPage: () => void,
): void {
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    // `NotificationBell` bắt đầu với `userId` rỗng và chỉ điền sau khi
    // `auth.getUser()` trả về. Đăng ký ngay lúc đó sẽ mở một kênh
    // `notifications:` với bộ lọc `user_id=eq.` — không khớp dòng nào, rồi
    // bị huỷ và thay bằng kênh thật một nhịp sau.
    //
    // Kênh rác đó không chỉ lãng phí: nó khiến "kênh đầu tiên đã join"
    // KHÔNG còn đồng nghĩa với "đã sẵn sàng nhận thông báo", và làm rộng
    // thêm cửa sổ mà một INSERT có thể lọt qua không ai nghe.
    if (!userId) return;

    const unsubscribe = subscribeToNotifications(userId, () => {
      refetchCount();
      if (openRef.current) {
        fetchFirstPage();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [userId, refetchCount, fetchFirstPage]);
}
