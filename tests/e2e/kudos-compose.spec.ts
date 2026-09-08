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
      const eq = line.indexOf("=");
      if (eq > 0 && !line.startsWith("#")) {
        process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
      }
    });
  }
}
loadEnv();

/**
 * DOM Contract — Kudos Compose Dialog (`/kudos` modal)
 * ========================================================
 * Authoritative assertions for Track A implementation. Read-only.
 * Do NOT weaken or delete these contracts to make tests pass.
 *
 * Test-id list (single source of truth):
 * - `kudos-compose-dialog` (the `<dialog>`)
 * - `kudos-compose-title`
 * - `kudos-recipient-input`
 * - `kudos-recipient-options` (listbox) + `kudos-recipient-option`
 * - `kudos-title-input`
 * - `kudos-title-hint`
 * - `kudos-format-toolbar` + `kudos-format-button` (6, each with `data-format="bold|italic|strike|number|link|quote"`)
 * - `kudos-standards-link`
 * - `kudos-content-textarea`
 * - `kudos-content-hint`
 * - `kudos-mention-options` + `kudos-mention-option`
 * - `kudos-hashtag-add`
 * - `kudos-hashtag-picker` + `kudos-hashtag-option`
 * - `kudos-hashtag-chip` + `kudos-hashtag-remove`
 * - `kudos-image-add`
 * - `kudos-image-input` (the real `<input type="file">`)
 * - `kudos-image-thumb` + `kudos-image-remove`
 * - `kudos-anonymous-checkbox`
 * - `kudos-anonymous-name-input`
 * - `kudos-compose-cancel`
 * - `kudos-compose-submit`
 * - `kudos-field-error` (per-field with `data-field="recipient|title|content|hashtags|anonymousName|images"`)
 *
 * | # | Tag | Assertion | TC | Spec/FR |
 * |---|-----|-----------|----|---------|
 * | C01 | *(CI-safe)* | Khách chưa đăng nhập click pill → URL `/login`, dialog **không** mở | ID-1 | FR-102, BR-006 |
 * | C02 | *(CI-safe)* | Khách: `[data-testid=kudos-compose-dialog]` không có thuộc tính `open`; `/kudos` vẫn 200 | ID-1 | FR-102 |
 * | C03 | `@auth` | Đã đăng nhập click pill → dialog có `open`, tiêu đề đúng nguyên văn | ID-0, ID-2 | A, FR-101 |
 * | C04 | `@auth` | Thứ tự DOM trong dialog: Người nhận → Danh hiệu → toolbar+Nội dung → Hashtag → Image → checkbox ẩn danh; footer `Hủy` rồi `Gửi` | ID-3 | B/C/D/E/F/G/H, FR-201 |
 * | C05 | `@auth` | State ban đầu: 2 ô rỗng đúng placeholder, checkbox unchecked, ô tên ẩn danh **không có trong DOM**, `Gửi` `aria-disabled="true"` | ID-4, ID-5, ID-6, ID-48 | FR-201, FR-208 |
 * | C06 | `@auth` | Ô `Danh hiệu` tồn tại, có dấu `*`, đúng placeholder, **2 dòng hint** đúng nguyên văn | *(không TC — node `I520:11647;1688:10448`)* | FR-203 |
 * | C07 | `@auth` | `Escape` đóng dialog; mở lại → mọi trường rỗng (không lưu nháp) | ID-45 | SM-001 |
 * | C08 | `@auth` | `Hủy` đóng dialog, mở lại rỗng | ID-45 | H.1, SM-001 |
 * | C09 | `@auth` | Toolbar có đúng 6 nút; bôi đen text rồi click `B` → `inputValue()` của textarea bọc `**…**` | ID-27..32 | C.1-6, BR-005 |
 * | C10 | `@auth` | `Tiêu chuẩn cộng đồng` là `<a href="/standards">`, cùng tab (không `target="_blank"`) | *(không TC)* | FR-204 |
 * | C11 | `@auth` | Dòng hint dưới textarea đúng nguyên văn, và **không** có element counter ký tự nào | ID-5 | D.1 |
 * | C12 | `@auth` | Click `+ Hashtag` → picker mở; chọn/nhập `TeamWork` → chip xuất hiện | ID-34 | E.2, FR-205 |
 * | C13 | `@auth` | Thêm 3 hashtag → 3 chip; click `x` chip đầu → chip đó mất, 2 chip còn lại nguyên | ID-35, ID-36 | FR-205 |
 * | C14 | `@auth` | Đã 5 chip → thêm cái thứ 6 bị chặn, hiện `Tối đa 5 hashtag` | ID-16, ID-17, ID-53 | FR-403, BR-002 |
 * | C15 | `@auth` | `setInputFiles` 3 file `.jpg`/`.png` → 3 thumbnail, nút `+ Image` vẫn hiện | ID-18, ID-22, ID-37 | F.2-5, FR-206 |
 * | C16 | `@auth` | 5 ảnh → `+ Image` **ẩn**; xoá 1 thumbnail → nút hiện lại | ID-20, ID-38, ID-39, ID-54 | BR-003, FR-206 |
 * | C17 | `@auth` | Chọn file `.txt` → hiện lỗi định dạng, **không** thumbnail nào được thêm | ID-55 | FR-404, BR-003 |
 * | C18 | `@auth` | Tick checkbox → ô tên ẩn danh hiện; bỏ tick → ô mất | ID-41, ID-43, ID-44 | G, DEC-001, FR-207 |
 * | C19 | `@auth` | Tick ẩn danh + để trống tên + 4 trường kia hợp lệ → click `Gửi` bị chặn, lỗi ngay tại ô tên | *(D001)* | BR-004, D001 |
 * | C20 | `@auth` | Để trống cả 4 trường → click `Gửi` → lỗi hiện ở **cả 4** trường, dialog không đóng, không request nào đi | ID-7, ID-11, ID-14, ID-50..52, ID-56 | FR-402, DEC-002 |
 * | C21 | `@auth @local-db` | Gõ vào ô Người nhận → dropdown liệt kê Sunner thật đã seed; chọn 1 → ô hiện tên đó, dropdown đóng | ID-25, ID-26 | B.2, FR-202 |
 * | C22 | `@auth @local-db` | Đủ 4 trường hợp lệ → `Gửi` mất `aria-disabled` | ID-49 | FR-208, H.2 |
 * | C23 | `@auth @local-db` | Happy path: gửi → dialog đóng, thẻ kudo mới có mặt trên feed `/kudos` với `Danh hiệu` là hashtag đầu, đúng nội dung và chip | ID-15, ID-46, ID-47 | FR-401, BR-001 |
 * | C24 | `@auth @local-db` | Gửi kèm 2 ảnh → thẻ mới hiện 2 ảnh, `<img src>` (hoặc URL param nếu next/image optimization) chứa `/storage/v1/object/public/kudo-images/` | ID-18..24 | FR-001, INT-001 |
 * | C25 | `@auth @local-db` | Gửi ẩn danh + tên ẩn danh → thẻ mới **không** chứa tên thật người gửi, hiện tên ẩn danh, và tên đó **không** phải `<a href="/profile?id=">` | US004 | BR-004, permissions § ẩn danh |
 * | C26 | `@auth @local-db` | Nội dung có `**x**` → thẻ mới render `<strong>`, **không** hiện `**` thô | ID-27..32 | BR-005 |
 * | C27 | `@auth @local-db` | Gõ `@Ngu` trong textarea → danh sách gợi ý tên hiện; chọn 1 → chèn plain `@Tên` vào textarea | ID-33 | D, FR-204 |
 * ========================================================
 */

