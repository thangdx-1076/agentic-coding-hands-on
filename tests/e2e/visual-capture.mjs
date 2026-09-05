import { readFileSync, existsSync, mkdirSync } from "fs";
import { resolve } from "path";

import { chromium } from "playwright";

async function captureVisuals() {
  // Load env vars
  const envPath = resolve(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf-8");
    content.split("\n").forEach((line) => {
      const [key, value] = line.split("=");
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1024 },
  });

  const page = await context.newPage();
  const outputDir = resolve(
    process.cwd(),
    "plans/260904-1633-login-page-google-oauth/data",
  );
  mkdirSync(outputDir, { recursive: true });

  try {
    // Capture /login (VI)
    await page.goto("http://localhost:3000/login", {
      waitUntil: "networkidle",
    });
    await page.screenshot({ path: `${outputDir}/actual.png` });
    console.log("✓ Captured /login (vi)");

    // Capture /login (EN)
    await page.locator('header button[aria-haspopup="menu"]').click();
    await page.locator('[role="menuitem"]:has-text("EN")').click();
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `${outputDir}/actual-en.png` });
    console.log("✓ Captured /login (en)");

    // Capture /login?error=x
    await page.goto("http://localhost:3000/login?error=test", {
      waitUntil: "networkidle",
    });
    await page.screenshot({ path: `${outputDir}/actual-error.png` });
    console.log("✓ Captured /login?error=x");
  } finally {
    await browser.close();
  }
}

captureVisuals().catch(console.error);
