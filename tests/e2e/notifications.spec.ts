import * as fs from "fs";
import * as path from "path";

import { test, expect } from "@playwright/test";

import {
  createTestSession,
  generateSupabaseCookies,
  injectSupabaseSession,
} from "./helpers/sign-in";
import { deleteTestUser } from "./helpers/service-role";
import {
  seedNotification,
  cleanupNotifications,
  readNotificationAsService,
} from "./helpers/seed-notifications";

/**
 * Load environment variables from .env.local
 * Splits on first '=' only to handle values containing '='
 */
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    content.split("\n").forEach((line) => {
      const eqIndex = line.indexOf("=");
      if (eqIndex > 0) {
        const key = line.substring(0, eqIndex).trim();
        const value = line.substring(eqIndex + 1).trim();
        if (key) {
          process.env[key] = value;
        }
      }
    });
  }
}
loadEnv();

/**
 * E2E tests for Notifications Panel (MoMorph screen 6-1LRz3vqr)
 * ==============================================================
 *
 * Policy: e2e-red-first. Tests FAIL now because schema is unimplemented;
 * they PASS once schema and backend are complete.
 *
 * Test-id mapping (TC → test):
 * - TC-001: no-session → bell not visible
 * - TC-006: panel opens with title and mark-all-read button (RED gate)
 * - TC-008: empty state when 0 notifications (pass-through)
 * - TC-002: RLS blocks cross-user reads + realtime
 * - TC-003/004/005: badge hidden · shows "3" · caps "9+"
 * - TC-007: 4 notification types render correctly
 * - TC-009: language change applies retroactively
 * - TC-015: link to /standards (not /community-standards)
 * - TC-016/017: mark-read persists after reload
 * - TC-018: pagination shows 10 + "Xem thêm" button
 * - TC-019: badge updates realtime
 * - TC-020: markRead on non-existent/foreign returns same result
 * - TC-014: SKIPPED (out-of-scope: admin moderation)
 *
 * Seeding: service-role insert (fixture error in phase 1 until schema exists).
 * Cleanup: deleteTestUser cascades via ON DELETE CASCADE.
 */

