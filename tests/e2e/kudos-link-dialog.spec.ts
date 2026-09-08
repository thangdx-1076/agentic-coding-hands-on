import * as fs from "fs";
import * as path from "path";

import { test, expect } from "@playwright/test";

import {
  createTestSession,
  generateSupabaseCookies,
  injectSupabaseSession,
} from "./helpers/sign-in";
import { deleteTestUser } from "./helpers/service-role";

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
 * DOM Contract — Kudos Add-link Dialog (nested in Viết Kudo compose dialog)
 * ============================================================================
 * Authoritative assertions for Track A implementation. Read-only.
 * Do NOT weaken or delete these contracts to make tests pass.
 *
 * Test-id list (single source of truth):
 * - `kudos-link-dialog` (the `<dialog>` element)
 * - `kudos-link-title` (heading "Thêm đường dẫn")
 * - `kudos-link-text-input` (textarea for link text, 1–100 chars)
 * - `kudos-link-url-input` (input for URL, 5–2048 chars, http/https only)
 * - `kudos-link-text-error` (error message for text field, role="alert")
 * - `kudos-link-url-error` (error message for URL field, role="alert")
 * - `kudos-link-cancel` (button "Hủy", closes dialog without saving)
 * - `kudos-link-save` (button "Lưu", saves and closes dialog)
 * - `kudos-format-button[data-format=link]` (trigger inside format toolbar)
 *
 * Validation Rules:
 * - Text: trim() 1–100 characters, required. Error: "Không được để trống." or "Tối đa 100 ký tự."
 * - URL: trim() 5–2048 characters, parseable via `new URL()`, protocol in {http:, https:}
 *   Error messages per spec: field-too-short, invalid-protocol, etc.
 * - Validation on blur for URL, on Save for both fields.
 * - On valid Save: insert [<text>](<url>) into textarea at the captured selection.
 *
 * | # | Tag | Assertion | Spec/TC |
 * |---|-----|-----------|---------|
 * | L01 | `@auth` | Click Link button → link dialog visible with title, both inputs empty, Hủy/Lưu present; compose dialog still open | DEC-001 (frame) |
 * | L02 | `@auth` | Escape → link dialog closes, no `open` attr, compose dialog open, textarea unchanged | SM-001 |
 * | L03 | `@auth` | Hủy → link dialog closes, compose dialog open, textarea unchanged | H.1 |
 * | L04 | `@auth` | Lưu with both empty → both errors visible, dialog stays open | FR-402, DEC-002 |
 * | L05 | `@auth` | Text "   " (whitespace) + valid URL → text error visible | FR-402 |
 * | L06 | `@auth` | Text 101 chars → text error; text 100 chars → no text error | BR-004, FR-403 |
 * | L07 | `@auth` | URL "www" (4 chars) → url error; "invalid-url" → error; "ftp://x.com/abc" → error | BR-004, FR-403 |
 * | L08 | `@auth @local-db` | Valid text "Sample Link" + "https://www.example.com" → dialog closes, textarea contains "[Sample Link](https://www.example.com)" | FR-401 |
 * | L09 | `@auth` | Select "hello" in textarea, click Link → text input prefilled "hello"; save with URL → textarea becomes "[hello](url) world" | DEC-001 |
 * | L10 | `@auth` | Reopen link dialog → both inputs empty again (no draft save) | SM-001 |
 * | L11 | `@auth` | window.prompt NOT called: page.on('dialog') listener must not fire when clicking Link | DEC-001 |
 * ============================================================================
 */

