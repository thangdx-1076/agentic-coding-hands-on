import { test, expect } from "@playwright/test";

import {
  createKudoAs,
  heartKudoAs,
  unheartKudoAs,
  listNotificationsAsService,
  countKudosReceived,
  setFullName,
} from "./helpers/kudos-actions";
import { cleanupNotifications } from "./helpers/seed-notifications";
import { createTestSession } from "./helpers/sign-in";
import {
  deleteTestUser,
  getAnonKey,
  getSupabaseUrl,
} from "./helpers/service-role";

/**
 * F012 — emitter phía backend (MoMorph screen 6-1LRz3vqr).
 * Policy: e2e-red-first.
 *
 * Các test này KHÔNG đi qua UI. Emitter là trigger SQL trên `public.kudos`
 * và `public.kudo_hearts` (technical-spec § 3), nên chúng tạo dữ liệu thật
 * qua PostgREST bằng JWT của chính người dùng — đúng con đường người dùng
 * thật đi, dưới RLS, `auth.uid()` là người gửi — rồi đọc bảng
 * `notifications` bằng service role để xem trigger có chạy không.
 *
 * Bản đồ TC → test:
 * - TC-010: gửi kudo → đúng 1 row `kudos_received` cho người nhận
 * - TC-010b: người gửi chưa có tên → payload chụp null (hợp đồng cho renderer)
 * - TC-011: tự gửi cho mình → 0 row
 * - TC-012: kudo ẩn danh → payload chỉ có biệt danh, không có danh tính thật
 * - TC-013: thả/bỏ/thả tim → đúng 1 row `heart_received`, sống sót qua lần bỏ
 * - TC-021: emit hỏng không làm hỏng thao tác gốc
 *
 * Ở phase 01-02 (chưa có trigger, migration 0013) mọi test ở đây ĐỎ vì
 * `notifications` rỗng — đỏ vì assertion, không phải vì fixture nổ.
 */

const PASSWORD = "Test@1234";