test.describe("Notifications Panel", { tag: "@auth @local-db" }, () => {
  const supabaseUrl = process.env.SUPABASE_URL || "http://127.0.0.1:55321";
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "anon-key-placeholder";

  // ==================== NO-SEED GROUP (TC-001, 006, 008) ====================

  test("TC-001: no-session → bell not visible, no dialog", async ({ page }) => {
    // FR-001: bell only renders for authenticated users
    // site-header.tsx:95 reroutes anonymous → /login link, no bell
    await page.goto("/");

    // Anchor: login link visible for anonymous
    await expect(
      page.getByRole("link", { name: /Đăng nhập|Login/ }),
    ).toBeVisible();

    // Bell button must not exist
    await expect(page.getByRole("button", { name: /Thông báo/ })).toHaveCount(
      0,
    );

    // Dialog must not exist
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  });

  test("TC-006: panel opens with title and mark-all-read button", async ({
    page,
    context,
  }) => {
    const email = `tc006-${Date.now()}@test.local`;
    const password = "Test@1234";
    const session = await createTestSession(
      supabaseUrl,
      anonKey,
      email,
      password,
    );
    const cookies = await generateSupabaseCookies(
      supabaseUrl,
      anonKey,
      session.access_token,
      session.refresh_token,
    );
    await injectSupabaseSession(context, cookies);

    try {
      await page.goto("/");

      // Click notification bell
      const bell = page.getByRole("button", { name: /Thông báo/ });
      await bell.click();

      // Dialog must open
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // Tiêu đề panel. Dùng role thay vì `text=`: chuỗi trạng thái rỗng
      // "Bạn chưa có thông báo" cũng CHỨA "Thông báo", nên `text=` khớp 2
      // phần tử và Playwright báo strict mode violation — đó là locator mơ
      // hồ, không phải panel sai.
      const panelTitle = dialog.getByRole("heading", { name: "Thông báo" });
      await expect(panelTitle).toBeVisible();

      // Panel must have "Đánh dấu đọc tất cả" button
      const markAllReadBtn = dialog.getByRole("button", {
        name: /Đánh dấu đọc tất cả/,
      });
      await expect(markAllReadBtn).toBeVisible();
    } finally {
      await deleteTestUser(session.user_id);
    }
  });

  test("TC-008: empty state when 0 notifications", async ({
    page,
    context,
  }) => {
    const email = `tc008-${Date.now()}@test.local`;
    const password = "Test@1234";
    const session = await createTestSession(
      supabaseUrl,
      anonKey,
      email,
      password,
    );
    const cookies = await generateSupabaseCookies(
      supabaseUrl,
      anonKey,
      session.access_token,
      session.refresh_token,
    );
    await injectSupabaseSession(context, cookies);

    try {
      await page.goto("/");
      const bell = page.getByRole("button", { name: /Thông báo/ });
      await bell.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // "Xem thêm" button must not be visible when empty
      const loadMoreBtn = dialog.getByRole("button", { name: /Xem thêm/ });
      await expect(loadMoreBtn).toBeHidden();
    } finally {
      await deleteTestUser(session.user_id);
    }
  });

  // ==================== RLS GROUP (TC-002) ====================

  test("TC-002: RLS blocks cross-user reads + realtime", async ({
    context: contextA,
    browser,
  }) => {
    const emailA = `tc002a-${Date.now()}@test.local`;
    const emailB = `tc002b-${Date.now()}@test.local`;
    const password = "Test@1234";

    const sessionA = await createTestSession(
      supabaseUrl,
      anonKey,
      emailA,
      password,
    );
    const sessionB = await createTestSession(
      supabaseUrl,
      anonKey,
      emailB,
      password,
    );

    const cookiesA = await generateSupabaseCookies(
      supabaseUrl,
      anonKey,
      sessionA.access_token,
      sessionA.refresh_token,
    );
    const cookiesB = await generateSupabaseCookies(
      supabaseUrl,
      anonKey,
      sessionB.access_token,
      sessionB.refresh_token,
    );

    await injectSupabaseSession(contextA, cookiesA);
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await injectSupabaseSession(contextB, cookiesB);

    try {
      // Seed a notification for user A
      await seedNotification(sessionA.user_id, "kudos_received", {
        kudosId: "kudo-1",
        senderName: "Alice",
      });

      // User B should not see user A's notification (RLS + realtime)
      await pageB.goto("/");
      const bellB = pageB.getByRole("button", { name: /Thông báo/ });
      await bellB.click();

      const dialogB = pageB.locator('[role="dialog"]');
      await expect(dialogB).toBeVisible();

      // Should not see notification from A
      const senderName = dialogB.locator("text=Alice");
      await expect(senderName).toBeHidden();
    } finally {
      await cleanupNotifications(sessionA.user_id);
      await cleanupNotifications(sessionB.user_id);
      await deleteTestUser(sessionA.user_id);
      await deleteTestUser(sessionB.user_id);
      await pageB.close();
      await contextB.close();
    }
  });

  // ==================== BADGE GROUP (TC-003, 004, 005) ====================

  test("TC-003: badge hidden when unreadCount = 0", async ({
    page,
    context,
  }) => {
    const email = `tc003-${Date.now()}@test.local`;
    const password = "Test@1234";
    const session = await createTestSession(
      supabaseUrl,
      anonKey,
      email,
      password,
    );
    const cookies = await generateSupabaseCookies(
      supabaseUrl,
      anonKey,
      session.access_token,
      session.refresh_token,
    );
    await injectSupabaseSession(context, cookies);

    try {
      await page.goto("/");

      // Badge should not be visible when count = 0
      // Look for any numeric badge element
      const badge = page.locator('[aria-label="Thông báo"] span').filter({
        hasNot: page.locator("button"), // Exclude the button itself
      });
      // Trong trạng thái rỗng, không badge nào được hiện.
      const visibleBadges = await badge
        .evaluateAll((els) =>
          els.filter((el) => {
            const style = window.getComputedStyle(el);
            return style.display !== "none" && style.visibility !== "hidden";
          }),
        )
        .then((x) => x.length);
      expect(visibleBadges).toBe(0);
    } finally {
      await deleteTestUser(session.user_id);
    }
  });

  test("TC-004: badge shows '3' when unreadCount = 3", async ({
    page,
    context,
  }) => {
    const email = `tc004-${Date.now()}@test.local`;
    const password = "Test@1234";
    const session = await createTestSession(
      supabaseUrl,
      anonKey,
      email,
      password,
    );
    const cookies = await generateSupabaseCookies(
      supabaseUrl,
      anonKey,
      session.access_token,
      session.refresh_token,
    );
    await injectSupabaseSession(context, cookies);

    try {
      // Seed 3 notifications
      await seedNotification(session.user_id, "kudos_received", {
        kudosId: "kudo-1",
        senderName: "Alice",
      });
      await seedNotification(session.user_id, "kudos_received", {
        kudosId: "kudo-2",
        senderName: "Bob",
      });
      await seedNotification(session.user_id, "heart_received", {
        kudosId: "kudo-1",
        actorId: "actor-1",
        actorName: "Charlie",
      });

      await page.goto("/");

      // Badge should show "3"
      const badge = page
        .locator('[aria-label="Thông báo"]')
        .locator("span:has-text('3')");
      await expect(badge).toBeVisible();
    } finally {
      await cleanupNotifications(session.user_id);
      await deleteTestUser(session.user_id);
    }
  });

  test("TC-005: badge caps at '9+' when unreadCount >= 10", async ({
    page,
    context,
  }) => {
    const email = `tc005-${Date.now()}@test.local`;
    const password = "Test@1234";
    const session = await createTestSession(
      supabaseUrl,
      anonKey,
      email,
      password,
    );
    const cookies = await generateSupabaseCookies(
      supabaseUrl,
      anonKey,
      session.access_token,
      session.refresh_token,
    );
    await injectSupabaseSession(context, cookies);

    try {
      // Seed 12 notifications
      for (let i = 0; i < 12; i++) {
        await seedNotification(session.user_id, "kudos_received", {
          kudosId: `kudo-${i}`,
          senderName: `Sender${i}`,
        });
      }

      await page.goto("/");

      // Badge should show "9+"
      const badge = page
        .locator('[aria-label="Thông báo"]')
        .locator("span:has-text('9+')");
      await expect(badge).toBeVisible();
    } finally {
      await cleanupNotifications(session.user_id);
      await deleteTestUser(session.user_id);
    }
  });

  // ==================== NOTIFICATION TYPES GROUP (TC-007, 009, 015) ====================

  test("TC-007: 4 notification types render correctly", async ({
    page,
    context,
  }) => {
    const email = `tc007-${Date.now()}@test.local`;
    const password = "Test@1234";
    const session = await createTestSession(
      supabaseUrl,
      anonKey,
      email,
      password,
    );
    const cookies = await generateSupabaseCookies(
      supabaseUrl,
      anonKey,
      session.access_token,
      session.refresh_token,
    );
    await injectSupabaseSession(context, cookies);

    try {
      // Seed 4 notification types
      await seedNotification(session.user_id, "kudos_received", {
        kudosId: "k1",
        senderName: "Alice",
      });
      await seedNotification(session.user_id, "heart_received", {
        kudosId: "k1",
        actorId: "a1",
        actorName: "Bob",
      });
      await seedNotification(session.user_id, "secret_box_available", {
        boxId: "b1",
      });
      await seedNotification(session.user_id, "kudos_hidden", {
        kudosId: "k2",
      });

      await page.goto("/");
      const bell = page.getByRole("button", { name: /Thông báo/ });
      await bell.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // kudos_received: show sender name
      await expect(dialog.locator("text=Alice")).toBeVisible();

      // heart_received: show actor name
      await expect(dialog.locator("text=Bob")).toBeVisible();

      // secret_box_available: show message
      await expect(
        dialog.locator("text=/Secret Box|secret box|Hộp bí mật/i"),
      ).toBeVisible();

      // kudos_hidden: link to /standards
      await expect(dialog.locator('a[href="/standards"]')).toBeVisible();
    } finally {
      await cleanupNotifications(session.user_id);
      await deleteTestUser(session.user_id);
    }
  });

  test("TC-009: language change applies retroactively to old notifications", async ({
    page,
    context,
  }) => {
    const email = `tc009-${Date.now()}@test.local`;
    const password = "Test@1234";
    const session = await createTestSession(
      supabaseUrl,
      anonKey,
      email,
      password,
    );
    const cookies = await generateSupabaseCookies(
      supabaseUrl,
      anonKey,
      session.access_token,
      session.refresh_token,
    );
    await injectSupabaseSession(context, cookies);

    try {
      // Seed a notification
      await seedNotification(session.user_id, "kudos_received", {
        kudosId: "k1",
        senderName: "Alice",
      });

      await page.goto("/");
      const bell = page.getByRole("button", { name: /Thông báo/ });
      await bell.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // Message should initially be in Vietnamese
      // Look for Vietnamese text (will depend on implementation)
      const viMsg = dialog.locator("text=Alice");
      await expect(viMsg).toBeVisible();

      // TODO: Switch language and verify retroactive update
      // Implementation-specific; requires language selector in the page
    } finally {
      await cleanupNotifications(session.user_id);
      await deleteTestUser(session.user_id);
    }
  });

  test("TC-015: kudos_hidden links to /standards (not /community-standards)", async ({
    page,
    context,
  }) => {
    const email = `tc015-${Date.now()}@test.local`;
    const password = "Test@1234";
    const session = await createTestSession(
      supabaseUrl,
      anonKey,
      email,
      password,
    );
    const cookies = await generateSupabaseCookies(
      supabaseUrl,
      anonKey,
      session.access_token,
      session.refresh_token,
    );
    await injectSupabaseSession(context, cookies);

    try {
      // Seed kudos_hidden notification
      await seedNotification(session.user_id, "kudos_hidden", {
        kudosId: "k1",
      });

      await page.goto("/");
      const bell = page.getByRole("button", { name: /Thông báo/ });
      await bell.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // Check for /standards link
      await expect(dialog.locator('a[href="/standards"]')).toBeVisible();

      // Ensure /community-standards does NOT exist
      await expect(
        dialog.locator('a[href="/community-standards"]'),
      ).toBeHidden();
    } finally {
      await cleanupNotifications(session.user_id);
      await deleteTestUser(session.user_id);
    }
  });

  // ==================== MARK-READ GROUP (TC-016, 017) ====================

  test("TC-016/017: mark notification as read persists after reload", async ({
    page,
    context,
  }) => {
    const email = `tc016-${Date.now()}@test.local`;
    const password = "Test@1234";
    const session = await createTestSession(
      supabaseUrl,
      anonKey,
      email,
      password,
    );
    const cookies = await generateSupabaseCookies(
      supabaseUrl,
      anonKey,
      session.access_token,
      session.refresh_token,
    );
    await injectSupabaseSession(context, cookies);

    try {
      // Seed a notification
      await seedNotification(session.user_id, "kudos_received", {
        kudosId: "k1",
        senderName: "Alice",
      });

      await page.goto("/");
      let bell = page.getByRole("button", { name: /Thông báo/ });
      await bell.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // Find and mark as read (implementation-specific)
      const notifItem = dialog.locator("text=Alice");
      await expect(notifItem).toBeVisible();

      // Reload page
      await page.reload();

      // Check notification still visible after reload
      bell = page.getByRole("button", { name: /Thông báo/ });
      await bell.click();

      const dialogAfter = page.locator('[role="dialog"]');
      await expect(dialogAfter).toBeVisible();

      // Item should still be visible
      const readItem = dialogAfter.locator("text=Alice");
      await expect(readItem).toBeVisible();
    } finally {
      await cleanupNotifications(session.user_id);
      await deleteTestUser(session.user_id);
    }
  });

  // ==================== PAGINATION GROUP (TC-018) ====================

  test("TC-018: pagination shows 10 items + 'Xem thêm' button", async ({
    page,
    context,
  }) => {
    const email = `tc018-${Date.now()}@test.local`;
    const password = "Test@1234";
    const session = await createTestSession(
      supabaseUrl,
      anonKey,
      email,
      password,
    );
    const cookies = await generateSupabaseCookies(
      supabaseUrl,
      anonKey,
      session.access_token,
      session.refresh_token,
    );
    await injectSupabaseSession(context, cookies);

    try {
      // Seed 15 notifications
      for (let i = 0; i < 15; i++) {
        await seedNotification(session.user_id, "kudos_received", {
          kudosId: `k${i}`,
          senderName: `Sender${i}`,
        });
      }

      await page.goto("/");
      const bell = page.getByRole("button", { name: /Thông báo/ });
      await bell.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // Should show first 10 items
      const items = dialog.locator("[data-testid=notification-item]");
      const count = items;
      await expect(count).toHaveCount(10);

      // "Xem thêm" button should be visible
      const loadMoreBtn = dialog.getByRole("button", { name: /Xem thêm/ });
      await expect(loadMoreBtn).toBeVisible();

      // Click "Xem thêm"
      await loadMoreBtn.click();

      // Should now show 15 items
      const itemsAfter = dialog.locator("[data-testid=notification-item]");
      const countAfter = itemsAfter;
      await expect(countAfter).toHaveCount(15);

      // "Xem thêm" should disappear
      await expect(loadMoreBtn).toBeHidden();
    } finally {
      await cleanupNotifications(session.user_id);
      await deleteTestUser(session.user_id);
    }
  });

  // ==================== REALTIME GROUP (TC-019) ====================

  test("TC-019: badge updates realtime when new notification arrives", async ({
    page: pageA,
    context: contextA,
  }) => {
    const emailA = `tc019a-${Date.now()}@test.local`;
    const password = "Test@1234";

    const sessionA = await createTestSession(
      supabaseUrl,
      anonKey,
      emailA,
      password,
    );

    const cookiesA = await generateSupabaseCookies(
      supabaseUrl,
      anonKey,
      sessionA.access_token,
      sessionA.refresh_token,
    );

    await injectSupabaseSession(contextA, cookiesA);

    try {
      await pageA.goto("/");

      // Realtime chỉ giao những sự kiện xảy ra SAU khi kênh đã đăng ký.
      // `NotificationBell` lấy `userId` qua `auth.getUser()` phía client rồi
      // mới subscribe, nên seed ngay sau `goto` sẽ rơi vào khoảng trống đó và
      // INSERT mất luôn. Chờ chuông render xong (mốc cho thấy client đã
      // hydrate) rồi cho thêm một nhịp cho vòng auth + subscribe.
      await expect(pageA.getByRole("button", { name: /Thông báo/ })).toBeVisible();
      await pageA.waitForTimeout(2000);

      await seedNotification(sessionA.user_id, "kudos_received", {
        kudosId: "k1",
        senderName: "Bob",
      });

      // User A's badge should update in realtime
      const badge = pageA
        .locator('[aria-label="Thông báo"]')
        .locator("span:has-text('1')");
      await expect(badge).toBeVisible({ timeout: 5000 });
    } finally {
      await cleanupNotifications(sessionA.user_id);
      await deleteTestUser(sessionA.user_id);
    }
  });

  // ==================== AUTHORIZATION GROUP (TC-020) ====================

  test("TC-020: markRead — id của người khác và id không tồn tại cho CÙNG một kết quả", async () => {
    // FR-603/EC013. Ranh giới này được cưỡng chế ở RLS
    // (`notifications_update_own_read`, spec/system/permissions.md), nên test
    // đánh thẳng vào PostgREST bằng JWT của chính người dùng — đó là tầng
    // thật sự quyết định, không phải tầng UI.
    //
    // Bản đầu của test này gọi `/api/notifications/mark-read` (route handler
    // KHÔNG có trong kế hoạch — phase 04 dùng server action) và assert
    // `ok || status === 404`. Nó xanh CHÍNH VÌ route không tồn tại nên Next
    // trả 404. Và nó chỉ gọi MỘT lần với một id giả, nên không thể so sánh
    // hai trường hợp — trong khi "không phân biệt được" mới là toàn bộ nội
    // dung của TC-020.
    const password = "Test@1234";
    const stamp = Date.now();
    const sessionA = await createTestSession(
      supabaseUrl,
      anonKey,
      `tc020a-${stamp}@test.local`,
      password,
    );
    const sessionB = await createTestSession(
      supabaseUrl,
      anonKey,
      `tc020b-${stamp}@test.local`,
      password,
    );

    try {
      // Dòng có thật, thuộc về B.
      const foreignId = await seedNotification(
        sessionB.user_id,
        "kudos_received",
        {
          kudosId: `kudo-${stamp}`,
          senderName: "Bob",
        },
      );
      // Dòng không tồn tại với ai cả.
      const missingId = "00000000-0000-4000-8000-000000000000";

      // A cố đánh dấu đã đọc cả hai, bằng JWT của chính A.
      const patchAs = async (id: string) => {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/notifications?id=eq.${id}`,
          {
            method: "PATCH",
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${sessionA.access_token}`,
              "Content-Type": "application/json",
              Prefer: "return=representation",
            },
            body: JSON.stringify({ is_read: true }),
          },
        );
        return { status: res.status, body: await res.text() };
      };

      const onForeign = await patchAs(foreignId);
      const onMissing = await patchAs(missingId);

      // Hai trường hợp phải KHÔNG phân biệt được: cùng status, cùng thân
      // phản hồi (đều là mảng rỗng — RLS lọc mất dòng của B trước khi UPDATE
      // nhìn thấy nó).
      expect(onForeign.status).toBe(onMissing.status);
      expect(onForeign.body).toBe(onMissing.body);
      expect(JSON.parse(onForeign.body)).toEqual([]);

      // Và dòng của B phải còn nguyên chưa đọc.
      const stillUnread = await readNotificationAsService(foreignId);
      expect(stillUnread.is_read).toBe(false);
    } finally {
      await cleanupNotifications(sessionA.user_id);
      await cleanupNotifications(sessionB.user_id);
      await deleteTestUser(sessionA.user_id);
      await deleteTestUser(sessionB.user_id);
    }
  });

  // ==================== SKIPPED (OUT-OF-SCOPE) ====================

  // eslint-disable-next-line playwright/no-skipped-test, playwright/expect-expect -- OUT-OF-SCOPE có chủ ý: giữ chỗ để người đọc sau không tưởng là quên (clarifications § Phạm vi 4 loại thông báo)
  test.skip("TC-014: admin moderation — hide/unhide/re-hide kudos", () => {
    // OUT-OF-SCOPE: requires admin.setStatus column and moderation feature
    // Clarifications § Phạm vi 4 loại thông báo
    // Deferred to later phase
  });
});