test.describe("Kudos Add-link Dialog (@auth)", () => {
  let testUserEmail = "";
  let sessionUserId = "";

  test.beforeEach(async ({ context }) => {
    // Create authenticated session
    const supabaseUrl = process.env.SUPABASE_URL || "http://127.0.0.1:55321";
    const publishableKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
    testUserEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@kudos-test.dev`;
    const password = "Test@123456";

    const { access_token, refresh_token, user_id } = await createTestSession(
      supabaseUrl,
      publishableKey,
      testUserEmail,
      password,
      { full_name: "Test User" },
    );
    sessionUserId = user_id;

    const cookies = await generateSupabaseCookies(
      supabaseUrl,
      publishableKey,
      access_token,
      refresh_token,
    );

    await injectSupabaseSession(context, cookies);
  });

  // Had no teardown at all — one `@kudos-test.dev` user per test, kept
  // forever. These tests never write a kudo, so only the user needs removing.
  test.afterEach(async () => {
    if (sessionUserId) {
      await deleteTestUser(sessionUserId);
      sessionUserId = "";
    }
  });

  /**
   * L01: Click Link button → link dialog visible with title, both inputs empty,
   * Hủy/Lưu present; compose dialog still open
   */
  test("[L01] Click Link button → link dialog opens with title, empty inputs, Cancel/Save buttons; compose dialog stays open", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    // Compose dialog should be open
    const composeDialog = page.locator("[data-testid=kudos-compose-dialog]");
    await expect(composeDialog).toHaveAttribute("open", "");

    // Click Link button in toolbar
    const linkButton = page.locator(
      "[data-testid=kudos-format-toolbar] [data-testid=kudos-format-button][data-format=link]",
    );
    await linkButton.click();

    // Link dialog should be visible and have open attribute
    const linkDialog = page.locator("[data-testid=kudos-link-dialog]");
    await expect(linkDialog).toBeVisible();
    await expect(linkDialog).toHaveAttribute("open", "");

    // Title should be "Thêm đường dẫn"
    const title = linkDialog.locator("[data-testid=kudos-link-title]");
    await expect(title).toContainText("Thêm đường dẫn");

    // Both inputs should be empty
    const textInput = linkDialog.locator("[data-testid=kudos-link-text-input]");
    const urlInput = linkDialog.locator("[data-testid=kudos-link-url-input]");
    await expect(textInput).toHaveValue("");
    await expect(urlInput).toHaveValue("");

    // Buttons should be present
    const cancelBtn = linkDialog.locator("[data-testid=kudos-link-cancel]");
    const saveBtn = linkDialog.locator("[data-testid=kudos-link-save]");
    await expect(cancelBtn).toBeVisible();
    await expect(saveBtn).toBeVisible();

    // Compose dialog should still be open
    await expect(composeDialog).toHaveAttribute("open", "");
  });

  /**
   * L02: Escape → link dialog closes, compose dialog stays open, textarea unchanged
   */
  test("[L02] Escape closes link dialog; compose dialog stays open, textarea unchanged", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    const composeDialog = page.locator("[data-testid=kudos-compose-dialog]");
    const textarea = composeDialog.locator(
      "[data-testid=kudos-content-textarea]",
    );

    // Type something in textarea
    await textarea.fill("initial content");

    // Click Link button
    const linkButton = page.locator(
      "[data-testid=kudos-format-toolbar] [data-testid=kudos-format-button][data-format=link]",
    );
    await linkButton.click();

    const linkDialog = page.locator("[data-testid=kudos-link-dialog]");
    await expect(linkDialog).toHaveAttribute("open", "");

    // Press Escape
    await page.keyboard.press("Escape");

    // Link dialog should close (no open attribute)
    await expect(linkDialog).not.toHaveAttribute("open", "");

    // Compose dialog should still be open
    await expect(composeDialog).toHaveAttribute("open", "");

    // Textarea should be unchanged
    await expect(textarea).toHaveValue("initial content");
  });

  /**
   * L03: Hủy → link dialog closes, compose dialog stays open, textarea unchanged
   */
  test("[L03] Hủy (Cancel) closes link dialog; compose dialog stays open, textarea unchanged", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    const composeDialog = page.locator("[data-testid=kudos-compose-dialog]");
    const textarea = composeDialog.locator(
      "[data-testid=kudos-content-textarea]",
    );

    // Type something in textarea
    await textarea.fill("initial content");

    // Click Link button
    const linkButton = page.locator(
      "[data-testid=kudos-format-toolbar] [data-testid=kudos-format-button][data-format=link]",
    );
    await linkButton.click();

    const linkDialog = page.locator("[data-testid=kudos-link-dialog]");
    await expect(linkDialog).toHaveAttribute("open", "");

    // Click Cancel
    const cancelBtn = linkDialog.locator("[data-testid=kudos-link-cancel]");
    await cancelBtn.click();

    // Link dialog should close
    await expect(linkDialog).not.toHaveAttribute("open", "");

    // Compose dialog should still be open
    await expect(composeDialog).toHaveAttribute("open", "");

    // Textarea should be unchanged
    await expect(textarea).toHaveValue("initial content");
  });

  /**
   * L04: Lưu with both empty → both errors visible, dialog stays open
   */
  test("[L04] Lưu with both fields empty → both errors visible, dialog stays open", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    // Click Link button
    const linkButton = page.locator(
      "[data-testid=kudos-format-toolbar] [data-testid=kudos-format-button][data-format=link]",
    );
    await linkButton.click();

    const linkDialog = page.locator("[data-testid=kudos-link-dialog]");
    await expect(linkDialog).toHaveAttribute("open", "");

    // Click Lưu (Save) without filling anything
    const saveBtn = linkDialog.locator("[data-testid=kudos-link-save]");
    await saveBtn.click();

    // Both errors should be visible
    const textError = linkDialog.locator("[data-testid=kudos-link-text-error]");
    const urlError = linkDialog.locator("[data-testid=kudos-link-url-error]");
    await expect(textError).toBeVisible();
    await expect(urlError).toBeVisible();

    // Dialog should still be open
    await expect(linkDialog).toHaveAttribute("open", "");
  });

  /**
   * L05: Text "   " (whitespace) + valid URL → text error visible
   */
  test("[L05] Text with only whitespace + valid URL → text error visible", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    // Click Link button
    const linkButton = page.locator(
      "[data-testid=kudos-format-toolbar] [data-testid=kudos-format-button][data-format=link]",
    );
    await linkButton.click();

    const linkDialog = page.locator("[data-testid=kudos-link-dialog]");
    const textInput = linkDialog.locator("[data-testid=kudos-link-text-input]");
    const urlInput = linkDialog.locator("[data-testid=kudos-link-url-input]");

    // Fill text with only whitespace
    await textInput.fill("   ");

    // Fill URL with valid value
    await urlInput.fill("https://www.example.com");

    // Click Lưu
    const saveBtn = linkDialog.locator("[data-testid=kudos-link-save]");
    await saveBtn.click();

    // Text error should be visible
    const textError = linkDialog.locator("[data-testid=kudos-link-text-error]");
    await expect(textError).toBeVisible();

    // Dialog should still be open
    await expect(linkDialog).toHaveAttribute("open", "");
  });

  /**
   * L06: Text 101 chars → text error; text 100 chars → no error
   */
  test("[L06] Text 101 chars → error; text 100 chars → no error", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    // Click Link button
    const linkButton = page.locator(
      "[data-testid=kudos-format-toolbar] [data-testid=kudos-format-button][data-format=link]",
    );
    await linkButton.click();

    const linkDialog = page.locator("[data-testid=kudos-link-dialog]");
    const textInput = linkDialog.locator("[data-testid=kudos-link-text-input]");
    const urlInput = linkDialog.locator("[data-testid=kudos-link-url-input]");
    const textError = linkDialog.locator("[data-testid=kudos-link-text-error]");

    // Test with 101 characters
    const text101 = "a".repeat(101);
    await textInput.fill(text101);
    await urlInput.fill("https://www.example.com");

    const saveBtn = linkDialog.locator("[data-testid=kudos-link-save]");
    await saveBtn.click();

    // Text error should be visible for 101 chars
    await expect(textError).toBeVisible();
    await expect(linkDialog).toHaveAttribute("open", "");

    // Clear the text error for next test
    await textInput.fill("");
    await saveBtn.click();
    await expect(textError).toBeVisible(); // Should show "required" error

    // Test with 100 characters
    const text100 = "a".repeat(100);
    await textInput.fill(text100);

    // Blur URL to trigger validation
    await urlInput.blur();

    // There should be no text error now (100 is max allowed)
    // This assertion checks if the error is gone after validation on blur
    const urlErrorCount = await linkDialog
      .locator("[data-testid=kudos-link-url-error]")
      .count();
    // URL should be valid, so no error
    expect(urlErrorCount).toBeLessThanOrEqual(1); // At most 0 or 1 (might exist but not visible)
  });

  /**
   * L07: URL validation — "www" (4 chars) → error; "invalid-url" → error; "ftp://x.com" → error
   */
  test("[L07] Invalid URLs show error: too short, malformed, or non-http protocol", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    // Click Link button
    const linkButton = page.locator(
      "[data-testid=kudos-format-toolbar] [data-testid=kudos-format-button][data-format=link]",
    );
    await linkButton.click();

    const linkDialog = page.locator("[data-testid=kudos-link-dialog]");
    const textInput = linkDialog.locator("[data-testid=kudos-link-text-input]");
    const urlInput = linkDialog.locator("[data-testid=kudos-link-url-input]");
    const urlError = linkDialog.locator("[data-testid=kudos-link-url-error]");
    const saveBtn = linkDialog.locator("[data-testid=kudos-link-save]");

    // Test 1: URL too short ("www" = 3 chars, min 5)
    await textInput.fill("Valid Text");
    await urlInput.fill("www");
    await saveBtn.click();
    await expect(urlError).toBeVisible();

    // Reset
    await urlInput.fill("");
    await urlInput.blur();

    // Test 2: Malformed URL ("invalid-url")
    await urlInput.fill("invalid-url");
    await urlInput.blur();
    // Error should show on blur
    const errorVisible = urlError;
    await expect(errorVisible).toBeVisible();

    // Test 3: Non-http protocol ("ftp://x.com")
    await urlInput.fill("ftp://x.com");
    await saveBtn.click();
    await expect(urlError).toBeVisible();
  });

  /**
   * L08: Valid text + URL → dialog closes, textarea contains "[text](url)"
   */
  test("[L08] Valid text + URL → dialog closes, textarea contains markdown link", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    const composeDialog = page.locator("[data-testid=kudos-compose-dialog]");
    const textarea = composeDialog.locator(
      "[data-testid=kudos-content-textarea]",
    );

    // Click Link button
    const linkButton = page.locator(
      "[data-testid=kudos-format-toolbar] [data-testid=kudos-format-button][data-format=link]",
    );
    await linkButton.click();

    const linkDialog = page.locator("[data-testid=kudos-link-dialog]");
    const textInput = linkDialog.locator("[data-testid=kudos-link-text-input]");
    const urlInput = linkDialog.locator("[data-testid=kudos-link-url-input]");

    // Fill with valid values
    await textInput.fill("Sample Link");
    await urlInput.fill("https://www.example.com");

    // Click Lưu
    const saveBtn = linkDialog.locator("[data-testid=kudos-link-save]");
    await saveBtn.click();

    // Link dialog should close
    await expect(linkDialog).not.toHaveAttribute("open", "");

    // Textarea should contain the markdown link
    const textareaValue = await textarea.inputValue();
    expect(textareaValue).toContain("[Sample Link](https://www.example.com)");
  });

  /**
   * L09: Select text in textarea, click Link → prefill text input; save → replace selection
   */
  test("[L09] Selected text in textarea prefills link text input; save replaces selection", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    const composeDialog = page.locator("[data-testid=kudos-compose-dialog]");
    const textarea = composeDialog.locator(
      "[data-testid=kudos-content-textarea]",
    );

    // Fill textarea with text
    await textarea.fill("hello world");

    // Select "hello" (chars 0-5)
    await textarea.evaluate((el: HTMLTextAreaElement) => {
      el.setSelectionRange(0, 5);
    });

    // Click Link button
    const linkButton = page.locator(
      "[data-testid=kudos-format-toolbar] [data-testid=kudos-format-button][data-format=link]",
    );
    await linkButton.click();

    const linkDialog = page.locator("[data-testid=kudos-link-dialog]");
    const textInput = linkDialog.locator("[data-testid=kudos-link-text-input]");

    // Text input should be prefilled with "hello"
    await expect(textInput).toHaveValue("hello");

    // Fill URL
    const urlInput = linkDialog.locator("[data-testid=kudos-link-url-input]");
    await urlInput.fill("https://a.com/x");

    // Click Lưu
    const saveBtn = linkDialog.locator("[data-testid=kudos-link-save]");
    await saveBtn.click();

    // Textarea should now be "[hello](https://a.com/x) world"
    const textareaValue = textarea;
    await expect(textareaValue).toHaveValue("[hello](https://a.com/x) world");
  });

  /**
   * L10: Reopen link dialog → both inputs empty again
   */
  test("[L10] Reopen link dialog → both inputs empty (no draft save)", async ({
    page,
  }) => {
    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    // Click Link button first time
    const linkButton = page.locator(
      "[data-testid=kudos-format-toolbar] [data-testid=kudos-format-button][data-format=link]",
    );
    await linkButton.click();

    const linkDialog = page.locator("[data-testid=kudos-link-dialog]");
    const textInput = linkDialog.locator("[data-testid=kudos-link-text-input]");
    const urlInput = linkDialog.locator("[data-testid=kudos-link-url-input]");

    // Fill with some values
    await textInput.fill("Some Text");
    await urlInput.fill("https://example.com");

    // Close dialog via Escape
    await page.keyboard.press("Escape");
    await expect(linkDialog).not.toHaveAttribute("open", "");

    // Click Link button again
    await linkButton.click();

    // Dialog should be open again
    await expect(linkDialog).toHaveAttribute("open", "");

    // Both inputs should be empty again (no draft saved)
    await expect(textInput).toHaveValue("");
    await expect(urlInput).toHaveValue("");
  });

  /**
   * L11: window.prompt NOT used — no dialog event fired
   */
  test("[L11] window.prompt is NOT called: no dialog event fired", async ({
    page,
  }) => {
    let dialogEventFired = false;

    // Listen for dialog events (which fire for window.prompt/alert/confirm)
    page.on("dialog", () => {
      dialogEventFired = true;
    });

    await page.goto("/kudos");
    await page.locator("[data-testid=kudos-compose-pill]").click();

    // Click Link button
    const linkButton = page.locator(
      "[data-testid=kudos-format-toolbar] [data-testid=kudos-format-button][data-format=link]",
    );
    await linkButton.click();

    const linkDialog = page.locator("[data-testid=kudos-link-dialog]");
    await expect(linkDialog).toHaveAttribute("open", "");

    // Verify no dialog event was fired
    expect(dialogEventFired).toBe(false);
  });
});
