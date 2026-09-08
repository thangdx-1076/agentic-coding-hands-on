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
 * E2E tests for Secret Box Modal on /kudos (MoMorph frame J3-4YFIpMM)
 * ===================================================================
 *
 * Durable screen-level E2E spec for the Secret Box modal feature.
 * Policy: e2e-red-first. Tests FAIL now because feature is unimplemented;
 * they PASS once UI and backend are complete.
 *
 * Test-id list (single source of truth):
 * - `kudos-open-gift`: button "Mở Secret Box", enabled when secretBoxUnopened > 0
 * - `secret-box-dialog`: the `<dialog>` element housing the modal
 * - `secret-box-title`: modal title (toggles between unopened/reveal states)
 * - `secret-box-instruction`: instruction line "Click vào box để tiếp tục mở"
 * - `secret-box-box`: clickable box element
 * - `secret-box-badge`: badge image revealed after click
 * - `secret-box-label`: label text "Secretbox chưa mở"
 * - `secret-box-counter`: unopened count display
 * - `secret-box-close`: X button to close modal
 *
 * Seeding strategy (unopened count = floor(sum(heart_count WHERE sender_id=me)/5) - openings):
 * - Create counterpart user to receive kudos FROM the viewer
 * - Viewer sends 5 hearts to counterpart (viewer becomes the sender)
 * - This entitles viewer to 1 unopened box per BR-002 (hearts credit the sender)
 * - Button must be enabled (currently fails: hardcoded to 0)
 * - Dialog must render and open (currently fails: component doesn't exist)
 *
 * MoMorph TC IDs:
 * - 84a5ba82: access control: modal opens for entitled users with unopened > 0
 * - a0cd2f27: title unopened state
 * - a891383a / d9d6e01a: instruction display + hidden at count=0
 * - 4bbf0b67 / 56da7ec8: badge image no detail loss
 * - 3a8ac6b5 / ce44f5ed: counter label + backend value
 * - 632c600b / 982ae7f9: close button + closes modal
 * - 7c3c912f: click box → badge, count−1
 * - 2a8a63de: disabled when count=0
 * - 5cc072ad / 2e7bec78: client-side tampering ignored
 */

/**
 * Seed heart_count for a user via SERVICE_ROLE_KEY.
 * Creates kudo from sender to receiver with specified heart_count.
 * Sender entitlement increases by heart_count (hearts credit the SENDER per BR-002, src/dal/kudos-stats.ts:19-25).
 */
async function seedHeartCount(
  supabaseUrl: string,
  serviceRoleKey: string,
  senderId: string,
  receiverId: string,
  heartCount: number,
): Promise<void> {
  // Insert kudo from sender to receiver with the desired heart_count
  const response = await fetch(`${supabaseUrl}/rest/v1/kudos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      sender_id: senderId,
      receiver_id: receiverId,
      content: "E2E Secret Box test kudo",
      heart_count: heartCount,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to seed kudo: ${response.status} ${response.statusText} — ${text}`,
    );
  }
}

/**
 * Create a sender user via normal auth (signup/login).
 * Used to create the kudo that entitles the viewer.
 */
