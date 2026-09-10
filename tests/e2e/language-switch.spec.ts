import { test, expect } from "@playwright/test";

/**
 * F002_LanguageSwitch — MoMorph `hUyaaugye2` (screen `SCR001_LoginScreen`).
 *
 * Phase 06 closed a gap where this screen's spec was never read during the
 * original build: `IconEnFlag` didn't exist, the trigger always rendered the
 * VN flag regardless of locale, menu options carried no flag at all, and the
 * active option had no visually distinct state. None of this was ever
 * asserted at the browser level — persistence itself was already correct
 * (`set-locale.ts` was implemented for phase 04), but no Playwright test ever
 * clicked a `menuitem`, reloaded, and read the resulting cookie.
 *
 * Not tagged with a TC id prefix like the rest of the suite because this
 * screen shipped with zero MoMorph test cases (`download_test_cases` on
 * `hUyaaugye2` returned 0 rows) — [LS#] ids are local to this file.
 */
test.describe("Language selector — hUyaaugye2 fidelity", () => {
  // Start every test from a clean slate: no NEXT_LOCALE cookie, so the
  // default-locale assertions (LS1, LS2, LS3, LS6) are not accidentally
  // satisfied by a cookie a previous test left behind.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("[LS1] default locale shows exactly the VN flag on the trigger", async ({
    page,
  }) => {
    await page.goto("/login");

    const trigger = page.locator('header button[aria-haspopup="menu"]');
    await expect(trigger).toBeVisible();

    const vnFlag = trigger.getByTestId("flag-vn");
    await expect(vnFlag.locator("svg")).toHaveCount(1);
    await expect(trigger.getByTestId("flag-en")).toHaveCount(0);
  });

  test("[LS2] every menu option renders exactly one flag svg", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.locator('header button[aria-haspopup="menu"]').click();

    const items = page.locator('[role="menuitem"]');
    await expect(items).toHaveCount(2);

    const count = await items.count();
    for (let i = 0; i < count; i++) {
      await expect(items.nth(i).locator("svg")).toHaveCount(1);
    }
  });

  test("[LS3] the active option carries aria-current and a distinct background from the other option", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.locator('header button[aria-haspopup="menu"]').click();

    const vnItem = page.locator('[role="menuitem"]:has-text("VN")');
    const enItem = page.locator('[role="menuitem"]:has-text("EN")');

    // VN is the default active locale in this clean-cookie context.
    await expect(vnItem).toHaveAttribute("aria-current", "true");
    await expect(enItem).not.toHaveAttribute("aria-current", "true");

    // `role="menuitem"` must not have changed to `menuitemradio` — 30 live
    // assertions in login.spec.ts / home.spec.ts / home-widget-fab.spec.ts
    // select on `[role="menuitem"]`.
    await expect(vnItem).toHaveAttribute("role", "menuitem");
    await expect(enItem).toHaveAttribute("role", "menuitem");

    const [vnBackground, enBackground] = await Promise.all([
      vnItem.evaluate((el) => getComputedStyle(el).backgroundColor),
      enItem.evaluate((el) => getComputedStyle(el).backgroundColor),
    ]);
    expect(vnBackground).not.toBe(enBackground);
  });

  test("[LS4] selecting EN swaps the trigger flag to the UK flag", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.locator('header button[aria-haspopup="menu"]').click();
    await page.locator('[role="menuitem"]:has-text("EN")').click();

    const trigger = page.locator('header button[aria-haspopup="menu"]');
    await expect(trigger.getByTestId("flag-en").locator("svg")).toHaveCount(1);
    await expect(trigger.getByTestId("flag-vn")).toHaveCount(0);
  });

  test("[LS5] selecting EN survives a reload and writes a spec-correct NEXT_LOCALE cookie", async ({
    page,
    context,
  }) => {
    await page.goto("/login");

    await page.locator('header button[aria-haspopup="menu"]').click();
    await page.locator('[role="menuitem"]:has-text("EN")').click();

    // Round-trip re-render, no full page reload yet.
    await expect(
      page.locator('header button[aria-haspopup="menu"]'),
    ).toContainText("EN");

    await page.reload();

    const trigger = page.locator('header button[aria-haspopup="menu"]');
    await expect(trigger).toContainText("EN");
    await expect(trigger.getByTestId("flag-en").locator("svg")).toHaveCount(1);

    // Cookie contract from `src/app/_actions/set-locale.ts:29-34`:
    // path "/", maxAge 31536000s (~1 year), sameSite "lax".
    const cookies = await context.cookies();
    const localeCookie = cookies.find((c) => c.name === "NEXT_LOCALE");
    expect(localeCookie).toBeDefined();
    expect(localeCookie?.value).toBe("en");
    expect(localeCookie?.path).toBe("/");
    expect(localeCookie?.sameSite).toBe("Lax");

    const expectedExpirySeconds = Date.now() / 1000 + 31536000;
    // ±120s tolerance for the time the test run itself takes.
    expect(localeCookie?.expires).toBeGreaterThan(expectedExpirySeconds - 120);
    expect(localeCookie?.expires).toBeLessThan(expectedExpirySeconds + 120);
  });

  test("[LS6] the menu offers exactly two options, VN and EN, in that order", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.locator('header button[aria-haspopup="menu"]').click();

    const items = page.locator('[role="menuitem"]');
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toContainText("VN");
    await expect(items.nth(1)).toContainText("EN");
  });
});
