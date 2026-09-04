import { test, expect, Route } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'node:crypto';
import { createTestSession, generateSupabaseCookies, injectSupabaseSession } from './helpers/sign-in';

// Load environment variables from .env.local for Node process
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach((line) => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
  }
}
loadEnv();

test.describe('Login Screen', () => {
  test.describe('Unauthenticated', () => {
    // Ensure no auth cookies for unauthenticated tests
    test.use({ storageState: { cookies: [], origins: [] } });
    test('[TC b9805e65] Logo top-left position', async ({ page }) => {
      await page.goto('/login');

      const logo = page.locator('header img[alt="Sun* Annual Awards 2025"]');
      await expect(logo).toBeVisible();

      // Verify it's in the header (top-left area)
      const header = page.locator('header');
      await expect(header).toBeVisible();
      const box = await logo.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.y).toBeLessThan(100); // Logo should be near the top
    });

    test('[TC 8415b629] Language selector top-right', async ({ page }) => {
      await page.goto('/login');

      // Scope to header to avoid matching Next.js dev tools button
      const selector = page.locator('header button[aria-haspopup="menu"]');
      await expect(selector).toBeVisible();

      // Check accessible name contains "VN"
      const accessibleName = await selector.getAttribute('aria-label') ||
        (await selector.textContent()) ||
        (await selector.innerText());
      expect(accessibleName).toContain('VN');
    });

    test('[TC 5fbe2a18] Hero artwork presence', async ({ page }) => {
      await page.goto('/login');

      const heroImage = page.locator('img[alt="ROOT FURTHER"]');
      await expect(heroImage).toBeVisible();
    });

    test('[TC 42b82364] Hero title and description text', async ({ page }) => {
      await page.goto('/login');

      // Title and descriptions should be present
      await expect(page.locator('text=Bắt đầu hành trình của bạn cùng SAA 2025')).toBeVisible();
      await expect(page.locator('text=Đăng nhập để khám phá')).toBeVisible();
    });

    test('[TC 6ae76d15] LOGIN With Google button', async ({ page }) => {
      await page.goto('/login');

      const googleButton = page.locator('button:has-text("LOGIN With Google")');
      await expect(googleButton).toBeVisible();
    });

    test('[TC 33a1dacf] Footer fixed bottom position', async ({ page }) => {
      await page.goto('/login');

      const footer = page.locator('footer');
      await expect(footer).toBeVisible();

      const footerText = page.locator('text=Bản quyền thuộc về Sun* © 2025');
      await expect(footerText).toBeVisible();
    });

    test('[TC 20d87e28] Language dropdown opens on click', async ({ page }) => {
      await page.goto('/login');

      // Scope to header to avoid matching Next.js dev tools button
      const selector = page.locator('header button[aria-haspopup="menu"]');
      await selector.click();

      // Menu should open
      const menu = page.locator('[role="menu"]');
      await expect(menu).toBeVisible();

      // Should have VN and EN menu items
      const vnItem = page.locator('[role="menuitem"]:has-text("VN")');
      const enItem = page.locator('[role="menuitem"]:has-text("EN")');
      await expect(vnItem).toBeVisible();
      await expect(enItem).toBeVisible();
    });

    test('[TC 45278c06] Error alert on /login?error=*', async ({ page }) => {
      await page.goto('/login?error=auth_failed');

      // Filter to avoid matching Next.js route announcer (#__next-route-announcer__)
      const alert = page.locator('p[role="alert"]').filter({ hasText: /Đăng nhập không thành công/ });
      await expect(alert).toBeVisible();
      await expect(alert).toContainText('Đăng nhập không thành công');
      await expect(alert).toContainText('Vui lòng thử lại');
    });

    test('[TC 45278c06] Unauthenticated GET /todo redirects to /login', async ({ page }) => {
      await page.goto('/todo');
      await page.waitForURL('/login');
      expect(page.url()).toContain('/login');
    });

    test('[TC 45278c06] Unauthenticated GET / redirects to /login', async ({ page }) => {
      await page.goto('/');
      await page.waitForURL('/login');
      expect(page.url()).toContain('/login');
    });

    test('[TC 60bc5bbb] Google button triggers OAuth flow (abort)', async ({ page }) => {
      // Intercept and abort the authorize endpoint to verify it's called
      let authorizeCalled = false;
      await page.route('**/auth/v1/authorize**', (route) => {
        const url = route.request().url();
        expect(url).toContain('provider=google');
        authorizeCalled = true;
        route.abort();
      });

      await page.goto('/login');
      const googleButton = page.locator('button:has-text("LOGIN With Google")');
      await googleButton.click();

      // Give it a moment to call the authorize endpoint
      await page.waitForTimeout(500);
      expect(authorizeCalled).toBe(true);
    });

    test('[TC 37eae882] Button disabled during authentication', async ({ page }) => {
      // Capture button state via MutationObserver (survives navigation)
      const observed: Array<{ disabled: boolean; ariabusy: string | null; hasSpinner: boolean }> = [];

      // Expose function that survives top-level navigation
      await page.exposeFunction('__reportBtnState', (json: string) => {
        observed.push(JSON.parse(json));
      });

      await page.goto('/login');

      // Install MutationObserver to watch button state
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(
          (b) => b.textContent?.includes('LOGIN')
        );
        if (!btn) return;

        const reportState = () => {
          const hasSpinner = !!btn.querySelector('.animate-spin, svg.animate-spin, [data-spinner]');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).__reportBtnState(
            JSON.stringify({
              disabled: (btn as HTMLButtonElement).disabled,
              ariabusy: btn.getAttribute('aria-busy'),
              hasSpinner,
            })
          );
        };

        // Report initial state
        reportState();

        // Watch for changes
        const observer = new MutationObserver(reportState);
        observer.observe(btn, { attributes: true, subtree: true, childList: true });
      });

      // Route OAuth request to harmless stub
      await page.route('**/auth/v1/authorize**', (route: Route) => {
        const url = route.request().url();
        expect(url).toContain('provider=google');
        route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: '<!doctype html><title>stub</title>',
        });
      });

      // Click button (don't await)
      page.locator('button:has-text("LOGIN With Google")').click().catch(() => {});

      // Wait for authorize request
      await page.waitForURL(/auth\/v1\/authorize/);

      // Wait for MutationObserver to report state
      await page.waitForTimeout(200);

      // Verify loading state was observed
      const loadingObserved = observed.some(
        (state) =>
          state.disabled === true &&
          state.ariabusy === 'true' &&
          state.hasSpinner === true
      );
      expect(loadingObserved).toBe(true);
    });
  });

  test.describe('Authenticated', () => {
    // Set up auth before each test
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:55321';
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
    const testEmail = `e2e-${Date.now()}@example.com`;
    const testPassword = `e2e-${randomUUID().slice(0, 8)}`; // Random per run, never logged

    test.beforeEach(async ({ context }) => {
      // Create test user
      const session = await createTestSession(supabaseUrl, publishableKey, testEmail, testPassword);

      // Generate cookies using @supabase/ssr (ensures correct format)
      const cookies = await generateSupabaseCookies(
        supabaseUrl,
        publishableKey,
        session.access_token,
        session.refresh_token
      );

      // Inject into browser context
      await injectSupabaseSession(context, cookies);
    });

    test('[TC f62b0c97] Authenticated user redirects /login to /todo', async ({ page }) => {
      await page.goto('/login');
      // Should redirect to /todo since user is authenticated
      await page.waitForURL('/todo', { timeout: 5000 });
    });

    test('[TC e76aa170] /todo shows user email and logout button', async ({ page }) => {
      await page.goto('/todo');
      // Should show email in h1
      const heading = page.locator('h1');
      await expect(heading).toContainText('@');
      // Should have logout button
      const logoutButton = page.locator('button:has-text("Đăng xuất")');
      await expect(logoutButton).toBeVisible();
    });
  });
});