async function createSenderUser(
  supabaseUrl: string,
  publishableKey: string,
  email: string,
  password: string,
): Promise<{ user_id: string; access_token: string; refresh_token: string }> {
  // Try signup
  const signupResponse = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: publishableKey,
    },
    body: JSON.stringify({
      email,
      password,
      data: { full_name: "E2E Sender" },
    }),
  });

  interface AuthResponse {
    user?: { id: string };
    access_token?: string;
    refresh_token?: string;
    [key: string]: unknown;
  }

  let authData: AuthResponse = {};

  if (signupResponse.status === 422) {
    // User already exists, use password grant
    const tokenResponse = await fetch(
      `${supabaseUrl}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: publishableKey,
        },
        body: JSON.stringify({ email, password }),
      },
    );
    authData = (await tokenResponse.json()) as AuthResponse;
  } else if (signupResponse.ok) {
    authData = (await signupResponse.json()) as AuthResponse;
  } else {
    throw new Error(
      `Signup failed: ${signupResponse.status} ${signupResponse.statusText}`,
    );
  }

  if (!authData.user?.id || !authData.access_token) {
    throw new Error(
      `No user_id/token in auth response: ${JSON.stringify(authData)}`,
    );
  }

  return {
    user_id: authData.user.id,
    access_token: authData.access_token || "",
    refresh_token: authData.refresh_token || "",
  };
}

test.describe(
  "Secret Box modal on /kudos — Entitled user (unopened > 0)",
  { tag: "@auth @local-db" },
  () => {
    let supabaseUrl: string;
    let publishableKey: string;
    let serviceRoleKey: string;
    let viewerSession: {
      access_token: string;
      refresh_token: string;
      user_id: string;
    };
    let counterpartId: string;

    test.beforeEach(async ({ context }) => {
      supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.SUPABASE_URL ||
        "http://127.0.0.1:55321";
      publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
      serviceRoleKey = process.env.SERVICE_ROLE_KEY || "";

      if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
        throw new Error(
          "SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SERVICE_ROLE_KEY required",
        );
      }

      // Create viewer (the user we test on /kudos as)
      const viewerEmail = `viewer-${Date.now()}-${Math.random().toString(36).substring(7)}@secret-box-e2e.dev`;
      viewerSession = await createTestSession(
        supabaseUrl,
        publishableKey,
        viewerEmail,
        "Test@123456789",
        { full_name: "Secret Box Viewer" },
      );

      // Create counterpart (who will receive kudos FROM viewer)
      const counterpartEmail = `counterpart-${Date.now()}-${Math.random().toString(36).substring(7)}@secret-box-e2e.dev`;
      const counterpartAuth = await createSenderUser(
        supabaseUrl,
        publishableKey,
        counterpartEmail,
        "Test@123456789",
      );
      counterpartId = counterpartAuth.user_id;

      // Seed: viewer sends 5 hearts to counterpart
      // unopened = floor(5/5) − 0 = 1 (hearts credit the sender per BR-002, src/dal/kudos-stats.ts:19-25)
      await seedHeartCount(
        supabaseUrl,
        serviceRoleKey,
        viewerSession.user_id,
        counterpartId,
        5,
      );

      // Inject viewer session into browser
      const cookies = await generateSupabaseCookies(
        supabaseUrl,
        publishableKey,
        viewerSession.access_token,
        viewerSession.refresh_token,
      );
      await injectSupabaseSession(context, cookies);
    });

    test.afterEach(async () => {
      // Clean up: delete viewer user (sender cleanup optional)
      if (viewerSession?.user_id) {
        await fetch(
          `${supabaseUrl}/auth/v1/admin/users/${viewerSession.user_id}`,
          {
            method: "DELETE",
            headers: {
              apikey: publishableKey,
              Authorization: `Bearer ${viewerSession.access_token}`,
            },
          },
        ).catch(() => {
          // Silently ignore cleanup errors
        });
      }
    });

    test("[S01] Entitled user (unopened=1): kudos-open-gift ENABLED (FAILS: hardcoded unopened=0)", async ({
      page,
    }) => {
      // RED: Seeded 5 hearts = unopened should be 1. Button must be enabled.
      // FAILS because kudos/page.tsx:146-147 hardcodes unopened: 0.
      // Assertion: expect(openGiftBtn).toBeEnabled()
      await page.goto("/kudos");

      const sidebar = page.locator("[data-testid=kudos-sidebar]");
      await expect(sidebar).toBeVisible();

      const openGiftBtn = page.locator("[data-testid=kudos-open-gift]");
      await expect(openGiftBtn).toBeVisible();
      // FAILS: expected to be enabled but button.disabled = true (unopened hardcoded to 0)
      await expect(openGiftBtn).toBeEnabled();
    });

    test("[S02] Click kudos-open-gift: modal dialog opens (FAILS: modal component missing)", async ({
      page,
    }) => {
      // RED: When button enabled, click must open modal.
      // FAILS because modal component doesn't exist.
      await page.goto("/kudos");

      const openGiftBtn = page.locator("[data-testid=kudos-open-gift]");
      await openGiftBtn.click();

      const modal = page.locator("[data-testid=secret-box-dialog]");
      // FAILS: locator resolved to 0 elements
      await expect(modal).toBeVisible();
    });

    test("[S03] Modal unopened state: title = 'KHÁM PHÁ SECRET BOX CỦA BẠN'", async ({
      page,
    }) => {
      // RED: Unopened title is verbatim from clarifications.md.
      // FAILS: modal missing.
      await page.goto("/kudos");

      const openGiftBtn = page.locator("[data-testid=kudos-open-gift]");
      await openGiftBtn.click();

      const title = page.locator("[data-testid=secret-box-title]");
      // FAILS: locator resolved to 0 elements
      await expect(title).toContainText("KHÁM PHÁ SECRET BOX CỦA BẠN");
    });

    test("[S04] Modal unopened state: instruction 'Click vào box để tiếp tục mở'", async ({
      page,
    }) => {
      // RED: Instruction text verbatim from spec.
      await page.goto("/kudos");

      const openGiftBtn = page.locator("[data-testid=kudos-open-gift]");
      await openGiftBtn.click();

      const instruction = page.locator("[data-testid=secret-box-instruction]");
      // FAILS: locator resolved to 0 elements
      await expect(instruction).toContainText("Click vào box để tiếp tục mở");
    });

    test("[S05] Modal unopened state: label 'Secretbox chưa mở' + counter = 1", async ({
      page,
    }) => {
      // RED: Counter must display unopened count from backend.
      await page.goto("/kudos");

      const openGiftBtn = page.locator("[data-testid=kudos-open-gift]");
      await openGiftBtn.click();

      const label = page.locator("[data-testid=secret-box-label]");
      // FAILS: locator resolved to 0 elements
      await expect(label).toContainText("Secretbox chưa mở");

      const counter = page.locator("[data-testid=secret-box-counter]");
      // FAILS: unopened count = floor(5/5) = 1, but element doesn't exist
      await expect(counter).toContainText("1");
    });

    test("[S06] Modal unopened state: closed-box artwork visible", async ({
      page,
    }) => {
      // RED: Box image (public/standards/MM_MEDIA_box_qua_chua_mo) must render.
      await page.goto("/kudos");

      const openGiftBtn = page.locator("[data-testid=kudos-open-gift]");
      await openGiftBtn.click();

      const box = page.locator("[data-testid=secret-box-box]");
      // FAILS: locator resolved to 0 elements
      await expect(box).toBeVisible();
    });

    test("[S07] Click box: reveals badge image (64×64 intrinsic)", async ({
      page,
    }) => {
      // RED: Box click calls open_secret_box RPC, reveals badge.
      // FAILS: RPC missing, modal missing.
      await page.goto("/kudos");

      const openGiftBtn = page.locator("[data-testid=kudos-open-gift]");
      await openGiftBtn.click();

      const box = page.locator("[data-testid=secret-box-box]");
      await box.click();

      const badge = page.locator("[data-testid=secret-box-badge]");
      // FAILS: badge element never appears
      await expect(badge).toBeVisible();

      // Verify intrinsic size (not upscaled)
      const bbox = await badge.boundingBox();
      expect(bbox?.width).toBeLessThanOrEqual(65);
      expect(bbox?.height).toBeLessThanOrEqual(65);
    });

    test("[S08] Click box: unopened count decrements by 1 (FAILS: RPC missing)", async ({
      page,
    }) => {
      // RED: After reveal, count must decrement.
      // FAILS: no RPC, no count update.
      await page.goto("/kudos");

      const openGiftBtn = page.locator("[data-testid=kudos-open-gift]");
      await openGiftBtn.click();

      const counter = page.locator("[data-testid=secret-box-counter]");
      const initialCount = parseInt((await counter.textContent()) || "1");
      expect(initialCount).toBe(1);

      const box = page.locator("[data-testid=secret-box-box]");
      await box.click();

      // FAILS: count stays at 1 (no RPC → no decrement)
      await expect
        .poll(async () => parseInt((await counter.textContent()) || "1"), {
          timeout: 5000,
        })
        .toBe(0);
    });

    test("[S09] After reveal: title changes to 'MỞ SECRET BOX THÀNH CÔNG'", async ({
      page,
    }) => {
      // RED: Title changes after badge reveal per state machine.
      // FAILS: modal missing.
      await page.goto("/kudos");

      const openGiftBtn = page.locator("[data-testid=kudos-open-gift]");
      await openGiftBtn.click();

      const box = page.locator("[data-testid=secret-box-box]");
      await box.click();

      const title = page.locator("[data-testid=secret-box-title]");
      // FAILS: title never changes (no state update)
      await expect(title).toContainText("MỞ SECRET BOX THÀNH CÔNG");
    });

    test("[S10] At count=0: instruction hidden, box disabled (FAILS: RPC missing)", async ({
      page,
    }) => {
      // RED: At count=0, instruction hides and box not clickable.
      // Note: seeded only 1 box (5 hearts). This test clicks once → count=0.
      // FAILS: no state update from RPC.
      await page.goto("/kudos");

      const openGiftBtn = page.locator("[data-testid=kudos-open-gift]");
      await openGiftBtn.click();

      const box = page.locator("[data-testid=secret-box-box]");
      await box.click();

      // After 1 reveal, count should be 0
      const instruction = page.locator("[data-testid=secret-box-instruction]");
      await expect(instruction).toBeHidden();

      // Box should be disabled
      const isClickable = await box.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.pointerEvents !== "none" && style.cursor !== "not-allowed";
      });
      expect(isClickable).toBe(false);
    });

    test("[S11] Close via X button: modal closes", async ({ page }) => {
      // RED: X button closes dialog.
      // FAILS: button missing.
      await page.goto("/kudos");

      const openGiftBtn = page.locator("[data-testid=kudos-open-gift]");
      await openGiftBtn.click();

      const closeBtn = page.locator("[data-testid=secret-box-close]");
      // FAILS: close button doesn't exist
      await closeBtn.click();

      const modal = page.locator("[data-testid=secret-box-dialog]");
      await expect(modal).toBeHidden();
    });

    test("[S12] Close via Escape: modal closes", async ({ page }) => {
      // RED: Escape key closes dialog per <dialog> pattern.
      // FAILS: modal missing.
      await page.goto("/kudos");

      const openGiftBtn = page.locator("[data-testid=kudos-open-gift]");
      await openGiftBtn.click();

      const modal = page.locator("[data-testid=secret-box-dialog]");
      await expect(modal).toBeVisible();

      await page.keyboard.press("Escape");

      await expect(modal).toBeHidden();
    });
  },
);

test.describe(
  "Secret Box modal — User with unopened=0 (no hearts)",
  { tag: "@auth @local-db" },
  () => {
    let supabaseUrl: string;
    let publishableKey: string;
    let viewerSession: {
      access_token: string;
      refresh_token: string;
      user_id: string;
    };

    test.beforeEach(async ({ context }) => {
      supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.SUPABASE_URL ||
        "http://127.0.0.1:55321";
      publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

      if (!supabaseUrl || !publishableKey) {
        throw new Error("Supabase URL and publishable key required");
      }

      // Create viewer with NO seeded hearts
      // unopened = floor(0/5) − 0 = 0
      const viewerEmail = `viewer-zero-${Date.now()}-${Math.random().toString(36).substring(7)}@secret-box-e2e.dev`;
      viewerSession = await createTestSession(
        supabaseUrl,
        publishableKey,
        viewerEmail,
        "Test@123456789",
        { full_name: "Secret Box Zero Viewer" },
      );

      // Inject viewer session (no seeding)
      const cookies = await generateSupabaseCookies(
        supabaseUrl,
        publishableKey,
        viewerSession.access_token,
        viewerSession.refresh_token,
      );
      await injectSupabaseSession(context, cookies);
    });

    test.afterEach(async () => {
      if (viewerSession?.user_id) {
        await fetch(
          `${supabaseUrl}/auth/v1/admin/users/${viewerSession.user_id}`,
          {
            method: "DELETE",
            headers: {
              apikey: publishableKey,
              Authorization: `Bearer ${viewerSession.access_token}`,
            },
          },
        ).catch(() => {
          // Ignore cleanup errors
        });
      }
    });

    test("[S13] No hearts (unopened=0): button visible but DISABLED, modal never opens", async ({
      page,
    }) => {
      // DESIGN CHECK: Legitimate zero (no hearts received).
      // Button must be visible, disabled, and not open modal on click.
      // PASSES: button is visible + disabled (both hardcoded to 0) + modal doesn't open.
      await page.goto("/kudos");

      const sidebar = page.locator("[data-testid=kudos-sidebar]");
      await expect(sidebar).toBeVisible();

      const openGiftBtn = page.locator("[data-testid=kudos-open-gift]");
      await expect(openGiftBtn).toBeVisible();
      await expect(openGiftBtn).toBeDisabled();

      // Disabled button won't respond to normal click (Playwright auto-waits for enabled)
      // Attempt interaction and expect it to timeout — that's the correct behavior
      try {
        await openGiftBtn.click({ timeout: 1000 });
      } catch {
        // Expected: button is disabled and the click times out
      }

      // Modal should never open when button is disabled
      const modal = page.locator("[data-testid=secret-box-dialog]");
      await expect(modal).toHaveCount(0);
    });
  },
);

test.describe(
  "Secret Box modal — Anonymous viewer (regression guard C09)",
  { tag: "@ci-safe" },
  () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("[S15] Anonymous: no kudos-open-gift button (regression guard C09, MUST PASS always)", async ({
      page,
    }) => {
      // REGRESSION GUARD: Anonymous viewers must NEVER see the button.
      // KudosStatList returns null when stats=null (kudos-stat-list.tsx:104),
      // so sidebar renders nothing at all. No stat rows, no button.
      // This PASSES today and MUST keep passing after feature ships.
      // If this fails, the feature implementation broke the contract.
      await page.goto("/kudos");

      const sidebar = page.locator("[data-testid=kudos-sidebar]");
      await expect(sidebar).toBeVisible();

      const statRows = sidebar.locator("[data-testid=kudos-stat-row]");
      await expect(statRows).toHaveCount(0);

      const openGift = sidebar.locator("[data-testid=kudos-open-gift]");
      // MUST be 0 — no button for anonymous users, ever
      await expect(openGift).toHaveCount(0);
    });
  },
);