async function makeUser(prefix: string) {
  const anon = getAnonKey();
  if (!anon) {
    throw new Error(
      "Không lấy được anon key (env hoặc `supabase status`) — Supabase local đã chạy chưa?",
    );
  }
  return createTestSession(
    getSupabaseUrl(),
    anon,
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`,
    PASSWORD,
  );
}

test.describe("Notification Emitters", { tag: "@auth @local-db" }, () => {
  test("TC-010: gửi kudo → phát kudos_received cho người nhận", async () => {
    const sender = await makeUser("tc010s");
    const receiver = await makeUser("tc010r");

    try {
      // `createTestSession` đăng ký bằng email/mật khẩu nên `full_name` là
      // NULL (migration 0002 lấy tên từ `raw_user_meta_data` của OAuth).
      // Đặt tên trước để test được ĐÚNG hành vi chụp tên, thay vì nới lỏng
      // assertion cho vừa với dữ liệu thiếu.
      await setFullName(sender.user_id, "Nguyễn Văn A");

      await createKudoAs(sender, {
        receiverId: receiver.user_id,
        content: "Cảm ơn bạn đã giúp mình sprint này!",
      });

      const rows = await listNotificationsAsService(
        receiver.user_id,
        "kudos_received",
      );
      expect(rows).toHaveLength(1);
      // `senderName` là ảnh chụp tại thời điểm phát — đổi tên sau này không
      // hồi tố (BL07).
      expect(rows[0].payload.senderName).toBe("Nguyễn Văn A");
      expect(rows[0].payload.kudosId).toBeTruthy();

      // Người GỬI không được nhận thông báo về kudo của chính mình.
      const senderRows = await listNotificationsAsService(sender.user_id);
      expect(senderRows).toHaveLength(0);
    } finally {
      await cleanupNotifications(sender.user_id);
      await cleanupNotifications(receiver.user_id);
      await deleteTestUser(sender.user_id);
      await deleteTestUser(receiver.user_id);
    }
  });

  test("TC-010b: người gửi chưa có tên → payload chụp null, renderer tự lo fallback", async () => {
    // 9/21 user trên DB thật có `full_name` NULL (đăng nhập Google không trả
    // về tên). Quy ước của repo là fallback ở TẦNG RENDER —
    // `kudos-card-person.tsx:96` dùng `person.fullName ?? "Sunner"`, và
    // `fullName` được khai `string | null` suốt DAL.
    //
    // Trigger KHÔNG được bịa tên vào payload: `senderName` là ảnh chụp sự
    // thật tại thời điểm phát, và sự thật ở đây là "không có tên". Test này
    // ghim hợp đồng đó để phase 08 biết mình PHẢI xử lý null — nếu không,
    // thông báo sẽ hiện "null đã gửi Kudos cho bạn".
    const sender = await makeUser("tc010bs");
    const receiver = await makeUser("tc010br");

    try {
      await createKudoAs(sender, {
        receiverId: receiver.user_id,
        content: "Gửi từ một người chưa đặt tên.",
      });

      const rows = await listNotificationsAsService(
        receiver.user_id,
        "kudos_received",
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].payload.senderName).toBeNull();
      // Và tuyệt đối không phải chuỗi "null" — đó là dấu hiệu trigger đã ép
      // kiểu nhầm ở đâu đó.
      expect(rows[0].payload.senderName).not.toBe("null");
    } finally {
      await cleanupNotifications(sender.user_id);
      await cleanupNotifications(receiver.user_id);
      await deleteTestUser(sender.user_id);
      await deleteTestUser(receiver.user_id);
    }
  });

  test("TC-011: tự gửi kudo cho mình → không phát thông báo", async () => {
    const self = await makeUser("tc011");

    try {
      // Kudo vẫn phải tạo được — `kudos_insert_own` không chặn tự gửi
      // (0009 nói rõ: UX lạ thì có, lỗ hổng thì không).
      await createKudoAs(self, {
        receiverId: self.user_id,
        content: "Tự thưởng cho bản thân.",
      });
      expect(await countKudosReceived(self.user_id)).toBe(1);

      // Nhưng KHÔNG có thông báo nào (FR-402 / EC001 / BL02).
      expect(await listNotificationsAsService(self.user_id)).toHaveLength(0);
    } finally {
      await cleanupNotifications(self.user_id);
      await deleteTestUser(self.user_id);
    }
  });

  test("TC-012: kudo ẩn danh → payload chỉ có biệt danh, không có danh tính thật", async () => {
    const sender = await makeUser("tc012s");
    const receiver = await makeUser("tc012r");
    const nickname = "Sunner bí ẩn";

    try {
      await createKudoAs(sender, {
        receiverId: receiver.user_id,
        content: "Gửi bạn một lời cảm ơn giấu tên.",
        isAnonymous: true,
        anonymousName: nickname,
      });

      const rows = await listNotificationsAsService(
        receiver.user_id,
        "kudos_received",
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].payload.senderName).toBe(nickname);

      // Ranh giới ẩn danh: kiểm trên CHÍNH chuỗi JSON, không chỉ trên vài
      // khoá đã biết — nếu trigger lỡ nhét thêm trường nào mang danh tính
      // thật thì phép kiểm theo khoá sẽ bỏ lọt.
      const raw = JSON.stringify(rows[0].payload);
      expect(raw).not.toContain(sender.user_id);
    } finally {
      await cleanupNotifications(sender.user_id);
      await cleanupNotifications(receiver.user_id);
      await deleteTestUser(sender.user_id);
      await deleteTestUser(receiver.user_id);
    }
  });

  test("TC-013: thả / bỏ / thả lại tim → đúng 1 row, sống sót qua lần bỏ tim", async () => {
    // "Kudos của bạn" trong message `heart_received` = kudo BẠN VIẾT RA, tức
    // người GỬI. Căn cứ: `open_secret_box()` (migration 0011) tính suất box
    // bằng `SUM(k.heart_count) WHERE k.sender_id = v_user_id` và ghi chú
    // thẳng "Hearts credit the kudo's SENDER". Thông báo phải theo cùng một
    // định nghĩa, nếu không tim sẽ ghi công cho một người và báo cho người
    // khác.
    const author = await makeUser("tc013author");
    const actor = await makeUser("tc013actor");

    try {
      const kudoId = await createKudoAs(author, {
        receiverId: actor.user_id,
        content: "Kudo để thả tim.",
      });

      await heartKudoAs(actor, kudoId);
      expect(
        await listNotificationsAsService(author.user_id, "heart_received"),
      ).toHaveLength(1);

      await unheartKudoAs(actor, kudoId);
      // Bỏ tim KHÔNG xoá thông báo đã phát (EC004).
      expect(
        await listNotificationsAsService(author.user_id, "heart_received"),
      ).toHaveLength(1);

      await heartKudoAs(actor, kudoId);
      // Thả lại KHÔNG phát thêm — dedupe ở unique index bộ phận (FR-404).
      expect(
        await listNotificationsAsService(author.user_id, "heart_received"),
      ).toHaveLength(1);
    } finally {
      await cleanupNotifications(author.user_id);
      await cleanupNotifications(actor.user_id);
      await deleteTestUser(author.user_id);
      await deleteTestUser(actor.user_id);
    }
  });

  test("TC-021: emit hỏng không làm hỏng thao tác gốc", async () => {
    const sender = await makeUser("tc021s");
    const receiver = await makeUser("tc021r");

    try {
      // FR-405: emit hỏng chỉ được RAISE WARNING, không rollback thao tác gốc.
      //
      // Cách ép hỏng có thật và tái lập được: thả tim → bỏ tim → thả lại.
      // Lần thả thứ hai làm trigger đụng unique index dedupe bộ phận. Nếu
      // trigger để `unique_violation` thoát ra, chính thao tác THẢ TIM sẽ
      // hỏng — người dùng bấm tim mà báo lỗi. Đó đúng là hình dạng của lỗi
      // mà FR-405 tồn tại để chặn, và nó không cần bịa lỗi giả nào.
      const kudoId = await createKudoAs(sender, {
        receiverId: receiver.user_id,
        content: "Kudo phải sống sót kể cả khi thông báo hỏng.",
      });
      expect(await countKudosReceived(receiver.user_id)).toBe(1);

      await heartKudoAs(receiver, kudoId);
      await unheartKudoAs(receiver, kudoId);
      // Lệnh này phải THÀNH CÔNG. `heartKudoAs` ném khi PostgREST trả lỗi,
      // nên nếu trigger để lỗi thoát ra thì test đỏ ngay tại đây.
      await heartKudoAs(receiver, kudoId);

      // Và tim vẫn được ghi nhận — thao tác gốc không bị nuốt theo.
      expect(
        await listNotificationsAsService(sender.user_id, "heart_received"),
      ).toHaveLength(1);
    } finally {
      await cleanupNotifications(sender.user_id);
      await cleanupNotifications(receiver.user_id);
      await deleteTestUser(sender.user_id);
      await deleteTestUser(receiver.user_id);
    }
  });
});
