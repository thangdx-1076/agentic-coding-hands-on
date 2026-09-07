import { test, expect } from "@playwright/test";

/**
 * DOM Contract — Standards Rules Page (`/standards`)
 * ========================================================
 * Authoritative assertions for Track A implementation. Read-only.
 * Do NOT weaken or delete these contracts to make tests pass.
 *
 * | # | Contract | TC |
 * |---|---|---|
 * | C1 | Đúng 1 `<main>`, `overflow-y:auto`, cao bằng viewport; `<h1>` = `Thể lệ` | GUI_001 |
 * | C2 | `page.locator("header")` count 0 · `page.locator("footer")` count 0 — không chrome, có chủ đích | GUI_001 |
 * | C3 | Đúng 3 `<section>`, mỗi cái 1 `<h2>`, đúng thứ tự: `NGƯỜI NHẬN KUDOS: HUY HIỆU HERO CHO NHỮNG ẢNH HƯỞNG TÍCH CỰC` → `NGƯỜI GỬI KUDOS: SƯU TẬP TRỌN BỘ 6 ICON, NHẬN NGAY PHẦN QUÀ BÍ ẨN` → `KUDOS QUỐC DÂN` | GUI_001 |
 * | C4 | Section 1: đúng 4 `<img>` với `alt` lần lượt `New Hero`, `Rising Hero`, `Super Hero`, `Legend Hero`; 4 dòng điều kiện hiển thị: `Có 1-4 người gửi Kudos cho bạn`, `Có 5-9 người gửi Kudos cho bạn`, `Có 10–20 người gửi Kudos cho bạn` *(en-dash)*, `Có hơn 20 người gửi Kudos cho bạn` | GUI_001 |
 * | C5 | Section 2: đúng 6 `<img>`; 6 caption là **DOM text thật** (không phải `alt`), đúng thứ tự `REVIVAL`, `TOUCH OF LIGHT`, `STAY GOLD`, `FLOW TO HORIZON`, `BEYOND THE BOUNDARY`, `ROOT FURTHER` | GUI_001 |
 * | C6 | Section 2 intro và section 3 body mỗi cái chứa ký tự `❤️` | FR-003 |
 * | C7 | Footer: đúng 1 `<button>` chứa text `Đóng`, đúng 1 `<a href="/kudos">` chứa text `Viết KUDOS`; **không** element nào có thuộc tính `disabled` | GUI_002 |
 * | C8 | `main.scrollHeight > main.clientHeight` ở viewport 1280×720; cuộn xuống → `scrollTop > 0` và chạm đáy (`scrollTop + clientHeight >= scrollHeight - 2`); cuộn lên → về `0` | FUN_001 |
 * | C9 | Viewport 1440×2400: `main.scrollHeight - main.clientHeight <= 1` | FUN_002 |
 * | C10 | Vào `/` → click link `Tiêu chuẩn chung` ở footer → ở `/standards` → click `Đóng` → URL về `/` | FUN_003 (nhánh có history) |
 * | C11 | `page.goto("/standards")` trực tiếp (context mới) → click `Đóng` → URL là `/` | FUN_003 (nhánh fallback) |
 * | C12 | Click `Viết KUDOS` → URL chứa `/kudos` (trang đích 200, **không** assert nội dung đích) | FUN_004 |
 * | C13 | Cookie `NEXT_LOCALE=en` → `<h1>` là `Rules`, nút là `Close` / `Write KUDOS` — bản EN không rỗng | RISK EN |
 * | C14 | Không `pageerror` nào khi load | SC-003 |
 * ========================================================
 *
 * OUT OF SCOPE (BR-005 + clarifications § disabled):
 * - TC_THELE_GUI_003 (disabled state) — không tồn tại điều kiện runtime nào
 *   kích hoạt trạng thái disabled; implement là YAGNI.
 * - TC_THELE_FUN_005 (disabled button click rejection) — cùng lý do.
 * - TC_THELE_GUI_004 (hover styling change) — hover không assert được đáng tin
 *   bằng Playwright assertion; giao cho visual validation phase 06.
 */

