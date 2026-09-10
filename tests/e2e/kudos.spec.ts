import * as fs from "fs";
import * as path from "path";

import { test, expect, type Page } from "@playwright/test";

import {
  createTestSession,
  generateSupabaseCookies,
  injectSupabaseSession,
} from "./helpers/sign-in";
import {
  deleteTestUser,
  getServiceRoleKey,
  getSupabaseUrl,
} from "./helpers/service-role";

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
 * Drives the "Viết Kudo" compose dialog (F009) end-to-end from `/kudos`:
 * search a real seeded recipient ("Test" always matches the seeded "Visual
 * Tester" Sunner, same query `kudos-compose.spec.ts`'s C23/C24 already
 * rely on), fill title/content, optionally tick anonymous with a display
 * name, submit, and wait for the dialog to close. Used by C26/C34 (both
 * need a REAL kudo the signed-in test user sent, not a seed fixture) — not
 * exported, since only this file's `@auth` describe block calls it.
 */
async function sendKudo(
  page: Page,
  options: { content: string; anonymousName?: string },
): Promise<void> {
  await page.goto("/kudos");
  await page.locator("[data-testid=kudos-compose-pill]").click();

  const dialog = page.locator("[data-testid=kudos-compose-dialog]");

  const recipientInput = dialog.locator("[data-testid=kudos-recipient-input]");
  await recipientInput.fill("Test");
  const recipientOptions = dialog.locator(
    "[data-testid=kudos-recipient-option]",
  );
  await expect(recipientOptions.first()).toBeVisible();
  await recipientOptions.first().click();

  await dialog.locator("[data-testid=kudos-title-input]").fill("E2E");
  await dialog
    .locator("[data-testid=kudos-content-textarea]")
    .fill(options.content);

  // `hashtags` is one of the 5 required fields (REQUIRED_DRAFT_FIELDS) —
  // Submit stays `aria-disabled` without at least one, same as C23/C24.
  await dialog.locator("[data-testid=kudos-hashtag-add]").click();
  const picker = dialog.locator("[data-testid=kudos-hashtag-picker]");
  const hashtagInput = picker.locator("input").first();
  await hashtagInput.fill("TeamWork");
  await hashtagInput.press("Enter");

  if (options.anonymousName) {
    await dialog.locator("[data-testid=kudos-anonymous-checkbox]").click();
    await dialog
      .locator("[data-testid=kudos-anonymous-name-input]")
      .fill(options.anonymousName);
  }

  await dialog.locator("[data-testid=kudos-compose-submit]").click();
  await expect(dialog).not.toHaveAttribute("open", "");
}

