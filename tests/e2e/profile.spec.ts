import * as fs from "fs";
import * as path from "path";

import { test, expect } from "@playwright/test";

import {
  createTestSession,
  generateSupabaseCookies,
  injectSupabaseSession,
} from "./helpers/sign-in";

// Load environment variables from .env.local for Node process
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    content.split("\n").forEach((line) => {
      const [key, value] = line.split("=");
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
  }
}
loadEnv();

/**
 * DOM Contract — User Profile Page (`/profile`)
 * ========================================================
 * Authoritative assertions for Track A implementation. Read-only.
 * Do NOT weaken or delete these contracts to make tests pass.
 *
 * | # | Contract | TC | CI-safe? |
 * |---|---|---|---|
 * | C1 | `page.locator("header")` count 1 · `page.locator("footer")` count 1 (KHÁC F005 — chrome CÓ mặt); header ở biến thể "đã đăng nhập" (có `button[aria-label="Tài khoản"]`, không có `a[aria-label="Đăng nhập"]`) | layout, SC-011 | @auth |
 * | C2 | Đúng 1 heading chứa tên hồ sơ, ngay dưới avatar tròn (self: tên người xem; other: tên Sunner được xem) | GUI_001, GUI_008 | @auth |
 * | C3 | Hero KHÔNG chứa text node nào ứng với dòng department+tier+stars (`362:5064`) | GUI_009 | @auth |
 * | C4 | Đúng 6 phần tử badge-slot (`362:5066`-`362:5071`) trong 1 hàng căn giữa, tất cả mang cùng 1 attribute "khoá" (`data-locked="true"`); tiêu đề nằm SAU hàng ô theo DOM order | GUI_002 | @auth |
 * | C5 | Tiêu đề bộ sưu tập: self = `Bộ sưu tập icon của tôi`; other = `Bộ sưu tập icon` (KHÔNG chèn tên) | GUI_003 | @auth |
 * | C6 | Self: đúng 5 dòng trong statistics card, nhãn verbatim `Số Kudos bạn nhận được:` / `Số Kudos bạn đã gửi:` / `Số tim bạn nhận được:` / `Số Secret Box bạn đã mở:` / `Số Secret Box chưa mở:`, mỗi dòng giá trị `0`; 1 divider giữa dòng 3 và 4 | GUI_004 | @auth |
 * | C7 | Self: nút `Mở Secret Box` có thuộc tính `disabled` trong MỌI trường hợp | GUI_005 | @auth |
 * | C8 | Other: slot statistics KHÔNG chứa 5 dòng/nút Secret Box — chỉ chứa thanh `Viết Kudo` `disabled`. Self: KHÔNG có `Viết Kudo`. Hai biến thể loại trừ lẫn nhau | FUN_008 | @auth |
 * | C9 | Dropdown chiều Kudos (`362:5089`): self → đúng 2 option, trigger `Đã nhận (0)` / `Đã gửi (0)`; other → đúng 1 option Received, **không có** Sent kể cả ở trạng thái disabled/hidden | FUN_009, SEC_001 | @auth |
 * | C10 | Chọn 1 chiều → hiển thị đúng copy rỗng tương ứng (không phải danh sách trống không chữ) | FUN_011, FUN_012 | @auth |
 * | C11 | Click `Viết Kudo` → không mở dialog nào (`[role="dialog"]` count 0) và không phát request mới | FUN_008 | @auth |
 * | C12 | `page.goto("/profile?id=not-a-uuid")` → `response.status() === 404` (syntactic validation); server-side rejection not observable from browser | FUN_004 | @auth |
 * | C13 | `page.goto("/profile?id=a&id=b")` → `response.status() === 404` | FUN_005 | @auth |
 * | C14 | `page.goto("/profile")` (không tham số, đã đăng nhập) → hero là hồ sơ mình | FUN_005 | @auth |
 * | C15 | `page.goto("/profile?id={id chính mình}")` → sau `waitForURL`, `new URL(page.url()).search === ""` và pathname là `/profile` | FUN_002 | @auth |
 * | C16 | Response của request đọc hồ sơ người khác KHÔNG chứa field `email` hay `role` | SEC_004 | @auth |
 * | C17 | Anonymous (storageState rỗng) → `page.goto("/profile")` → sau `waitForURL`, pathname là `/login` | ACC_001, ACC_002 | **CI-safe** |
 * | C18 | Chip Spam KHÔNG BAO GIỜ có trong DOM (feed luôn rỗng) — 1 dòng `toHaveCount(0)` | GUI_007 (deferred) | @auth |
 * ========================================================
 *
 * OUT OF SCOPE (deferred to Kudos domain F007+, clarifications § Test-case disposition):
 * - FUN_006: Modal open behavior when clicking "Viết Kudo" — Kudos modal doesn't exist
 * - FUN_007: Kudos card feed interactions — feed infrastructure not built
 * - FUN_010: Heart reaction on received Kudos — hearts/feed not implemented
 * - FUN_013: Kudos feed keyset cursor pagination — feed not built
 * - FUN_014: Infinite scroll triggering load more — pagination not implemented
 * - FUN_015: Anonymous sender anonymization in feed — feed not built
 * - GUI_006: Active Kudos card state styling — feed doesn't exist
 * - SEC_002: Kudos author anonymization hiding in sent feed — sent feed not built
 * - SEC_003: User enumeration via brute-force ?id= guessing — rate limit not implemented
 * - Chip Spam in feed: tracked as C18 with minimal assertion (toHaveCount(0))
 */