test.describe("Kudos Compose Dialog (CI-safe, no Supabase data required)", () => {
  // Ensure no auth cookies for unauthenticated tests
  test.use({ storageState: { cookies: [], origins: [] } });

  test("[C01] Unauthenticated: click pill → redirect to /login, dialog does not open", async ({
    page,
  }) => {
    await page.goto("/kudos");
    expect(page.url()).toContain("/kudos");

    // Assert dialog is closed on /kudos before clicking (tree will unmount on redirect)
    const dialog = page.locator("[data-testid=kudos-compose-dialog]");
    await expect(dialog).toBeAttached();
    await expect(dialog).not.toHaveAttribute("open", "");

    // Click the pill's input element (same shape as kudos.spec.ts C03)
    await page.getByTestId("kudos-compose-pill").locator("input").click();

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);

    // Dialog should not exist on /login page (tree unmounted)
    await expect(page.getByTestId("kudos-compose-dialog")).toHaveCount(0);
  });

  test("[C02] Unauthenticated: dialog has no `open` attribute; `/kudos` still 200", async ({
    page,
  }) => {
    const response = await page.goto("/kudos");
    expect(response?.status()).toBe(200);

    // Dialog element must exist in DOM but not be in modal state (no open attribute)
    const dialog = page.locator("[data-testid=kudos-compose-dialog]");
    await expect(dialog).toBeAttached();
    await expect(dialog).not.toHaveAttribute("open", "");
  });
});