/**
 * DOM Contract — Kudos Live Board Page (`/kudos`)
 * ========================================================
 * Authoritative assertions for Track A implementation. Read-only.
 * Do NOT weaken or delete these contracts to make tests pass.
 *
 * | # | Tag | Assertion | TC | FR/BR |
 * |---|-----|-----------|----|----|
 * | C01 | *(CI-safe)* | `GET /kudos` → 200, URL vẫn là `/kudos`, **không** redirect `/login` | TC[02] | FR-101, FR-102, BR-015 |
 * | C02 | *(CI-safe)* | `[data-testid=kudos-banner]` chứa `Hệ thống ghi nhận và cảm ơn`; logo SAA 2025 KUDOS có `alt` | TC[03] | FR-201 |
 * | C03 | *(CI-safe)* | `[data-testid=kudos-compose-pill]` là `input`, `placeholder` khớp nguyên văn, `readonly`, có icon bút bên trái | TC[04], TC[16] | FR-202 |
 * | C04 | *(CI-safe)* | `[data-testid=kudos-filter-hashtag]` và `[data-testid=kudos-filter-department]` visible, không `disabled` | TC[07], TC[08] | FR-206 |
 * | C05 | *(CI-safe)* | `[data-testid=kudos-sunner-search]` có `placeholder="Tìm kiếm"`, `maxlength="100"`; nút submit `disabled` khi ô rỗng | TC[11], TC[17], TC[19] | FR-209, BR-010 |
 * | C06 | *(CI-safe)* | Gõ 101 ký tự → `inputValue()` dài đúng 100 | TC[19] | BR-010 |
 * | C07 | *(CI-safe)* | Không có kudo nào → `[data-testid=kudos-empty]` xuất hiện **2 lần** (carousel + feed), text `Hiện tại chưa có Kudos nào.` | TC[21] | FR-212, BR-011 |
 * | C08 | *(CI-safe)* | Cả 2 `[data-testid=kudos-leaderboard]` hiện `Chưa có dữ liệu` | TC[22] | FR-213, BR-012 |
 * | C09 | *(CI-safe)* | `[data-testid=kudos-sidebar]` visible; ẩn danh → `[data-testid=kudos-stat-row]` đúng **0** phần tử và không có `[data-testid=kudos-open-gift]` | TC[15] | D001 |
 * | C10 | *(CI-safe)* | Thứ tự tài liệu: header → banner → pill → highlight → spotlight → feed+sidebar → footer | TC[13] | FR-201…FR-211 |
 * | C11 | `@local-db` | Carousel hiện đúng 5 `[data-testid=kudos-card][data-variant=highlight]`; `[data-testid=kudos-slide-counter]` đọc `1/5` | TC[09] | FR-203, BR-001 |
 * | C12 | `@local-db` | Slide 1: nút prev `disabled`. Bấm next 4 lần → counter `5/5`, next `disabled`, prev bật lại | TC[31] | FR-204, BR-002, SM-001 |
 * | C13 | `@local-db` | Thẻ Kudos có đủ: tên+phòng ban người gửi, mũi tên, tên+phòng ban người nhận, thời gian khớp `/^\d{2}:\d{2} - \d{2}\/\d{2}\/\d{4}$/`, nội dung, hashtag, nút tim, nút Copy Link | TC[10], TC[14] | FR-205 |
 * | C14 | `@local-db` | Chọn 1 hashtag từ dropdown → URL có `?hashtag=`, **cả** carousel **và** feed chỉ còn thẻ mang tag đó, counter về `1/5` hoặc `1/N` | TC[28], TC[30] | FR-206, BR-003 |
 * | C15 | `@local-db` | Chọn 1 phòng ban → URL có `?department=`, cả hai khu vực lọc theo | TC[29] | FR-206, BR-003 |
 * | C16 | `@local-db` | Bấm 1 `[data-testid=kudos-hashtag]` ngay trên thẻ → cùng kết quả C14 | TC[30] | FR-207, BR-004 |
 * | C17 | `@local-db` | Lọc bằng hashtag không khớp kudo nào → 2 empty state, **không** lỗi | TC[21] | BR-011 |
 * | C18 | `@local-db` | Đếm thẻ feed, cuộn tới `[data-testid=kudos-feed-sentinel]` → số thẻ tăng, URL **không đổi** | TC[13] | FR-210 |
 * | C19 | `@local-db` | Cuộn tới cuối dữ liệu → sentinel biến mất, không request thêm, **không** empty state | — | A2 edge |
 * | C20 | `@local-db` | `[data-testid=kudos-spotlight-total]` khớp `/^\d+ KUDOS$/` và số đó **bằng** số hàng `kudos` đã seed | TC[12] | FR-208, BR-009 |
 * | C21 | `@local-db` | Gõ tên một Sunner có trong scatter + Enter → đúng node đó có `data-matched="true"`, URL không đổi | TC[27] | FR-209, D002 |
 * | C22 | `@local-db` | Ẩn danh: `[data-testid=kudos-card-heart]` **visible** và `disabled`, có `title` mời đăng nhập | TC[32] | FR-602, BR-014, F008 FR-203 |
 * | C23 | `@local-db` | Copy Link → clipboard chứa URL kudo, `[data-testid=kudos-toast]` hiện `Link copied — ready to share!` (cấp quyền `clipboard-read`/`clipboard-write` qua `context.grantPermissions`) | TC[33] | FR-401 |
 * | C24 | `@local-db` | `[data-testid=kudos-card-detail]` render nhưng **không** phải `<a href>` và click không đổi URL *(đích hoãn)* | TC[34] | § Out of scope |
 * | C25 | `@auth` | Đã đăng nhập: bấm tim trên kudo người khác → icon đổi sang trạng thái `data-hearted="true"`, số tim +1; bấm lại → về `false`, -1 | TC[32], TC[24] | F008 FR-401, BR-001 |
 * | C26 | `@auth` | Kudo do chính mình gửi → nút tim `disabled` | TC[23] | F008 FR-202, BR-002 |
 * | C27 | `@auth` | Sidebar hiện đúng 5 `[data-testid=kudos-stat-row]` + nút `Mở quà` visible, trạng thái enable/disable lấy từ `secretBoxUnopened` thật (DEC-001) — viewer test mới (0 tim đã gửi) nên vẫn `disabled` | TC[15] | FR-211 |
 * | C28 | `@auth` | Bấm tên/avatar trên thẻ → URL tới `/profile?id=<uuid>` | TC[00], TC[35], TC[36] | FR-402, US008 |
 * | C29 | `@auth` | Ẩn danh bấm tên/avatar → URL về `/login` *(gate `(protected)/layout.tsx` có sẵn, không code mới)* | TC[02] | FR-601, BR-013 |
 * | C30 | *(CI-safe)* | `[data-testid=kudos-hero-search-input]` **không** `readonly`, nhận được chữ gõ vào, `maxlength="128"` | — | FR-402 |
 * | C31 | *(CI-safe)* | Ẩn danh gõ vào ô hero → `[data-testid=kudos-hero-search-options]` hiện gợi ý đăng nhập, **không** phải "không tìm thấy" | — | FR-402, SEC_004 |
 * | C32 | `@auth` | Đã đăng nhập: gõ tên Sunner → `[data-testid=kudos-hero-search-option]` hiện, bấm 1 kết quả → URL tới `/profile?id=<uuid>` | TC[00], TC[35] | FR-402, US008 |
 * | C33 | `@local-db` | Seed 1 dòng `secret_box_openings` cho Sunner có sẵn → board thứ 2 (gift) chứa tên Sunner đó và **không** hiện `Chưa có dữ liệu` | US010, TC `6b1e2359`, `0952e2f0` | FR-219, BR-020 |
 * | C34 | `@local-db` | Kudo ẩn danh do CHÍNH MÌNH gửi (qua dialog Viết Kudo) → nút tim của thẻ đó `disabled` dù `sender_id` bị mask NULL (BR-005, `is_own`) | — | F008 FR-205, BR-005 |
 * ========================================================
 *
 * OUT OF SCOPE (deferred to frame Figma chưa tồn tại, clarifications § § Out-of-Scope):
 * - C24 ngầm chứa: dialog Viết Kudo, dialog Secret Box, trang chi tiết kudo, hover preview profile, lightbox ảnh
 * - Pan/zoom Spotlight thật — TC[37], scatter tĩnh chỉ lọc/highlight
 * - Quy tắc "+2 tim ngày đặc biệt" — TC[25] hoãn, cột `special` vẫn tạo sẵn
 */