test.describe("Profile page guard (CI-safe, no Supabase required)", () => {
  // Ensure no auth cookies for unauthenticated tests
  test.use({ storageState: { cookies: [], origins: [] } });

  test("[C17] Anonymous user redirects to /login", async ({ page }) => {
    // C17: Anonymous (storageState rỗng) → `page.goto("/profile")` → pathname là `/login`
    await page.goto("/profile");
    await page.waitForURL("/login");

    const url = new URL(page.url());
    expect(url.pathname).toBe("/login");
  });
});

test.describe("Profile page", { tag: "@auth" }, () => {
  let supabaseUrl: string;
  let publishableKey: string;
  let selfSession: {
    access_token: string;
    refresh_token: string;
    user_id: string;
  };
  let otherSession: {
    access_token: string;
    refresh_token: string;
    user_id: string;
  };
  let selfUserId: string;
  let otherUserId: string;

  test.beforeEach(async ({ context }) => {
    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

    if (!supabaseUrl || !publishableKey) {
      throw new Error("Supabase environment variables not set");
    }

    // Create self session with metadata
    selfSession = await createTestSession(
      supabaseUrl,
      publishableKey,
      "e2e-profile-self@example.com",
      "Test@123456789",
      { full_name: "E2E Self Sunner" },
    );
    selfUserId = selfSession.user_id;

    // Create other session with metadata
    otherSession = await createTestSession(
      supabaseUrl,
      publishableKey,
      "e2e-profile-other@example.com",
      "Test@123456789",
      { full_name: "E2E Other Sunner" },
    );
    otherUserId = otherSession.user_id;

    // Inject self session cookies into browser
    const selfCookies = await generateSupabaseCookies(
      supabaseUrl,
      publishableKey,
      selfSession.access_token,
      selfSession.refresh_token,
    );
    await injectSupabaseSession(context, selfCookies);
  });

  // C1: Header and footer chrome with authenticated state
  test("[C1] Header and footer chrome with authenticated header state", async ({
    page,
  }) => {
    // C1: Đúng 1 `<header>`, Đúng 1 `<footer>`; header ở biến thể "đã đăng nhập"
    await page.goto("/profile");

    const header = page.locator("header");
    await expect(header).toHaveCount(1);

    const footer = page.locator("footer");
    await expect(footer).toHaveCount(1);

    // Verify authenticated state: has account button
    const accountBtn = page.locator('button[aria-label="Tài khoản"]');
    await expect(accountBtn).toBeVisible();

    // Verify no login link in authenticated state
    const loginLink = page.locator('a[aria-label="Đăng nhập"]');
    await expect(loginLink).toBeHidden();
  });

  // C2: Self view — heading contains self name
  test("[C2a] Self view shows heading with profile name", async ({ page }) => {
    // C2: Đúng 1 heading chứa tên hồ sơ (self: tên người xem)
    await page.goto("/profile");

    const heading = page.locator("h1, h2, h3");
    const nameHeading = heading.filter({
      hasText: "E2E Self Sunner",
    });
    await expect(nameHeading).toHaveCount(1);
  });

  // C2: Other view — heading contains other user's name
  test("[C2b] Other view shows heading with other user's name", async ({
    page,
  }) => {
    // C2: Đúng 1 heading chứa tên hồ sơ (other: tên Sunner được xem)
    await page.goto(`/profile?id=${otherUserId}`);

    const heading = page.locator("h1, h2, h3");
    const nameHeading = heading.filter({
      hasText: "E2E Other Sunner",
    });
    await expect(nameHeading).toHaveCount(1);
  });

  // C3: Hero does NOT contain department/tier/stars text
  test("[C3] Hero section does not contain department, tier, or stars", async ({
    page,
  }) => {
    // C3: Hero KHÔNG chứa text node nào ứng với dòng department+tier+stars
    await page.goto("/profile");

    // Locate the main hero/profile section
    const main = page.locator("main");

    // Verify that no text nodes match typical department/tier/stars patterns
    // Look for common Vietnamese patterns that would indicate these fields
    const departmentText = main.locator("text=/Phòng|Department/i");
    await expect(departmentText).toHaveCount(0);

    // Verify no tier indicators (sao, hero badge, etc.)
    const tierText = main.locator("text=/Hero|Rising|Legend|Tier/i");
    await expect(tierText).toHaveCount(0);
  });

  // C4: Exactly 6 badge slots, all locked, in centered row
  test("[C4] Badge collection has exactly 6 locked slots", async ({ page }) => {
    // C4: Đúng 6 phần tử badge-slot ... tất cả mang cùng 1 attribute "khoá" (`data-locked="true"`)
    await page.goto("/profile");

    const badgeSlots = page.locator('[data-locked="true"]');
    await expect(badgeSlots).toHaveCount(6);
  });

  // C5: Badge collection title — self vs other
  test("[C5a] Self view: badge title is 'Bộ sưu tập icon của tôi'", async ({
    page,
  }) => {
    // C5: Tiêu đề bộ sưu tập: self = `Bộ sưu tập icon của tôi`
    await page.goto("/profile");

    const title = page.locator("text=Bộ sưu tập icon của tôi");
    await expect(title).toBeVisible();
  });

  test("[C5b] Other view: badge title is 'Bộ sưu tập icon'", async ({
    page,
  }) => {
    // C5: Tiêu đề bộ sưu tập: other = `Bộ sưu tập icon` (KHÔNG chèn tên)
    await page.goto(`/profile?id=${otherUserId}`);

    // Should contain "Bộ sưu tập icon" but NOT the other's name
    const title = page.locator("text=Bộ sưu tập icon");
    await expect(title).toBeVisible();

    // Verify it's NOT followed by the other user's name in the same element
    const namedTitle = page.locator(
      "text=Bộ sưu tập icon của E2E Other Sunner",
    );
    await expect(namedTitle).toHaveCount(0);
  });

  // C6: Self statistics card with 5 rows all 0 values
  test("[C6] Self statistics card shows 5 rows all with value 0", async ({
    page,
  }) => {
    // C6: Self: đúng 5 dòng trong statistics card, mỗi dòng giá trị `0`
    await page.goto("/profile");

    // Verify all expected labels exist with 0 values
    const labels = [
      "Số Kudos bạn nhận được:",
      "Số Kudos bạn đã gửi:",
      "Số tim bạn nhận được:",
      "Số Secret Box bạn đã mở:",
      "Số Secret Box chưa mở:",
    ];

    for (const label of labels) {
      const row = page.locator(`text=${label}`);
      await expect(row).toBeVisible();

      // Find the value (should be 0) within the same parent
      const parent = row.locator("..");
      const value = parent.locator("text=0");
      await expect(value).toBeVisible();
    }

    // Verify divider exists between row 3 and row 4
    const divider = page.locator("[role='separator']");
    await expect(divider.first()).toBeVisible();
  });

  // C7: Self view — "Mở Secret Box" button is disabled
  test("[C7] Self view: Open Secret Box button is disabled", async ({
    page,
  }) => {
    // C7: Self: nút `Mở Secret Box` có thuộc tính `disabled`
    await page.goto("/profile");

    const button = page.locator("button:has-text('Mở Secret Box')");
    await expect(button).toHaveAttribute("disabled");
  });

  // C8: Statistics card branching — self has stats, other has Write Kudo bar
  test("[C8a] Self view has statistics card, no Write Kudo bar", async ({
    page,
  }) => {
    // C8: Self: KHÔNG có `Viết Kudo`
    await page.goto("/profile");

    const statisticsText = page.locator("text=Số Kudos bạn nhận được:");
    await expect(statisticsText).toBeVisible();

    // Self renders the statistics panel INSTEAD of the bar — the two are
    // mutually exclusive (C8), whether the bar is a button or a link.
    await expect(page.locator("[data-testid=profile-write-kudo]")).toHaveCount(
      0,
    );
  });

  test("[C8b] Other view has the Write Kudo bar and no statistics card", async ({
    page,
  }) => {
    // C8: Other: chỉ chứa thanh `Viết Kudo`. Self: KHÔNG có `Viết Kudo`.
    // The bar is no longer `disabled` — FUN_006/007 shipped, and C11 covers
    // where it now leads. What C8 is actually about, and what still holds,
    // is that the bar and the statistics panel never co-render.
    await page.goto(`/profile?id=${otherUserId}`);

    await expect(
      page.locator("[data-testid=profile-write-kudo]"),
    ).toBeVisible();

    const statisticsText = page.locator("text=Số Kudos bạn nhận được:");
    await expect(statisticsText).toHaveCount(0);
  });

  // C9: Kudos direction dropdown — self vs other
  test("[C9a] Self view: direction dropdown has 2 options", async ({
    page,
  }) => {
    // C9: self → đúng 2 option, trigger `Đã nhận (0)` / `Đã gửi (0)`
    await page.goto("/profile");

    const combobox = page.getByRole("combobox").first();
    await expect(combobox).toBeVisible();

    // Open dropdown
    await combobox.click();

    // Verify both options exist using role-based selectors
    const receivedOption = page.getByRole("option", { name: /Đã nhận/ });
    const sentOption = page.getByRole("option", { name: /Đã gửi/ });

    await expect(receivedOption).toHaveCount(1);
    await expect(sentOption).toHaveCount(1);
  });

  test("[C9b] Other view: direction dropdown has only Received option", async ({
    page,
  }) => {
    // C9: other → đúng 1 option Received, **không có** Sent
    await page.goto(`/profile?id=${otherUserId}`);

    const combobox = page.getByRole("combobox").first();
    await expect(combobox).toBeVisible();

    // Open dropdown
    await combobox.click();

    // Verify Received exists
    const receivedOption = page.getByRole("option", { name: /Đã nhận/ });
    await expect(receivedOption).toHaveCount(1);

    // Verify Sent does NOT exist anywhere on page (SEC_001)
    const sentOption = page.getByRole("option", { name: /Đã gửi/ });
    await expect(sentOption).toHaveCount(0);
  });

  // C10: Empty state copy when selecting a direction
  test("[C10] Dropdown selection shows empty state copy", async ({ page }) => {
    // C10: Chọn 1 chiều → hiển thị đúng copy rỗng tương ứng
    await page.goto("/profile");

    const combobox = page.getByRole("combobox").first();
    await expect(combobox).toBeVisible();

    // Initial state: Received direction selected by default
    const receivedEmptyText = page.locator(
      "text=Bạn chưa có Kudos nào được nhận.",
    );
    const sentEmptyText = page.locator("text=Bạn chưa có Kudos nào được gửi.");

    // Verify received empty copy is visible initially
    await expect(receivedEmptyText).toBeVisible();
    await expect(sentEmptyText).toHaveCount(0);

    // Switch to Sent direction
    await combobox.click();
    const sentOption = page.getByRole("option", { name: /Đã gửi/ });
    await expect(sentOption).toHaveCount(1);
    await sentOption.click();

    // Verify sent empty copy is now visible, received is not
    await expect(sentEmptyText).toBeVisible();
    await expect(receivedEmptyText).toHaveCount(0);

    // Switch back to Received direction
    await combobox.click();
    const receivedOption = page.getByRole("option", { name: /Đã nhận/ });
    await expect(receivedOption).toHaveCount(1);
    await receivedOption.click();

    // Verify received empty copy is visible again
    await expect(receivedEmptyText).toBeVisible();
    await expect(sentEmptyText).toHaveCount(0);
  });

  // C11: Write Kudo button does not open dialog
  test("[C11] Write Kudo on another Sunner's profile opens compose for them", async ({
    page,
  }) => {
    // Was: the bar is `disabled` and opens nothing (FUN_006/007 "deferred to
    // F007+"). Those features shipped, so the bar now works — it links to
    // /kudos?compose=<id>, the one screen that owns the compose dialog.
    await page.goto(`/profile?id=${otherUserId}`);

    // No dialog on /profile itself — the screen still mounts none.
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);

    const writeKudo = page.locator("[data-testid=profile-write-kudo]");
    await expect(writeKudo).toBeVisible();
    await expect(writeKudo).toHaveAttribute(
      "href",
      `/kudos?compose=${otherUserId}`,
    );

    await writeKudo.click();
    await page.waitForURL(/\/kudos\?compose=/);

    // Lands on /kudos with the dialog already open AND that Sunner chosen —
    // the point of the link, not just the navigation.
    const dialog = page.locator("[data-testid=kudos-compose-dialog]");
    await expect(dialog).toHaveAttribute("open", "");
    const recipient = dialog.locator("[data-testid=kudos-recipient-input]");
    await expect(recipient).not.toHaveValue("");
  });

  // C12: Malformed ?id= returns 404
  test("[C12] Malformed ?id=not-a-uuid returns 404", async ({ page }) => {
    // C12: `page.goto("/profile?id=not-a-uuid")` → `response.status() === 404`
    // This assertion proves syntactic rejection at the route level.
    // Note: The "no database query issued" part is not observable from the browser
    // because `getProfileCard` is server-side (src/lib/supabase/server), so
    // profile_cards is never sent over the network. The syntactic validation is
    // unit-tested in src/app/(protected)/profile/_utils/parse-profile-id.test.ts.
    const response = await page.goto("/profile?id=not-a-uuid");
    expect(response?.status()).toBe(404);
  });

  // C13: Repeated ?id= returns 404
  test("[C13] Repeated ?id=a&id=b returns 404", async ({ page }) => {
    // C13: `page.goto("/profile?id=a&id=b")` → `response.status() === 404`
    const response = await page.goto("/profile?id=a&id=b");
    expect(response?.status()).toBe(404);
  });

  // C14: No ?id= parameter shows self profile
  test("[C14] No ?id= parameter shows self profile", async ({ page }) => {
    // C14: `page.goto("/profile")` (không tham số, đã đăng nhập) → hero là hồ sơ mình
    await page.goto("/profile");

    const heading = page.locator("h1, h2, h3");
    const selfHeading = heading.filter({
      hasText: "E2E Self Sunner",
    });
    await expect(selfHeading).toHaveCount(1);
  });

  // C15: ?id= equal to self canonicalizes to /profile (no ?id=)
  test("[C15] ?id= equal to self canonicalizes to /profile", async ({
    page,
  }) => {
    // C15: `page.goto("/profile?id={id chính mình}")` → sau `waitForURL`, search === ""
    await page.goto(`/profile?id=${selfUserId}`);
    await page.waitForURL("/profile");

    const url = new URL(page.url());
    expect(url.search).toBe("");
    expect(url.pathname).toBe("/profile");
  });

  // C16: Response does not contain email or role
  test("[C16] Profile response does not expose email or role", async ({
    page,
  }) => {
    // C16: Response của request đọc hồ sơ người khác KHÔNG chứa field `email` hay `role`
    // Assert against rendered HTML: the other user's email and auth ID must not
    // appear in the page payload, even though the browser never sees the
    // database response (server-side getProfileCard via @/lib/supabase/server).
    await page.goto(`/profile?id=${otherUserId}`);
    await page.waitForLoadState("load");

    const html = await page.content();

    // The other user's email address must not leak into rendered HTML (SEC_004)
    // We know this fixture email from sign-in helper
    expect(html).not.toContain("e2e-profile-other@example.com");

    // The other user's auth ID must not appear in visible UI (SEC_004 corollary).
    // Note: The id legitimately appears in the RSC flight payload (`self.__next_f`)
    // inside <script> tags because the test itself provided it via ?id= URL parameter.
    // Per migrations/0001: public.users.id IS auth.users.id (same UUID, FK/PK).
    // The assertion worth defending is "the visible UI never displays a raw UUID",
    // which we verify by checking the visible region (<main>), not the script layer.
    const visibleText = await page.locator("main").innerText();
    expect(visibleText).not.toContain(otherUserId);
  });

  // C18: No spam chips in DOM
  test("[C18] No spam chips in profile feed", async ({ page }) => {
    // C18: Chip Spam KHÔNG BAO GIỜ có trong DOM (feed luôn rỗng)
    await page.goto("/profile");

    const spamChip = page.locator("[data-chip='spam'], .spam-chip");
    await expect(spamChip).toHaveCount(0);
  });
});