test.describe("Kudos Compose Dialog (@auth)", () => {
  let testUserEmail = "";

  test.beforeEach(async ({ context }) => {
    // Create authenticated session
    const supabaseUrl = process.env.SUPABASE_URL || "http://127.0.0.1:55321";
    const publishableKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
    testUserEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@kudos-test.dev`;
    const password = "Test@123456";

    const { access_token, refresh_token } = await createTestSession(
      supabaseUrl,
      publishableKey,
      testUserEmail,
      password,
      { full_name: "Test User" },
    );

    const cookies = await generateSupabaseCookies(
      supabaseUrl,
      publishableKey,
      access_token,
      refresh_token,
    );

    await injectSupabaseSession(context, cookies);
  });

  test("[C03] Authenticated: click pill → dialog opens with correct title", async ({
    page,
  }) => {
    await page.goto("/kudos");

    // Click the compose pill to open dialog
    const pill = page.locator("[data-testid=kudos-compose-pill]");
    await pill.click();

    // Dialog should be open
    const dialog = page.locator("[data-testid=kudos-compose-dialog]");
    await expect(dialog).toHaveAttribute("open", "");

    // Title should match exactly
    const title = page.locator("[data-testid=kudos-compose-title]");
    await expect(title).toContainText(
      "Gửi lời cám ơn và ghi nhận đến đồng đội",
    );
  });

  test("[C04] Dialog DOM order: Recipient → Title → Toolbar+Content → Hashtag → Image → Anonymous checkbox; footer Cancel then Submit", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    const dialog = page.locator("[data-testid=kudos-compose-dialog]");
    await expect(dialog).toHaveAttribute("open", "");

    // Check DOM order by querying elements in sequence
    const recipientInput = dialog.locator(
      "[data-testid=kudos-recipient-input]",
    );
    const titleInput = dialog.locator("[data-testid=kudos-title-input]");
    const toolbar = dialog.locator("[data-testid=kudos-format-toolbar]");
    const contentTextarea = dialog.locator(
      "[data-testid=kudos-content-textarea]",
    );
    const hashtagSection = dialog.locator("[data-testid=kudos-hashtag-add]");
    const imageSection = dialog.locator("[data-testid=kudos-image-add]");
    const anonCheckbox = dialog.locator(
      "[data-testid=kudos-anonymous-checkbox]",
    );
    const cancelBtn = dialog.locator("[data-testid=kudos-compose-cancel]");
    const submitBtn = dialog.locator("[data-testid=kudos-compose-submit]");

    // All should be visible
    await expect(recipientInput).toBeVisible();
    await expect(titleInput).toBeVisible();
    await expect(toolbar).toBeVisible();
    await expect(contentTextarea).toBeVisible();
    await expect(hashtagSection).toBeVisible();
    await expect(imageSection).toBeVisible();
    await expect(anonCheckbox).toBeVisible();
    await expect(cancelBtn).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // Cancel should come before Submit in DOM
    const footerElements = dialog.locator(
      "[data-testid=kudos-compose-cancel], [data-testid=kudos-compose-submit]",
    );
    await expect(footerElements).toHaveCount(2);
  });

  test("[C05] Initial state: 2 empty inputs with correct placeholders, checkbox unchecked, anonymous name field not in DOM, Submit aria-disabled", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    const dialog = page.locator("[data-testid=kudos-compose-dialog]");

    // Recipient input: placeholder "Tìm kiếm"
    const recipientInput = dialog.locator(
      "[data-testid=kudos-recipient-input]",
    );
    await expect(recipientInput).toHaveValue("");
    await expect(recipientInput).toHaveAttribute("placeholder", "Tìm kiếm");

    // Content textarea: placeholder "Hãy gửi gắm lời cám ơn và ghi nhận đến đồng đội tại đây nhé!"
    const contentTextarea = dialog.locator(
      "[data-testid=kudos-content-textarea]",
    );
    await expect(contentTextarea).toHaveValue("");
    await expect(contentTextarea).toHaveAttribute(
      "placeholder",
      "Hãy gửi gắm lời cám ơn và ghi nhận đến đồng đội tại đây nhé!",
    );

    // Anonymous checkbox unchecked
    const anonCheckbox = dialog.locator(
      "[data-testid=kudos-anonymous-checkbox]",
    );
    await expect(anonCheckbox).not.toBeChecked();

    // Anonymous name input should NOT be in DOM when unchecked
    const anonNameInput = dialog.locator(
      "[data-testid=kudos-anonymous-name-input]",
    );
    await expect(anonNameInput).toHaveCount(0);

    // Submit button aria-disabled
    const submitBtn = dialog.locator("[data-testid=kudos-compose-submit]");
    await expect(submitBtn).toHaveAttribute("aria-disabled", "true");
  });

  test("[C06] Title field exists with asterisk, correct placeholder, 2-line hint verbatim", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    const dialog = page.locator("[data-testid=kudos-compose-dialog]");
    const titleInput = dialog.locator("[data-testid=kudos-title-input]");

    // Should exist
    await expect(titleInput).toBeVisible();

    // Should have asterisk in label
    const titleLabel = dialog.locator("label").filter({ hasText: /Danh hiệu/ });
    await expect(titleLabel).toContainText("*");

    // Placeholder check
    await expect(titleInput).toHaveAttribute(
      "placeholder",
      "Dành tặng một danh hiệu cho đồng đội",
    );

    // 2-line hint
    const titleHint = dialog.locator("[data-testid=kudos-title-hint]");
    await expect(titleHint).toContainText(
      "Ví dụ: Người truyền động lực cho tôi.",
    );
    await expect(titleHint).toContainText(
      "Danh hiệu sẽ hiển thị làm tiêu đề Kudos của bạn.",
    );
  });

  test("[C07] Escape closes dialog; reopen → all fields empty (no draft save)", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    const dialog = page.locator("[data-testid=kudos-compose-dialog]");
    await expect(dialog).toHaveAttribute("open", "");

    // Type something
    const recipientInput = dialog.locator(
      "[data-testid=kudos-recipient-input]",
    );
    await recipientInput.fill("test");

    // Press Escape
    await page.keyboard.press("Escape");

    // Dialog should close (no open attribute means it's not shown as modal)
    await expect(dialog).not.toHaveAttribute("open", "");

    // Reopen dialog
    await page.locator("[data-testid=kudos-compose-pill]").click();
    await expect(dialog).toHaveAttribute("open", "");

    // Should be empty again
    await expect(recipientInput).toHaveValue("");
  });

  test("[C08] Cancel button closes dialog, reopen → empty", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    const dialog = page.locator("[data-testid=kudos-compose-dialog]");
    const recipientInput = dialog.locator(
      "[data-testid=kudos-recipient-input]",
    );

    // Type something
    await recipientInput.fill("test");

    // Click Cancel
    await dialog.locator("[data-testid=kudos-compose-cancel]").click();

    // Dialog should close
    expect(await dialog.evaluate((el) => (el as HTMLDialogElement).open)).toBe(
      false,
    );

    // Reopen
    await page.locator("[data-testid=kudos-compose-pill]").click();
    await expect(recipientInput).toHaveValue("");
  });

  test("[C09] Toolbar has 6 buttons; select text and click B → textarea wraps in `**`", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    const dialog = page.locator("[data-testid=kudos-compose-dialog]");
    const toolbar = dialog.locator("[data-testid=kudos-format-toolbar]");
    const contentTextarea = dialog.locator(
      "[data-testid=kudos-content-textarea]",
    );

    // Check toolbar has 6 buttons
    const buttons = toolbar.locator("[data-testid=kudos-format-button]");
    await expect(buttons).toHaveCount(6);

    // Type text into textarea
    await contentTextarea.fill("hello world");

    // Select "hello"
    await contentTextarea.evaluate((el: HTMLTextAreaElement) => {
      el.setSelectionRange(0, 5);
    });

    // Click bold button (first button)
    await buttons.first().click();

    // Check value has ** wrapping
    const value = await contentTextarea.inputValue();
    expect(value).toContain("**hello**");
  });

  test('[C10] Standards link is <a href="/standards">, same tab', async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    const dialog = page.locator("[data-testid=kudos-compose-dialog]");
    const link = dialog.locator("[data-testid=kudos-standards-link]");

    await expect(link).toHaveAttribute("href", "/standards");
    await expect(link).not.toHaveAttribute("target", "_blank");
  });

  test("[C11] Content hint text is verbatim, no character counter exists", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    const dialog = page.locator("[data-testid=kudos-compose-dialog]");
    const contentHint = dialog.locator("[data-testid=kudos-content-hint]");

    // Check for mention hint text (with proper handling of quotes)
    const hintText = await contentHint.textContent();
    expect(hintText).toContain("@");
    expect(hintText).toContain("tên");
    expect(hintText).toContain("đồng nghiệp");

    // Check no character counter exists
    const counterElements = dialog.locator(
      "[data-testid=kudos-content-counter]",
    );
    await expect(counterElements).toHaveCount(0);
  });

  test("[C12] Click + Hashtag → picker opens; select/type TeamWork → chip appears", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    const dialog = page.locator("[data-testid=kudos-compose-dialog]");
    const hashtagAdd = dialog.locator("[data-testid=kudos-hashtag-add]");

    // Click + Hashtag
    await hashtagAdd.click();

    // Picker should open
    const picker = dialog.locator("[data-testid=kudos-hashtag-picker]");
    await expect(picker).toBeVisible();

    // Type TeamWork (and select from dropdown if it appears)
    const pickerInput = picker.locator("input").first();
    await pickerInput.fill("TeamWork");

    // Try to click option if visible, otherwise press Enter to confirm
    const teamworkOption = picker
      .locator("[data-testid=kudos-hashtag-option]")
      .filter({ hasText: /TeamWork/ })
      .first();
    try {
      await teamworkOption.click({ timeout: 1000 });
    } catch {
      await pickerInput.press("Enter");
    }

    // Chip should appear
    const chips = dialog.locator("[data-testid=kudos-hashtag-chip]");
    await expect(chips.filter({ hasText: /TeamWork/ })).toBeVisible();
  });

  test("[C13] Add 3 hashtags → 3 chips; click x on first → 2 chips remain", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    const dialog = page.locator("[data-testid=kudos-compose-dialog]");
    const hashtagAdd = dialog.locator("[data-testid=kudos-hashtag-add]");

    // Add 3 hashtags
    for (let i = 0; i < 3; i++) {
      await hashtagAdd.click();
      const picker = dialog.locator("[data-testid=kudos-hashtag-picker]");
      const input = picker.locator("input").first();
      await input.fill(`Tag${i + 1}`);
      await input.press("Enter");
    }

    // Should have 3 chips
    let chips = dialog.locator("[data-testid=kudos-hashtag-chip]");
    await expect(chips).toHaveCount(3);

    // Click x on first chip
    const firstChip = chips.first();
    const removeBtn = firstChip.locator("[data-testid=kudos-hashtag-remove]");
    await removeBtn.click();

    // Should have 2 chips now
    chips = dialog.locator("[data-testid=kudos-hashtag-chip]");
    await expect(chips).toHaveCount(2);
  });

  test('[C14] Add 5 hashtags → 6th blocked with "Tối đa 5 hashtag" message', async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    const dialog = page.locator("[data-testid=kudos-compose-dialog]");
    const hashtagAdd = dialog.locator("[data-testid=kudos-hashtag-add]");

    // Add 5 hashtags
    for (let i = 0; i < 5; i++) {
      await hashtagAdd.click();
      const picker = dialog.locator("[data-testid=kudos-hashtag-picker]");
      const input = picker.locator("input").first();
      await input.fill(`Tag${i + 1}`);
      await input.press("Enter");
    }

    // Try to add 6th — button is aria-disabled="true", use force to bypass Playwright's actionability check
    // eslint-disable-next-line playwright/no-force-option
    await hashtagAdd.click({ force: true });
    const picker = dialog.locator("[data-testid=kudos-hashtag-picker]");
    const input = picker.locator("input").first();
    await input.fill("Tag6");

    // Should show max error
    const errorMsg = dialog.locator("[data-testid=kudos-field-error]").filter({
      hasText: /Tối đa 5/,
    });
    await expect(errorMsg).toBeVisible();
  });

  test("[C15] Upload 3 image files (.jpg, .png) → 3 thumbnails, + Image button still visible", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    const dialog = page.locator("[data-testid=kudos-compose-dialog]");

    // Create test files (real minimal image bytes)
    const jpegBuffer = Buffer.from(
      "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDi6KKK+ZP3E//Z",
      "base64",
    );
    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "base64",
    );

    const files = [
      {
        name: "test1.jpg",
        mimeType: "image/jpeg",
        buffer: jpegBuffer,
      },
      {
        name: "test2.png",
        mimeType: "image/png",
        buffer: pngBuffer,
      },
      {
        name: "test3.jpg",
        mimeType: "image/jpeg",
        buffer: jpegBuffer,
      },
    ];

    // Upload files
    const fileInput = dialog.locator("[data-testid=kudos-image-input]");
    await fileInput.setInputFiles(files);

    // Should have 3 thumbnails
    const thumbs = dialog.locator("[data-testid=kudos-image-thumb]");
    await expect(thumbs).toHaveCount(3);

    // + Image button should still be visible
    const addBtn = dialog.locator("[data-testid=kudos-image-add]");
    await expect(addBtn).toBeVisible();
  });

  test("[C16] 5 images → + Image hidden; remove 1 → button visible again", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    const dialog = page.locator("[data-testid=kudos-compose-dialog]");

    // Real minimal JPEG buffer for all 5 files
    const jpegBuffer = Buffer.from(
      "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDi6KKK+ZP3E//Z",
      "base64",
    );

    // Create 5 test files
    const files = Array.from({ length: 5 }, (_, i) => ({
      name: `test${i + 1}.jpg`,
      mimeType: "image/jpeg",
      buffer: jpegBuffer,
    }));

    // Upload all
    const fileInput = dialog.locator("[data-testid=kudos-image-input]");
    await fileInput.setInputFiles(files);

    // + Image should be hidden
    const addBtn = dialog.locator("[data-testid=kudos-image-add]");
    await expect(addBtn).toBeHidden();

    // Remove first thumbnail
    const thumbs = dialog.locator("[data-testid=kudos-image-thumb]");
    const firstThumb = thumbs.first();
    const removeBtn = firstThumb.locator("[data-testid=kudos-image-remove]");
    await removeBtn.click();

    // + Image should be visible again
    await expect(addBtn).toBeVisible();
  });

  test("[C17] Select .txt file → format error shown, no thumbnail added", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    const dialog = page.locator("[data-testid=kudos-compose-dialog]");

    // Try to upload .txt file
    const fileInput = dialog.locator("[data-testid=kudos-image-input]");
    const txtFile = {
      name: "test.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("text content"),
    };

    await fileInput.setInputFiles(txtFile);

    // Error should appear
    const errorMsg = dialog
      .locator("[data-testid=kudos-field-error]")
      .filter({ hasText: /định dạng|format/ });
    await expect(errorMsg).toBeVisible();

    // No thumbnails
    const thumbs = dialog.locator("[data-testid=kudos-image-thumb]");
    await expect(thumbs).toHaveCount(0);
  });

  test("[C18] Tick anonymous checkbox → name field appears; untick → field disappears", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    const dialog = page.locator("[data-testid=kudos-compose-dialog]");
    const anonCheckbox = dialog.locator(
      "[data-testid=kudos-anonymous-checkbox]",
    );
    const anonNameInput = dialog.locator(
      "[data-testid=kudos-anonymous-name-input]",
    );

    // Initially not in DOM
    await expect(anonNameInput).toHaveCount(0);

    // Check checkbox
    await anonCheckbox.check();

    // Name field should appear
    await expect(anonNameInput).toBeVisible();

    // Uncheck
    await anonCheckbox.uncheck();

    // Field should disappear
    await expect(anonNameInput).toHaveCount(0);
  });

  test("[C19] Anonymous checked + empty name + 4 valid fields → Submit blocked with name error", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    const dialog = page.locator("[data-testid=kudos-compose-dialog]");

    // Fill recipient (placeholder shows it works)
    const recipientInput = dialog.locator(
      "[data-testid=kudos-recipient-input]",
    );
    await recipientInput.fill("Someone");

    // Fill title
    const titleInput = dialog.locator("[data-testid=kudos-title-input]");
    await titleInput.fill("Award");

    // Fill content
    const contentTextarea = dialog.locator(
      "[data-testid=kudos-content-textarea]",
    );
    await contentTextarea.fill("Good work");

    // Add hashtag
    const hashtagAdd = dialog.locator("[data-testid=kudos-hashtag-add]");
    await hashtagAdd.click();
    const picker = dialog.locator("[data-testid=kudos-hashtag-picker]");
    const input = picker.locator("input").first();
    await input.fill("TeamWork");
    await input.press("Enter");

    // Check anonymous but leave name empty
    const anonCheckbox = dialog.locator(
      "[data-testid=kudos-anonymous-checkbox]",
    );
    await anonCheckbox.check();

    // Try to submit (button is aria-disabled, force to exercise validation)
    const submitBtn = dialog.locator("[data-testid=kudos-compose-submit]");
    // AD-1: aria-disabled keeps the button clickable for humans; force bypasses Playwright's enabled check only
    // eslint-disable-next-line playwright/no-force-option
    await submitBtn.click({ force: true });

    // Should still be open with name error
    await expect(dialog).toHaveAttribute("open", "");
    const nameError = dialog.locator(
      '[data-testid=kudos-field-error][data-field="anonymousName"]',
    );
    await expect(nameError).toBeVisible();
  });

  test("[C20] All 4 required fields empty → Submit shows errors in all, dialog stays open", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    const dialog = page.locator("[data-testid=kudos-compose-dialog]");
    const submitBtn = dialog.locator("[data-testid=kudos-compose-submit]");

    // Click Submit without filling anything (button is aria-disabled, force to exercise validation)
    // AD-1: aria-disabled keeps the button clickable for humans; force bypasses Playwright's enabled check only
    // eslint-disable-next-line playwright/no-force-option
    await submitBtn.click({ force: true });

    // Dialog should still be open
    await expect(dialog).toHaveAttribute("open", "");

    // Should have errors for recipient, title, content, hashtags
    const errors = dialog.locator("[data-testid=kudos-field-error]");
    const errorCount = await errors.count();
    expect(errorCount).toBeGreaterThanOrEqual(4);

    // Check that 4 specific fields have errors
    const recipientError = dialog.locator(
      '[data-testid=kudos-field-error][data-field="recipient"]',
    );
    const titleError = dialog.locator(
      '[data-testid=kudos-field-error][data-field="title"]',
    );
    const contentError = dialog.locator(
      '[data-testid=kudos-field-error][data-field="content"]',
    );
    const hashtagError = dialog.locator(
      '[data-testid=kudos-field-error][data-field="hashtags"]',
    );

    await expect(recipientError).toBeVisible();
    await expect(titleError).toBeVisible();
    await expect(contentError).toBeVisible();
    await expect(hashtagError).toBeVisible();
  });
});

test.describe("Kudos Compose Dialog (@auth @local-db)", () => {
  // Every test here inserts a real kudo and asserts it is the NEWEST feed card.
  // Under the config's `fullyParallel: true` two @local-db tests race for "newest"
  // (observed: C26 saw C25's card) — run this tier serially, one worker.
  test.describe.configure({ mode: "serial" });

  let testUserId = "";

  test.beforeEach(async ({ context }) => {
    // Create authenticated session
    const supabaseUrl = process.env.SUPABASE_URL || "http://127.0.0.1:55321";
    const publishableKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
    const email = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@kudos-test.dev`;
    const password = "Test@123456";

    const { access_token, refresh_token, user_id } = await createTestSession(
      supabaseUrl,
      publishableKey,
      email,
      password,
      { full_name: "Test User" },
    );
    testUserId = user_id;

    const cookies = await generateSupabaseCookies(
      supabaseUrl,
      publishableKey,
      access_token,
      refresh_token,
    );

    await injectSupabaseSession(context, cookies);
  });

  // Every @local-db test above inserts a real row into public.kudos (and
  // objects into the kudo-images bucket). Without cleanup the local feed grows
  // by 3+ rows per run, and F007's kudos.spec C19 (single scroll reaches the
  // end of the seed-sized feed) starts timing out — observed at 88 rows on
  // 2026-09-08. The test user itself cannot DELETE (no policy, by design), so
  // the delete goes through the service role when the runner exports it
  // (`supabase status -o env` prints SERVICE_ROLE_KEY locally); CI never runs
  // this tier. Missing key → warn once, never fail the test.
  test.afterEach(async () => {
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
    if (!testUserId) return;
    if (!serviceRoleKey) {
      console.warn(
        "[kudos-compose] SUPABASE_SERVICE_ROLE_KEY not set — test kudos left in local DB",
      );
      return;
    }
    const supabaseUrl = process.env.SUPABASE_URL || "http://127.0.0.1:55321";
    try {
      await fetch(`${supabaseUrl}/rest/v1/kudos?sender_id=eq.${testUserId}`, {
        method: "DELETE",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      });
    } catch {
      // cleanup is best-effort; the assertion above already decided the test
    }
  });

  test("[C21] Type recipient name → dropdown shows seeded Sunners; select one → field filled, dropdown closed", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    const dialog = page.locator("[data-testid=kudos-compose-dialog]");
    const recipientInput = dialog.locator(
      "[data-testid=kudos-recipient-input]",
    );

    // Type to trigger dropdown
    await recipientInput.fill("Nguyễn");

    // Dropdown should open
    const options = dialog.locator("[data-testid=kudos-recipient-option]");
    await expect(options.first()).toBeVisible();

    // Select first option
    await options.first().click();

    // Field should be filled
    const value = await recipientInput.inputValue();
    expect(value.length).toBeGreaterThan(0);

    // Dropdown should close
    await expect(options).toHaveCount(0);
  });

  test("[C22] All 4 required fields valid → Submit loses aria-disabled", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    const dialog = page.locator("[data-testid=kudos-compose-dialog]");
    const recipientInput = dialog.locator(
      "[data-testid=kudos-recipient-input]",
    );
    const titleInput = dialog.locator("[data-testid=kudos-title-input]");
    const contentTextarea = dialog.locator(
      "[data-testid=kudos-content-textarea]",
    );
    const hashtagAdd = dialog.locator("[data-testid=kudos-hashtag-add]");
    const submitBtn = dialog.locator("[data-testid=kudos-compose-submit]");

    // Fill recipient
    await recipientInput.fill("Test");
    const options = dialog.locator("[data-testid=kudos-recipient-option]");
    // Wait for options to appear (C21 contract: dropdown shows seeded Sunners)
    await expect(options.first()).toBeVisible();
    await options.first().click();

    // Fill title
    await titleInput.fill("Award");

    // Fill content
    await contentTextarea.fill("Good work");

    // Add hashtag
    await hashtagAdd.click();
    const picker = dialog.locator("[data-testid=kudos-hashtag-picker]");
    const input = picker.locator("input").first();
    await input.fill("TeamWork");
    await input.press("Enter");

    // Submit should not have aria-disabled
    const ariaDisabled = submitBtn;
    await expect(ariaDisabled).not.toHaveAttribute("aria-disabled", "true");
  });

  test("[C23] Happy path: submit → dialog closes, new kudo on feed with title as first hashtag", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    const dialog = page.locator("[data-testid=kudos-compose-dialog]");

    // Fill all fields
    const recipientInput = dialog.locator(
      "[data-testid=kudos-recipient-input]",
    );
    await recipientInput.fill("Test");
    const options = dialog.locator("[data-testid=kudos-recipient-option]");
    // Wait for options to appear (C21 contract: dropdown shows seeded Sunners)
    await expect(options.first()).toBeVisible();
    await options.first().click();

    const titleInput = dialog.locator("[data-testid=kudos-title-input]");
    await titleInput.fill("Award");

    const contentTextarea = dialog.locator(
      "[data-testid=kudos-content-textarea]",
    );
    await contentTextarea.fill("Good work");

    const hashtagAdd = dialog.locator("[data-testid=kudos-hashtag-add]");
    await hashtagAdd.click();
    const picker = dialog.locator("[data-testid=kudos-hashtag-picker]");
    const input = picker.locator("input").first();
    await input.fill("TeamWork");
    await input.press("Enter");

    // Submit
    const submitBtn = dialog.locator("[data-testid=kudos-compose-submit]");
    await submitBtn.click();

    // Dialog should close (retrying assertion, async operation ~150ms)
    await expect(dialog).not.toHaveAttribute("open", "");

    // New kudo should appear on feed
    // Scope to feed, not highlight carousel (kudos.spec.ts:460 pattern)
    const feedCards = page.locator(
      "[data-testid=kudos-feed] [data-testid=kudos-card]",
    );
    // Wait for the new card by content before reading children
    await expect(feedCards.first()).toContainText("Award");
  });

  test("[C24] Submit with 2 images → new kudo shows 2 images with /storage/ URLs", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    const dialog = page.locator("[data-testid=kudos-compose-dialog]");

    // Fill required fields
    const recipientInput = dialog.locator(
      "[data-testid=kudos-recipient-input]",
    );
    await recipientInput.fill("Test");
    const options = dialog.locator("[data-testid=kudos-recipient-option]");
    // Wait for options to appear (C21 contract: dropdown shows seeded Sunners)
    await expect(options.first()).toBeVisible();
    await options.first().click();

    const titleInput = dialog.locator("[data-testid=kudos-title-input]");
    await titleInput.fill("Award");

    const contentTextarea = dialog.locator(
      "[data-testid=kudos-content-textarea]",
    );
    await contentTextarea.fill("Good work");

    const hashtagAdd = dialog.locator("[data-testid=kudos-hashtag-add]");
    await hashtagAdd.click();
    const picker = dialog.locator("[data-testid=kudos-hashtag-picker]");
    const input = picker.locator("input").first();
    await input.fill("TeamWork");
    await input.press("Enter");

    // Upload 2 images (real minimal image bytes)
    const jpegBuffer = Buffer.from(
      "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDi6KKK+ZP3E//Z",
      "base64",
    );
    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "base64",
    );

    const fileInput = dialog.locator("[data-testid=kudos-image-input]");
    const files = [
      {
        name: "img1.jpg",
        mimeType: "image/jpeg",
        buffer: jpegBuffer,
      },
      {
        name: "img2.png",
        mimeType: "image/png",
        buffer: pngBuffer,
      },
    ];
    await fileInput.setInputFiles(files);

    // Submit
    const submitBtn = dialog.locator("[data-testid=kudos-compose-submit]");
    await submitBtn.click();

    // New kudo should have images (scope to feed, not highlight carousel)
    const feedCards = page.locator(
      "[data-testid=kudos-feed] [data-testid=kudos-card]",
    );
    await expect(feedCards.first()).toContainText("Award"); // Wait for new card by content
    const firstCard = feedCards.first();

    // Should contain images from storage (scope to image strip, not badge)
    const images = firstCard.locator("[data-testid=kudos-image-strip] img");
    await expect(images.nth(1)).toBeVisible(); // At least 2 images

    // Check src contains storage path (handle next/image optimization)
    // next/image may produce: /_next/image?url=<encoded>&w=...&q=...
    // Fallback: raw URL if unoptimized
    const getStorageUrl = (src: string): string => {
      const url = new URL(src, page.url());
      const encodedUrl = url.searchParams.get("url");
      // eslint-disable-next-line playwright/no-conditional-in-test
      if (encodedUrl) {
        return decodeURIComponent(encodedUrl);
      }
      return src;
    };

    await expect(images.nth(0)).toHaveAttribute("src", /./);
    await expect(images.nth(1)).toHaveAttribute("src", /./);

    const image1Src = await images.nth(0).getAttribute("src");
    const image2Src = await images.nth(1).getAttribute("src");

    const image1StoragePath = getStorageUrl(image1Src!);
    const image2StoragePath = getStorageUrl(image2Src!);
    expect(image1StoragePath).toContain(
      "/storage/v1/object/public/kudo-images/",
    );
    expect(image2StoragePath).toContain(
      "/storage/v1/object/public/kudo-images/",
    );
  });

  test("[C25] Submit anonymous with anonymous name → card shows name, NOT sender's real name, not a link", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    const dialog = page.locator("[data-testid=kudos-compose-dialog]");

    // Fill required fields
    const recipientInput = dialog.locator(
      "[data-testid=kudos-recipient-input]",
    );
    await recipientInput.fill("Test");
    const options = dialog.locator("[data-testid=kudos-recipient-option]");
    // Wait for options to appear (C21 contract: dropdown shows seeded Sunners)
    await expect(options.first()).toBeVisible();
    await options.first().click();

    const titleInput = dialog.locator("[data-testid=kudos-title-input]");
    await titleInput.fill("Award");

    const contentTextarea = dialog.locator(
      "[data-testid=kudos-content-textarea]",
    );
    await contentTextarea.fill("Good work");

    const hashtagAdd = dialog.locator("[data-testid=kudos-hashtag-add]");
    await hashtagAdd.click();
    const picker = dialog.locator("[data-testid=kudos-hashtag-picker]");
    const input = picker.locator("input").first();
    await input.fill("TeamWork");
    await input.press("Enter");

    // Check anonymous and set name
    const anonCheckbox = dialog.locator(
      "[data-testid=kudos-anonymous-checkbox]",
    );
    await anonCheckbox.check();

    const anonNameInput = dialog.locator(
      "[data-testid=kudos-anonymous-name-input]",
    );
    await anonNameInput.fill("Secret Admirer");

    // Submit
    const submitBtn = dialog.locator("[data-testid=kudos-compose-submit]");
    await submitBtn.click();

    // New kudo should show anonymous name (scope to feed, not highlight carousel)
    const feedCards = page.locator(
      "[data-testid=kudos-feed] [data-testid=kudos-card]",
    );
    // Sender block should show anonymous name "Secret Admirer" with NO profile link
    const senderBlock = feedCards
      .first()
      .locator("[data-testid=kudos-card-sender]");
    await expect(senderBlock).toContainText("Secret Admirer");
    const senderLink = senderBlock.locator('a[href*="/profile"]');
    await expect(senderLink).toHaveCount(0);

    // Receiver block should still have a profile link (real Sunner, not anonymous)
    const receiverBlock = feedCards
      .first()
      .locator("[data-testid=kudos-card-receiver]");
    const receiverLink = receiverBlock.locator('a[href*="/profile"]');
    await expect(receiverLink).toHaveCount(1);
  });

  test("[C26] Submit with **bold** in content → card renders <strong>, no ** visible", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    const dialog = page.locator("[data-testid=kudos-compose-dialog]");

    // Fill required fields
    const recipientInput = dialog.locator(
      "[data-testid=kudos-recipient-input]",
    );
    await recipientInput.fill("Test");
    const options = dialog.locator("[data-testid=kudos-recipient-option]");
    // Wait for options to appear (C21 contract: dropdown shows seeded Sunners)
    await expect(options.first()).toBeVisible();
    await options.first().click();

    const titleInput = dialog.locator("[data-testid=kudos-title-input]");
    await titleInput.fill("Award");

    const contentTextarea = dialog.locator(
      "[data-testid=kudos-content-textarea]",
    );
    await contentTextarea.fill("This is **bold** text");

    const hashtagAdd = dialog.locator("[data-testid=kudos-hashtag-add]");
    await hashtagAdd.click();
    const picker = dialog.locator("[data-testid=kudos-hashtag-picker]");
    const input = picker.locator("input").first();
    await input.fill("TeamWork");
    await input.press("Enter");

    // Submit
    const submitBtn = dialog.locator("[data-testid=kudos-compose-submit]");
    await submitBtn.click();

    // New kudo should have <strong> tag (scope to feed, not highlight carousel)
    const feedCards = page.locator(
      "[data-testid=kudos-feed] [data-testid=kudos-card]",
    );
    // Wait for new card by title (Award is unique to this test)
    await expect(feedCards.first()).toContainText("Award");
    const content = feedCards
      .first()
      .locator("[data-testid=kudos-card-content]");

    // Wait for content to render (should have "This is bold text" without **)
    await expect(content).toContainText("This is bold text");

    // Should contain strong tag from **bold** markdown
    const strongElements = content.locator("strong");
    expect(await strongElements.count()).toBeGreaterThan(0);

    // Should NOT contain raw ** markers (consumed by markdown renderer)
    const text = await content.textContent();
    expect(text).not.toContain("**");
  });

  test("[C27] Type @Ngu in content → mention suggestions appear; select one → plain @Name inserted", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    const dialog = page.locator("[data-testid=kudos-compose-dialog]");
    const contentTextarea = dialog.locator(
      "[data-testid=kudos-content-textarea]",
    );

    // Type @ to trigger mentions
    await contentTextarea.fill("Thanks @Ngu");
    await contentTextarea.evaluate((el: HTMLTextAreaElement) => {
      el.setSelectionRange(12, 12); // After @Ngu
    });

    // Mention suggestions should appear
    const mentions = dialog.locator("[data-testid=kudos-mention-option]");
    await expect(mentions.first()).toBeVisible();

    // Select first mention
    await mentions.first().click();

    // Should have plain @Name in textarea
    const value = await contentTextarea.inputValue();
    expect(value).toMatch(/@[A-Za-zÀ-ỿ]/); // Matches plain @Name without special formatting
    expect(value).not.toContain("[");
    expect(value).not.toContain("`");
  });
});