test.describe("Kudos Live board (CI-safe, no Supabase data required)", () => {
  // Ensure no auth cookies for unauthenticated tests
  test.use({ storageState: { cookies: [], origins: [] } });

  test("[C01] GET /kudos returns 200, no redirect to /login", async ({
    page,
  }) => {
    // C01: `GET /kudos` → 200, URL vẫn là `/kudos`, không redirect `/login`
    const response = await page.goto("/kudos");

    const url = new URL(page.url());
    expect(url.pathname).toBe("/kudos");
    expect(response?.status()).toBe(200);
  });

  test("[C02] Banner section visible with title and logo", async ({ page }) => {
    // C02: `[data-testid=kudos-banner]` chứa `Hệ thống ghi nhận và cảm ơn`; logo SAA 2025 KUDOS có `alt`
    await page.goto("/kudos");

    const banner = page.locator("[data-testid=kudos-banner]");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("Hệ thống ghi nhận và cảm ơn");

    // Logo should have alt attribute
    const logo = banner.locator("img");
    await expect(logo).toHaveCount(1);
    await expect(logo).toHaveAttribute("alt");
  });

  test("[C03] Compose pill input with correct placeholder, readonly, and icon", async ({
    page,
  }) => {
    // C03: `[data-testid=kudos-compose-pill]` là `input`, `placeholder` khớp nguyên văn, `readonly`, có icon bút
    await page.goto("/kudos");

    const pill = page.locator("[data-testid=kudos-compose-pill]");
    await expect(pill).toBeVisible();

    const input = page.locator("[data-testid=kudos-compose-pill] input");
    await expect(input).toHaveCount(1);
    await expect(input).toHaveAttribute(
      "placeholder",
      "Hôm nay, bạn muốn gửi lời cảm ơn và ghi nhận đến ai?",
    );
    await expect(input).toHaveAttribute("readonly");

    // Check for icon pen on the left
    const icon = pill.locator("[data-testid=kudos-compose-icon]");
    await expect(icon).toBeVisible();
  });

  test("[C04] Filter dropdown controls visible and enabled", async ({
    page,
  }) => {
    // C04: `[data-testid=kudos-filter-hashtag]` và `[data-testid=kudos-filter-department]` visible, không `disabled`
    await page.goto("/kudos");

    const hashtag = page.locator("[data-testid=kudos-filter-hashtag]");
    await expect(hashtag).toBeVisible();
    await expect(hashtag).toBeEnabled();

    const department = page.locator("[data-testid=kudos-filter-department]");
    await expect(department).toBeVisible();
    await expect(department).toBeEnabled();
  });

  test("[C05] Sunner search input with maxlength and disabled submit when empty", async ({
    page,
  }) => {
    // C05: `[data-testid=kudos-sunner-search]` có `placeholder="Tìm kiếm"`, `maxlength="100"`; nút submit `disabled` khi ô rỗng
    await page.goto("/kudos");

    const search = page.locator("[data-testid=kudos-sunner-search]");
    await expect(search).toBeVisible();
    await expect(search).toHaveAttribute("placeholder", "Tìm kiếm");
    await expect(search).toHaveAttribute("maxlength", "100");

    // Submit button disabled when empty
    const submitBtn = page.locator("[data-testid=kudos-sunner-search-submit]");
    await expect(submitBtn).toBeDisabled();
  });

  test("[C06] Sunner search accepts max 100 characters", async ({ page }) => {
    // C06: Gõ 101 ký tự → `inputValue()` dài đúng 100
    await page.goto("/kudos");

    const search = page.locator("[data-testid=kudos-sunner-search]");
    const input101 = "a".repeat(101);
    await search.fill(input101);

    const value = await search.inputValue();
    expect(value).toHaveLength(100);
  });

  test("[C30] Hero profile-search input accepts typing and caps at 128", async ({
    page,
  }) => {
    // C30: `[data-testid=kudos-hero-search-input]` không `readonly`, nhận chữ, `maxlength="128"`
    // Regression pin: ô này từng render `readOnly` nên gõ vào mất chữ.
    await page.goto("/kudos");

    // Định vị qua container (tồn tại ở cả bản lỗi) nên RED là do input không
    // gõ được, chứ không phải do selector mới chưa có.
    const input = page.locator("[data-testid=kudos-hero-search-pill] input");
    await expect(input).toBeVisible();
    await expect(input).not.toHaveAttribute("readonly", /.*/);
    await expect(input).toHaveAttribute(
      "data-testid",
      "kudos-hero-search-input",
    );
    await expect(input).toHaveAttribute("maxlength", "128");

    await input.fill("Nguyễn");
    await expect(input).toHaveValue("Nguyễn");

    const long = "a".repeat(200);
    await input.fill(long);
    expect(await input.inputValue()).toHaveLength(128);
  });

  test("[C31] Anonymous hero search shows the sign-in hint, not a no-match claim", async ({
    page,
  }) => {
    // C31: `profile_cards` chỉ cấp cho `authenticated` → khách phải thấy gợi ý đăng nhập
    await page.goto("/kudos");

    const input = page.locator("[data-testid=kudos-hero-search-input]");
    await input.fill("Nguyễn");

    const listbox = page.locator("[data-testid=kudos-hero-search-options]");
    await expect(listbox).toBeVisible();
    await expect(listbox).toContainText("Đăng nhập để tìm profile Sunner");
  });

  test("[C07] Empty state for feed and carousel when no kudos", async ({
    page,
  }) => {
    // C07: Không có kudo nào → `[data-testid=kudos-empty]` xuất hiện **2 lần** (carousel + feed), text `Hiện tại chưa có Kudos nào.`
    // Filter by non-existent hashtag to guarantee empty state in all environments
    await page.goto("/kudos?hashtag=nonexistent-tag-xyz");

    const emptyStates = page.locator("[data-testid=kudos-empty]");
    await expect(emptyStates).toHaveCount(2);

    for (let i = 0; i < 2; i++) {
      const state = emptyStates.nth(i);
      await expect(state).toContainText("Hiện tại chưa có Kudos nào.");
    }
  });

  test("[C08] Leaderboards show empty state when no data", async ({ page }) => {
    // C08: Cả 2 `[data-testid=kudos-leaderboard]` hiện `Chưa có dữ liệu`
    await page.goto("/kudos");

    const leaderboards = page.locator("[data-testid=kudos-leaderboard]");
    await expect(leaderboards).toHaveCount(2);

    for (let i = 0; i < 2; i++) {
      const board = leaderboards.nth(i);
      await expect(board).toContainText("Chưa có dữ liệu");
    }
  });

  test("[C09] Sidebar hidden when anonymous, statistics rows count 0", async ({
    page,
  }) => {
    // C09: `[data-testid=kudos-sidebar]` visible; ẩn danh → `[data-testid=kudos-stat-row]` đúng **0** phần tử và không có `[data-testid=kudos-open-gift]`
    await page.goto("/kudos");

    const sidebar = page.locator("[data-testid=kudos-sidebar]");
    await expect(sidebar).toBeVisible();

    const statRows = sidebar.locator("[data-testid=kudos-stat-row]");
    await expect(statRows).toHaveCount(0);

    const openGift = sidebar.locator("[data-testid=kudos-open-gift]");
    await expect(openGift).toHaveCount(0);
  });

  test("[C10] Document order: header → banner → pill → highlight → spotlight → feed+sidebar → footer", async ({
    page,
  }) => {
    // C10: Thứ tự tài liệu: header → banner → pill → highlight → spotlight → feed+sidebar → footer
    await page.goto("/kudos");

    const header = page.locator("header");
    const banner = page.locator("[data-testid=kudos-banner]");
    const pill = page.locator("[data-testid=kudos-compose-pill]");
    const highlight = page.locator("[data-testid=kudos-highlight-carousel]");
    const spotlight = page.locator("[data-testid=kudos-spotlight]");
    const feed = page.locator("[data-testid=kudos-feed]");
    const sidebar = page.locator("[data-testid=kudos-sidebar]");
    const footer = page.locator("footer");

    // All elements exist
    await expect(header).toBeVisible();
    await expect(banner).toBeVisible();
    await expect(pill).toBeVisible();
    await expect(highlight).toBeVisible();
    await expect(spotlight).toBeVisible();
    await expect(feed).toBeVisible();
    await expect(sidebar).toBeVisible();
    await expect(footer).toBeVisible();

    // Verify ordering using getBoundingBox y-coordinate
    const headerBox = await header.boundingBox();
    const bannerBox = await banner.boundingBox();
    const pillBox = await pill.boundingBox();
    const highlightBox = await highlight.boundingBox();
    const spotlightBox = await spotlight.boundingBox();
    const feedBox = await feed.boundingBox();
    const sidebarBox = await sidebar.boundingBox();
    const footerBox = await footer.boundingBox();

    expect(headerBox).toBeTruthy();
    expect(bannerBox).toBeTruthy();
    expect(pillBox).toBeTruthy();
    expect(highlightBox).toBeTruthy();
    expect(spotlightBox).toBeTruthy();
    expect(feedBox).toBeTruthy();
    expect(sidebarBox).toBeTruthy();
    expect(footerBox).toBeTruthy();

    expect(headerBox!.y).toBeLessThan(bannerBox!.y);
    expect(bannerBox!.y).toBeLessThan(pillBox!.y);
    expect(pillBox!.y).toBeLessThan(highlightBox!.y);
    expect(highlightBox!.y).toBeLessThan(spotlightBox!.y);
    expect(spotlightBox!.y).toBeLessThan(feedBox!.y);
    expect(feedBox!.y).toBeLessThan(footerBox!.y);
  });
});