test.describe("Standards rules page (public, no DB)", () => {
  // Ensure no auth cookies for unauthenticated tests
  test.use({ storageState: { cookies: [], origins: [] } });

  test("[C1] Main panel renders with h1 title 'Thể lệ' and overflow-y:auto", async ({
    page,
  }) => {
    // C1: Đúng 1 `<main>`, `overflow-y:auto`, cao bằng viewport; `<h1>` = `Thể lệ`
    await page.goto("/standards");

    // Verify h1 title exists and contains "Thể lệ"
    const h1 = page.locator("h1");
    await expect(h1).toContainText("Thể lệ");

    // Verify exactly one main element exists
    const main = page.locator("main");
    await expect(main).toHaveCount(1);

    // Verify main has overflow-y:auto
    const computedStyle = await main.evaluate(
      (el) => window.getComputedStyle(el).overflowY,
    );
    expect(computedStyle).toBe("auto");
  });

  test("[C2] No header or footer chrome elements", async ({ page }) => {
    // C2: `page.locator("header")` count 0 · `page.locator("footer")` count 0
    await page.goto("/standards");

    const header = page.locator("header");
    await expect(header).toHaveCount(0);

    const footer = page.locator("footer");
    await expect(footer).toHaveCount(0);
  });

  test("[C3] Three sections with correct h2 headings in order", async ({
    page,
  }) => {
    // C3: Đúng 3 `<section>`, mỗi cái 1 `<h2>`, đúng thứ tự
    await page.goto("/standards");

    const sections = page.locator("section");
    await expect(sections).toHaveCount(3);

    // Expected h2 headings in order
    const expectedHeadings = [
      "NGƯỜI NHẬN KUDOS: HUY HIỆU HERO CHO NHỮNG ẢNH HƯỞNG TÍCH CỰC",
      "NGƯỜI GỬI KUDOS: SƯU TẬP TRỌN BỘ 6 ICON, NHẬN NGAY PHẦN QUÀ BÍ ẨN",
      "KUDOS QUỐC DÂN",
    ];

    for (let i = 0; i < expectedHeadings.length; i++) {
      const section = sections.nth(i);
      const h2 = section.locator("h2");
      await expect(h2).toHaveCount(1);
      await expect(h2).toContainText(expectedHeadings[i]);
    }
  });

  test("[C4] Section 1: Four hero badge images with correct alt texts and conditions", async ({
    page,
  }) => {
    // C4: Section 1: đúng 4 `<img>` với `alt`, và 4 dòng điều kiện
    await page.goto("/standards");

    const section1 = page.locator("section").nth(0);

    // Verify exactly 4 images in section 1
    const images = section1.locator("img");
    await expect(images).toHaveCount(4);

    // Verify alt texts in order
    const expectedAltTexts = [
      "New Hero",
      "Rising Hero",
      "Super Hero",
      "Legend Hero",
    ];
    for (let i = 0; i < expectedAltTexts.length; i++) {
      const img = images.nth(i);
      await expect(img).toHaveAttribute("alt", expectedAltTexts[i]);
    }

    // Verify 4 condition lines exist
    const expectedConditions = [
      "Có 1-4 người gửi Kudos cho bạn",
      "Có 5-9 người gửi Kudos cho bạn",
      "Có 10–20 người gửi Kudos cho bạn", // en-dash, not hyphen
      "Có hơn 20 người gửi Kudos cho bạn",
    ];

    for (const condition of expectedConditions) {
      await expect(section1.locator(`text=${condition}`)).toBeVisible();
    }
  });

  test("[C5] Section 2: Six badge images with caption text in correct order", async ({
    page,
  }) => {
    // C5: Section 2: đúng 6 `<img>`; 6 caption là **DOM text thật**, đúng thứ tự
    await page.goto("/standards");

    const section2 = page.locator("section").nth(1);

    // Verify exactly 6 images in section 2
    const images = section2.locator("img");
    await expect(images).toHaveCount(6);

    // Expected badge captions in order (DOM text, not alt)
    const expectedCaptions = [
      "REVIVAL",
      "TOUCH OF LIGHT",
      "STAY GOLD",
      "FLOW TO HORIZON",
      "BEYOND THE BOUNDARY",
      "ROOT FURTHER", // NOT "ROOT FUTHER" — use character from node tree
    ];

    for (const caption of expectedCaptions) {
      await expect(section2.locator(`text=${caption}`)).toBeVisible();
    }

    // Verify "ROOT FURTHER" (not "ROOT FUTHER") — character correctness
    // This grep assertion will fail if test was written with the wrong spelling
    const wrongSpelling = page.locator('text="ROOT FUTHER"');
    await expect(wrongSpelling).toHaveCount(0);
  });

  test("[C6] Section 2 intro and Section 3 body contain heart emoji", async ({
    page,
  }) => {
    // C6: Section 2 intro và section 3 body mỗi cái chứa ký tự `❤️`
    await page.goto("/standards");

    const section2 = page.locator("section").nth(1);
    const section3 = page.locator("section").nth(2);

    // Section 2 should contain heart emoji
    const section2Heart = section2.locator("text=/❤️/");
    await expect(section2Heart).toBeVisible();

    // Section 3 should contain heart emoji
    const section3Heart = section3.locator("text=/❤️/");
    await expect(section3Heart).toBeVisible();
  });

  test("[C7] Footer: One close button, one write KUDOS link, no disabled attributes", async ({
    page,
  }) => {
    // C7: Footer: đúng 1 `<button>` chứa text `Đóng`, đúng 1 `<a href="/kudos">`, không disabled
    await page.goto("/standards");

    // Find the close button
    const closeButton = page.locator('button:has-text("Đóng")');
    await expect(closeButton).toHaveCount(1);

    // Find the write KUDOS link
    const writeKudosLink = page.locator(
      'a[href="/kudos"]:has-text("Viết KUDOS")',
    );
    await expect(writeKudosLink).toHaveCount(1);

    // Verify no element has disabled attribute
    const disabledElements = page.locator("[disabled]");
    await expect(disabledElements).toHaveCount(0);
  });

  test("[C8] Panel scrolls when content overflows at 1280x720 viewport", async ({
    page,
  }) => {
    // C8: `main.scrollHeight > main.clientHeight` ở viewport 1280×720;
    // cuộn xuống → `scrollTop > 0` và chạm đáy; cuộn lên → về `0`
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/standards");

    const main = page.locator("main");

    // Verify content overflows
    const initialScroll = await main.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      scrollTop: el.scrollTop,
    }));

    expect(initialScroll.scrollHeight).toBeGreaterThan(
      initialScroll.clientHeight,
    );
    expect(initialScroll.scrollTop).toBe(0);

    // Scroll down
    await main.evaluate((el) => {
      el.scrollTop = el.scrollHeight / 2;
    });

    const midScroll = await main.evaluate((el) => el.scrollTop);
    expect(midScroll).toBeGreaterThan(0);

    // Scroll to bottom
    await main.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });

    const bottomScroll = await main.evaluate((el) => ({
      scrollTop: el.scrollTop,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));

    expect(
      bottomScroll.scrollTop + bottomScroll.clientHeight,
    ).toBeGreaterThanOrEqual(bottomScroll.scrollHeight - 2);

    // Scroll back to top
    await main.evaluate((el) => {
      el.scrollTop = 0;
    });

    const finalScroll = await main.evaluate((el) => el.scrollTop);
    expect(finalScroll).toBe(0);
  });

  test("[C9] At 1440x2400 viewport, content fits without scrolling (scrollHeight - clientHeight <= 1)", async ({
    page,
  }) => {
    // C9: Viewport 1440×2400: `main.scrollHeight - main.clientHeight <= 1`
    await page.setViewportSize({ width: 1440, height: 2400 });
    await page.goto("/standards");

    const main = page.locator("main");

    const scrollInfo = await main.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));

    const scrollDiff = scrollInfo.scrollHeight - scrollInfo.clientHeight;
    expect(scrollDiff).toBeLessThanOrEqual(1);
  });

  test("[C10] From home via footer link to standards, close button returns to home", async ({
    page,
  }) => {
    // C10: Vào `/` → click link `Tiêu chuẩn chung` ở footer → ở `/standards` → click `Đóng` → URL về `/`
    // Navigate to home first
    await page.goto("/");

    // Find and click the standards link in footer
    const standardsLink = page.getByRole("link", {
      name: "Tiêu chuẩn chung",
    });
    await expect(standardsLink).toBeVisible();
    await standardsLink.click();

    // Guard: wait for navigation to /standards (Next.js App Router transition is async)
    await page.waitForURL("/standards", { timeout: 5000 });

    // Verify we're at standards page
    expect(page.url()).toContain("/standards");

    // Click close button
    const closeButton = page.locator('button:has-text("Đóng")');
    await closeButton.click();

    // Guard: wait for navigation back to home (Next.js router.back() is async)
    await page.waitForURL("/", { timeout: 5000 });

    // Verify URL returns to home: exact pathname must be "/" (not "/standards")
    const pathname = new URL(page.url()).pathname;
    expect(pathname).toBe("/");
  });

  test("[C11] Direct load to standards, close button fallback to home when no history", async ({
    page,
  }) => {
    // C11: `page.goto("/standards")` trực tiếp (context mới) → click `Đóng` → URL là `/`
    // CRITICAL: Direct goto in Playwright gives history.length = 2 (not 1), so naive
    // history.length > 1 check WILL use router.back() and fail this test. This forces
    // implementation to use stricter heuristic (e.g., history.length === 1, or sessionStorage marker).
    await page.goto("/standards");

    const historyLength = await page.evaluate(() => window.history.length);
    console.log(
      `[MEASUREMENT] window.history.length on direct goto: ${historyLength}`,
    );

    // Verify h1 exists (page loaded correctly)
    const h1 = page.locator("h1");
    await expect(h1).toContainText("Thể lệ");

    // Click close button
    const closeButton = page.locator('button:has-text("Đóng")');
    await closeButton.click();

    // Guard: wait for navigation to home (Next.js router.push() is async)
    // This ensures C11 verifies the fallback behavior when there's no back history.
    await page.waitForURL("/", { timeout: 5000 });

    // Verify fallback navigation to home: EXACT pathname must be "/"
    // This WILL FAIL if implementation uses naive history.length > 1 heuristic (history is 2 on direct goto)
    // Force implementation to use stricter heuristic or alternative signal.
    const pathname = new URL(page.url()).pathname;
    expect(pathname).toBe("/");
  });

  test("[C12] Write KUDOS button navigates to /kudos", async ({ page }) => {
    // C12: Click `Viết KUDOS` → URL chứa `/kudos`
    await page.goto("/standards");

    // Find write KUDOS link
    const writeKudosLink = page.locator(
      'a[href="/kudos"]:has-text("Viết KUDOS")',
    );
    await expect(writeKudosLink).toBeVisible();

    // Click the link
    await writeKudosLink.click();

    // Guard: wait for navigation to /kudos (Next.js <Link> transition is async).
    // This IS the assertion — it throws on timeout if the URL never becomes
    // /kudos, so a trailing `toContain("/kudos")` would add nothing.
    //
    // No explicit `timeout` on purpose. The old 5000ms budget was sized when
    // `/kudos` did not exist and the click landed on an instant 404. `/kudos`
    // is now a dynamic Server Component that reads Supabase, and in CI
    // `NEXT_PUBLIC_SUPABASE_URL` points at an unreachable `127.0.0.1:54321`,
    // so the render only completes once those reads give up — measured at
    // ~7.1s locally against a dead port (`/awards`, which this branch never
    // touches, measures the same 7.1s, so the stall is pre-existing repo-wide
    // behaviour, not something `/kudos` introduced; see `plans/action-items.md`).
    // Falling back to the suite's navigation budget matches how every other
    // DB-backed route is navigated to (`awards.spec.ts` uses a plain `goto`).
    // The assertion is unchanged: the URL must become `/kudos`.
    await page.waitForURL("/kudos");
  });

  test("[C13] English locale renders correct text: 'Rules', 'Close', 'Write KUDOS'", async ({
    page,
    context,
  }) => {
    // C13: Cookie `NEXT_LOCALE=en` → `<h1>` là `Rules`, nút là `Close` / `Write KUDOS`
    await context.addCookies([
      {
        name: "NEXT_LOCALE",
        value: "en",
        url: "http://localhost:3000",
      },
    ]);

    await page.goto("/standards");

    // Verify h1 is "Rules" in English
    const h1 = page.locator("h1");
    await expect(h1).toContainText("Rules");

    // Verify close button text is "Close"
    const closeButton = page.locator('button:has-text("Close")');
    await expect(closeButton).toBeVisible();

    // Verify write KUDOS link text is "Write KUDOS"
    const writeKudosLink = page.locator(
      'a[href="/kudos"]:has-text("Write KUDOS")',
    );
    await expect(writeKudosLink).toBeVisible();
  });

  test("[C14] No page errors on load", async ({ page }) => {
    // C14: Không `pageerror` nào khi load
    const consoleErrors: string[] = [];
    page.on("pageerror", (error) => {
      consoleErrors.push(error.message);
    });

    await page.goto("/standards");

    await page.waitForLoadState("domcontentloaded");

    expect(consoleErrors).toHaveLength(0);
  });
});