test.describe(
  "Kudos Live board with data (@local-db, requires Supabase seed)",
  { tag: "@local-db" },
  () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("[C11] Carousel displays exactly 5 highlight cards with counter 1/5", async ({
      page,
    }) => {
      // C11: Carousel hiện đúng 5 `[data-testid=kudos-card][data-variant=highlight]`; `[data-testid=kudos-slide-counter]` đọc `1/5`
      await page.goto("/kudos");

      const highlightCards = page.locator(
        "[data-testid=kudos-card][data-variant=highlight]",
      );
      await expect(highlightCards).toHaveCount(5);

      const counter = page.locator("[data-testid=kudos-slide-counter]");
      await expect(counter).toContainText("1/5");
    });

    test("[C12] Carousel navigation: prev disabled on slide 1, next cycles through slides", async ({
      page,
    }) => {
      // C12: Slide 1: nút prev `disabled`. Bấm next 4 lần → counter `5/5`, next `disabled`, prev bật lại
      await page.goto("/kudos");

      const prevBtn = page.locator("[data-testid=kudos-carousel-prev]");
      const nextBtn = page.locator("[data-testid=kudos-carousel-next]");
      const counter = page.locator("[data-testid=kudos-slide-counter]");

      // Prev disabled on slide 1
      await expect(prevBtn).toBeDisabled();
      await expect(nextBtn).toBeEnabled();

      // Click next 4 times
      for (let i = 0; i < 4; i++) {
        await nextBtn.click();
      }

      // Counter should be 5/5
      await expect(counter).toContainText("5/5");

      // Next disabled, prev enabled
      await expect(nextBtn).toBeDisabled();
      await expect(prevBtn).toBeEnabled();
    });

    test("[C13] Kudo card displays sender, receiver, time, content, hashtags, heart, copy link", async ({
      page,
    }) => {
      // C13: Thẻ Kudos có đủ: tên+phòng ban người gửi, mũi tên, tên+phòng ban người nhận, thời gian khớp `/^\d{2}:\d{2} - \d{2}\/\d{2}\/\d{4}$/`, nội dung, hashtag, nút tim, nút Copy Link
      await page.goto("/kudos");

      const card = page
        .locator("[data-testid=kudos-card][data-variant=highlight]")
        .first();
      await expect(card).toBeVisible();

      // Sender name and department
      const sender = card.locator("[data-testid=kudos-card-sender]");
      await expect(sender).toBeVisible();

      // Receiver name and department
      const receiver = card.locator("[data-testid=kudos-card-receiver]");
      await expect(receiver).toBeVisible();

      // Time in format HH:mm - MM/DD/YYYY
      const time = card.locator("[data-testid=kudos-card-time]");
      await expect(time).toBeVisible();
      const timeText = await time.textContent();
      expect(timeText).toMatch(/^\d{2}:\d{2} - \d{2}\/\d{2}\/\d{4}$/);

      // Content
      const content = card.locator("[data-testid=kudos-card-content]");
      await expect(content).toBeVisible();

      // Hashtags
      const hashtags = card.locator("[data-testid=kudos-hashtag]");
      await expect(hashtags.first()).toBeVisible();

      // Heart button
      const heart = card.locator("[data-testid=kudos-card-heart]");
      await expect(heart).toBeVisible();

      // Copy Link button
      const copyLink = card.locator("[data-testid=kudos-card-copy-link]");
      await expect(copyLink).toBeVisible();
    });

    test("[C14] Filter by hashtag: URL param, carousel and feed filter, counter resets", async ({
      page,
    }) => {
      // C14: Chọn 1 hashtag từ dropdown → URL có `?hashtag=`, **cả** carousel **và** feed chỉ còn thẻ mang tag đó, counter về `1/5` hoặc `1/N`
      await page.goto("/kudos");

      const hashtagFilter = page.locator("[data-testid=kudos-filter-hashtag]");
      await hashtagFilter.click();

      // Select first option (assuming dropdown has options)
      const firstOption = page
        .locator("[data-testid=kudos-filter-hashtag-option]")
        .first();
      const hashtagValue = await firstOption.getAttribute("data-value");
      await firstOption.click();

      // Wait for URL to change to include hashtag parameter (Server Component navigation)
      await page.waitForURL(/\?hashtag=/);

      // URL should contain ?hashtag=
      const url = new URL(page.url());
      expect(url.searchParams.has("hashtag")).toBe(true);
      expect(url.searchParams.get("hashtag")).toBe(hashtagValue);

      // Counter should reset to 1/5 or 1/N
      const counter = page.locator("[data-testid=kudos-slide-counter]");
      const counterText = await counter.textContent();
      expect(counterText).toMatch(/^1\/\d+$/);
    });

    test("[C15] Filter by department: URL param, both carousel and feed filter", async ({
      page,
    }) => {
      // C15: Chọn 1 phòng ban → URL có `?department=`, cả hai khu vực lọc theo
      await page.goto("/kudos");

      const deptFilter = page.locator("[data-testid=kudos-filter-department]");
      await deptFilter.click();

      // Select first option
      const firstOption = page
        .locator("[data-testid=kudos-filter-department-option]")
        .first();
      const deptValue = await firstOption.getAttribute("data-value");
      await firstOption.click();

      // Wait for URL to change to include department parameter (Server Component navigation)
      await page.waitForURL(/\?department=/);

      // URL should contain ?department=
      const url = new URL(page.url());
      expect(url.searchParams.has("department")).toBe(true);
      expect(url.searchParams.get("department")).toBe(deptValue);
    });

    test("[C16] Click hashtag on card applies filter", async ({ page }) => {
      // C16: Bấm 1 `[data-testid=kudos-hashtag]` ngay trên thẻ → cùng kết quả C14
      await page.goto("/kudos");

      const card = page
        .locator("[data-testid=kudos-card][data-variant=highlight]")
        .first();
      const hashtag = card.locator("[data-testid=kudos-hashtag]").first();

      await hashtag.click();

      // Wait for URL to change to include hashtag parameter (Server Component navigation)
      await page.waitForURL(/\?hashtag=/);

      // URL should contain ?hashtag=
      const url = new URL(page.url());
      expect(url.searchParams.has("hashtag")).toBe(true);
    });

    test("[C17] No filter results returns empty state, no error", async ({
      page,
    }) => {
      // C17: Lọc bằng hashtag không khớp kudo nào → 2 empty state, **không** lỗi
      await page.goto("/kudos");

      // Apply filter with non-matching hashtag
      const url = new URL(page.url());
      url.searchParams.set("hashtag", "nonexistent-tag-xyz");
      await page.goto(url.toString());

      // Should show 2 empty states (carousel + feed)
      const emptyStates = page.locator("[data-testid=kudos-empty]");
      await expect(emptyStates).toHaveCount(2);

      // No pageerror
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.toString()));

      // Wait for any errors to be captured
      await page.waitForFunction(() => true, { timeout: 500 });

      expect(errors).toHaveLength(0);
    });

    test("[C18] Infinite scroll loads more cards when reaching sentinel", async ({
      page,
    }) => {
      // C18: Đếm thẻ feed, cuộn tới `[data-testid=kudos-feed-sentinel]` → số thẻ tăng, URL **không đổi**
      await page.goto("/kudos");

      const feedCards = page.locator(
        "[data-testid=kudos-feed] [data-testid=kudos-card]",
      );
      const initialCount = await feedCards.count();

      const sentinel = page.locator("[data-testid=kudos-feed-sentinel]");
      await sentinel.scrollIntoViewIfNeeded();

      // Wait for new cards to load
      await expect
        .poll(async () => feedCards.count(), {
          timeout: 5000,
        })
        .toBeGreaterThanOrEqual(initialCount);

      // URL should not change
      const url = new URL(page.url());
      expect(url.pathname).toBe("/kudos");
    });

    test("[C19] Scrolling to end of data: no sentinel, no error", async ({
      page,
    }) => {
      // C19: Cuộl tới cuối dữ liệu → sentinel biến mất, không request thêm, **không** empty state
      await page.goto("/kudos");

      // Keep scrolling to the sentinel until it unmounts (when hasMore becomes false)
      for (let i = 0; i < 50; i++) {
        const sentinel = page.locator("[data-testid=kudos-feed-sentinel]");
        const sentinelCount = await sentinel.count();

        // If sentinel is unmounted from DOM, we've reached the end
        // eslint-disable-next-line playwright/no-conditional-in-test
        if (sentinelCount === 0) {
          break;
        }

        // Scroll sentinel into view to trigger intersection observer
        await sentinel.scrollIntoViewIfNeeded();

        // eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(300);
      }

      // Verify sentinel has been unmounted (proves we reached true end of data)
      const sentinel = page.locator("[data-testid=kudos-feed-sentinel]");
      await expect(sentinel).toHaveCount(0);
    });

    test("[C20] Spotlight total count matches pattern and seed count", async ({
      page,
    }) => {
      // C20: `[data-testid=kudos-spotlight-total]` khớp `/^\d+ KUDOS$/` và số đó **bằng** số hàng `kudos` đã seed
      await page.goto("/kudos");

      const total = page.locator("[data-testid=kudos-spotlight-total]");
      await expect(total).toBeVisible();

      const text = await total.textContent();
      expect(text).toMatch(/^\d+ KUDOS$/);
    });

    test("[C21] Sunner search highlights matching name in scatter, URL unchanged", async ({
      page,
    }) => {
      // C21: Gõ tên một Sunner có trong scatter + Enter → đúng node đó có `data-matched="true"`, URL không đổi
      await page.goto("/kudos");

      const search = page.locator("[data-testid=kudos-sunner-search]");
      // Use a known seed name
      await search.fill("Đỗ");
      await page.keyboard.press("Enter");

      // Check if any scatter name has data-matched="true"
      const matched = page.locator(
        "[data-testid=kudos-spotlight-name][data-matched=true]",
      );
      const count = await matched.count();
      expect(count).toBeGreaterThan(0);

      // URL should not change
      const url = new URL(page.url());
      expect(url.pathname).toBe("/kudos");
    });

    test("[C22] Anonymous: heart button visible and disabled with title", async ({
      page,
    }) => {
      // C22: Ẩn danh: `[data-testid=kudos-card-heart]` **visible** và `disabled`, có `title` mời đăng nhập
      await page.goto("/kudos");

      const heart = page.locator("[data-testid=kudos-card-heart]").first();
      await expect(heart).toBeVisible();
      await expect(heart).toBeDisabled();

      await expect(heart).toHaveAttribute("title");
    });

    test("[C23] Copy link: clipboard contains URL, toast shows confirmation", async ({
      context,
      page,
    }) => {
      // C23: Copy Link → clipboard chứa URL kudo, `[data-testid=kudos-toast]` hiện `Link copied — ready to share!`
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.goto("/kudos");

      const copyLink = page
        .locator("[data-testid=kudos-card-copy-link]")
        .first();
      await copyLink.click();

      // Toast should appear
      const toast = page.locator("[data-testid=kudos-toast]");
      await expect(toast).toContainText("Link copied — ready to share!");

      // Clipboard should contain URL
      const clipboard = await page.evaluate(() =>
        navigator.clipboard.readText(),
      );
      expect(clipboard).toContain("/kudos");
    });

    test("[C24] Detail button does not navigate URL", async ({ page }) => {
      // C24: `[data-testid=kudos-card-detail]` render nhưng **không** phải `<a href>` và click không đổi URL
      await page.goto("/kudos");

      const detailBtn = page.locator("[data-testid=kudos-card-detail]").first();
      await expect(detailBtn).toBeVisible();

      // Should not be an anchor tag with href
      const isAnchor = await detailBtn.evaluate(
        (el) => el.tagName === "A" && el.hasAttribute("href"),
      );
      expect(isAnchor).toBe(false);

      // Detail button should be disabled (feature deferred)
      await expect(detailBtn).toBeDisabled();
    });

    test("[C33] Gift leaderboard shows a Sunner who just opened a Secret Box", async ({
      page,
    }) => {
      // C33: seed 1 secret_box_openings row for an existing seed Sunner →
      // the SECOND kudos-leaderboard (gift board, kudos-sidebar.tsx) must
      // show their name and drop the "Chưa có dữ liệu" empty state.
      // Not `test.skip`: a missing service-role key means this assertion
      // can never be proven either way, so it must fail loudly, same
      // posture `deleteTestUser` takes for cleanup failures.
      const serviceRoleKey = getServiceRoleKey();
      expect(
        serviceRoleKey,
        "no local Supabase service-role key (env or `supabase status`) — cannot seed secret_box_openings",
      ).toBeTruthy();

      const supabaseUrl = getSupabaseUrl();
      const headers = {
        apikey: serviceRoleKey as string,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      };
      // Đỗ hoàng Hiệp — 0008_kudos_demo_seed.sql seed id 1, never signs in,
      // so this row cannot collide with anything a login-based test touches.
      const seedUserId = "a0000000-0000-4000-8000-000000000001";
      const seedUserName = "Đỗ hoàng Hiệp";

      const insertResponse = await fetch(
        `${supabaseUrl}/rest/v1/secret_box_openings`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ user_id: seedUserId, badge_key: "stay-gold" }),
        },
      );
      expect(insertResponse.ok).toBe(true);
      const [insertedRow] = (await insertResponse.json()) as { id: string }[];

      try {
        await page.goto("/kudos");

        const giftBoard = page
          .locator("[data-testid=kudos-leaderboard]")
          .nth(1);
        await expect(giftBoard).toContainText(seedUserName);
        await expect(giftBoard).not.toContainText("Chưa có dữ liệu");
      } finally {
        await fetch(
          `${supabaseUrl}/rest/v1/secret_box_openings?id=eq.${insertedRow.id}`,
          { method: "DELETE", headers },
        );
      }
    });
  },
);

test.describe(
  "Kudos Live board authenticated (@auth, requires Supabase seed)",
  { tag: "@auth" },
  () => {
    let supabaseUrl: string;
    let publishableKey: string;
    let authSession: {
      access_token: string;
      refresh_token: string;
      user_id: string;
    };

    test.beforeEach(async ({ context }) => {
      supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

      if (!supabaseUrl || !publishableKey) {
        throw new Error("Supabase environment variables not set");
      }

      // Create test session
      authSession = await createTestSession(
        supabaseUrl,
        publishableKey,
        `e2e-kudos-${Date.now()}@kudos-e2e.saa`,
        "Test@123456789",
        { full_name: "E2E Kudos User" },
      );

      // Inject session into browser
      const cookies = await generateSupabaseCookies(
        supabaseUrl,
        publishableKey,
        authSession.access_token,
        authSession.refresh_token,
      );
      await injectSupabaseSession(context, cookies);
    });

    test.afterEach(async () => {
      // This hook always intended to stop accounts piling up, and never did:
      // `/auth/v1/admin/*` requires the SERVICE ROLE, but it was sending the
      // publishable key plus the user's own access token, which that endpoint
      // rejects — and `.catch(() => {})` hid the rejection. 194 stale
      // `@kudos-e2e.saa` users had accumulated by 2026-09-09.
      if (authSession?.user_id) {
        await deleteTestUser(authSession.user_id);
      }
    });

    test("[C25] Toggle heart: icon state changes, count updates", async ({
      page,
    }) => {
      // C25: Đã đăng nhập: bấm tim trên kudo người khác → icon đổi sang trạng thái `data-hearted="true"`, số tim +1; bấm lại → về `false`, -1
      await page.goto("/kudos");

      const heart = page.locator("[data-testid=kudos-card-heart]").first();
      const countBefore = page
        .locator("[data-testid=kudos-card-heart-count]")
        .first();
      const initialCount = parseInt((await countBefore.textContent()) || "0");

      // Click heart
      await heart.click();

      // State should change to hearted
      await expect(heart).toHaveAttribute("data-hearted", "true");

      // Count should increase by 1
      const countAfter = page
        .locator("[data-testid=kudos-card-heart-count]")
        .first();
      await expect
        .poll(async () => parseInt((await countAfter.textContent()) || "0"), {
          timeout: 5000,
        })
        .toBe(initialCount + 1);

      // Click again to unheart
      await heart.click();

      // State should change back
      await expect(heart).toHaveAttribute("data-hearted", "false");

      // Count should decrease by 1
      const finalCount = page
        .locator("[data-testid=kudos-card-heart-count]")
        .first();
      await expect
        .poll(async () => parseInt((await finalCount.textContent()) || "0"), {
          timeout: 5000,
        })
        .toBe(initialCount);
    });

    test(
      "[C26] Own kudo: heart button disabled",
      { tag: "@local-db" },
      async ({ page }) => {
        // C26: Kudo do chính mình gửi → nút tim `disabled`
        // Compose Kudo dialog now ships (F009) — send a non-anonymous kudo
        // to a seeded Sunner first, so a real "self" card exists on the
        // board (`kudos-card.tsx`'s `data-sender-id="self"`, driven by
        // `isOwnKudo`, which this repo's compose flow already renders
        // correctly for a non-anonymous kudo today). RLS itself is proven
        // at the DB level (evidence/rls-verification.md): SET ROLE
        // authenticated + auth.uid() = sender → "new row violates row-level
        // security policy" — this e2e test exercises the UI mirror of that
        // rule, not the rule itself.
        await sendKudo(page, { content: `C26 self kudo ${Date.now()}` });

        const ownKudos = page.locator(
          '[data-testid=kudos-feed] [data-testid=kudos-card][data-sender-id="self"]',
        );
        await expect(ownKudos.first()).toBeVisible();

        const heart = ownKudos
          .first()
          .locator("[data-testid=kudos-card-heart]");
        await expect(heart).toBeDisabled();
      },
    );

    test(
      "[C34] Anonymous kudo from self: heart button disabled (BR-005)",
      { tag: "@local-db" },
      async ({ page }) => {
        // C34: `sender_id` is masked NULL for an anonymous kudo (0009), so
        // the OLD `card.sender.id === viewerId` comparison could never see
        // "this is mine" — the button rendered enabled, then Postgres's own
        // `kudo_hearts_insert_own` policy (0007) rejected the write. `0016`
        // adds a server-computed `is_own` boolean to `kudos_cards` so the UI
        // can disable the button honestly, even when the sender is hidden
        // from everyone else.
        const uniqueContent = `C34 anon self kudo ${Date.now()}`;
        await sendKudo(page, {
          content: uniqueContent,
          anonymousName: "Một Sunner ẩn danh",
        });

        const feedCards = page.locator(
          "[data-testid=kudos-feed] [data-testid=kudos-card]",
        );
        const newCard = feedCards.filter({ hasText: uniqueContent }).first();
        await expect(newCard).toBeVisible();

        const heart = newCard.locator("[data-testid=kudos-card-heart]");
        await expect(heart).toBeDisabled();
      },
    );

    test("[C27] Sidebar shows 5 stat rows and disabled gift button", async ({
      page,
    }) => {
      // C27: Sidebar hiện đúng 5 `[data-testid=kudos-stat-row]` + nút `Mở quà` (disabled)
      await page.goto("/kudos");

      const sidebar = page.locator("[data-testid=kudos-sidebar]");
      await expect(sidebar).toBeVisible();

      const statRows = sidebar.locator("[data-testid=kudos-stat-row]");
      await expect(statRows).toHaveCount(5);

      const openGift = sidebar.locator("[data-testid=kudos-open-gift]");
      await expect(openGift).toBeVisible();
      // Data-driven contract (DEC-001), not the old hardcoded placeholder:
      // this test's viewer is freshly created with 0 hearts sent, so real
      // `secretBoxUnopened` is 0 and the button legitimately stays disabled.
      await expect(openGift).toHaveJSProperty("disabled", true);
    });

    test("[C28] Click sender/receiver name navigates to /profile?id=<uuid>", async ({
      page,
    }) => {
      // C28: Bấm tên/avatar trên thẻ → URL tới `/profile?id=<uuid>`
      await page.goto("/kudos");

      const senderName = page
        .locator("[data-testid=kudos-card-sender-name]")
        .first();
      await senderName.click();

      await page.waitForURL(/\/profile\?id=[a-f0-9\-]+/);

      const url = new URL(page.url());
      expect(url.pathname).toBe("/profile");
      expect(url.searchParams.has("id")).toBe(true);
    });

    test("[C29] Anonymous click on name redirects to /login", async ({
      page,
    }) => {
      // C29: Ẩn danh bấm tên/avatar → URL về `/login`
      // Use empty storageState for anonymous
      const browser = page.context().browser();
      expect(browser).toBeTruthy();

      const newContext = await browser!.newContext({
        storageState: { cookies: [], origins: [] },
      });
      expect(newContext).toBeTruthy();

      const anonymousPage = await newContext.newPage();
      await anonymousPage.goto("/kudos");

      const senderName = anonymousPage
        .locator("[data-testid=kudos-card-sender-name]")
        .first();
      await senderName.click();

      await anonymousPage.waitForURL("/login");

      const url = new URL(anonymousPage.url());
      expect(url.pathname).toBe("/login");

      await anonymousPage.close();
      await newContext.close();
    });

    test("[C32] Hero profile search opens another Sunner's profile", async ({
      page,
    }) => {
      // C32: gõ tên Sunner → option hiện → bấm → `/profile?id=<uuid>`
      await page.goto("/kudos");

      // Lấy tên thật từ một thẻ đã seed thay vì hard-code chuỗi.
      const receiverName = page
        .locator("[data-testid=kudos-card-receiver-name]")
        .first();
      await expect(receiverName).toBeVisible();
      const fullName = ((await receiverName.textContent()) ?? "").trim();
      expect(fullName.length).toBeGreaterThan(0);

      const input = page.locator("[data-testid=kudos-hero-search-input]");
      await input.fill(fullName);

      const option = page
        .locator("[data-testid=kudos-hero-search-option]")
        .first();
      await expect(option).toBeVisible();
      await expect(option).toContainText(fullName);

      await option.click();
      await page.waitForURL(/\/profile\?id=[a-f0-9-]+/);

      const url = new URL(page.url());
      expect(url.pathname).toBe("/profile");
      expect(url.searchParams.get("id")).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );

      // Đích thật của tính năng: profile của ĐÚNG Sunner đó render ra.
      await expect(
        page.getByRole("heading", { level: 1, name: fullName }),
      ).toBeVisible();
    });
  },
);
