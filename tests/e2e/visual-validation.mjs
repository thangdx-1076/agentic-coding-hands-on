import { mkdirSync } from "fs";
import { join } from "path";

const dataDir = "plans/260904-1633-login-page-google-oauth/data";
mkdirSync(dataDir, { recursive: true });

const viewports = [
  { width: 375, height: 812, name: "final-375" },
  { width: 768, height: 1024, name: "final-768" },
  { width: 1280, height: 800, name: "final-1280" },
  { width: 1440, height: 1024, name: "final-1440" },
];

async function runValidation() {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();

  try {
    console.log("Starting visual validation...\n");

    for (const vp of viewports) {
      const page = await browser.newPage({
        viewport: { width: vp.width, height: vp.height },
      });

      await page.goto("http://localhost:3000/login", {
        waitUntil: "networkidle",
      });

      const screenshotPath = join(dataDir, `${vp.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`✓ Screenshot: ${screenshotPath}`);

      const scrollWidth = await page.evaluate(
        () => document.documentElement.scrollWidth,
      );
      const noOverflow = scrollWidth <= vp.width;
      console.log(
        `  Viewport ${vp.width}x${vp.height}: scrollWidth=${scrollWidth}, no-overflow=${noOverflow ? "PASS" : "FAIL"}`,
      );

      if (vp.width === 1440) {
        console.log("\n  === Detailed validation @ 1440x1024 ===");

        const logo = await page
          .locator('img[alt="Sun* Annual Awards 2025"]')
          .boundingBox();
        // Language selector is in header, not dev tools button
        const langSelector = await page
          .locator('header button[aria-haspopup="menu"]')
          .boundingBox();
        const googleBtn = await page
          .locator("button")
          .filter({ hasText: "LOGIN With Google" })
          .boundingBox();
        const footer = await page.locator("footer").boundingBox();

        if (logo)
          console.log(
            `  Logo: x=${Math.round(logo.x)}, y=${Math.round(logo.y)}`,
          );
        if (langSelector)
          console.log(
            `  Language Selector: x=${Math.round(langSelector.x)}, y=${Math.round(langSelector.y)}`,
          );
        if (googleBtn)
          console.log(
            `  Google button: y=${Math.round(googleBtn.y)}, bottom=${Math.round(googleBtn.y + googleBtn.height)}`,
          );
        if (footer) console.log(`  Footer: y=${Math.round(footer.y)}`);

        if (logo && langSelector) {
          console.log(
            `  Logo left of selector: ${logo.x < langSelector.x ? "PASS" : "FAIL"}`,
          );
          console.log(
            `  Both header items y < 100px: ${logo.y < 100 && langSelector.y < 100 ? "PASS" : "FAIL"}`,
          );
        }

        if (googleBtn && footer) {
          const noOverlap = googleBtn.y + googleBtn.height <= footer.y;
          console.log(
            `  Button doesn't overlap footer: ${noOverlap ? "PASS" : "FAIL"}`,
          );
        }

        // Hover on Google button
        const btnShadowBefore = await page
          .locator("button")
          .filter({ hasText: "LOGIN With Google" })
          .evaluate((el) => window.getComputedStyle(el).boxShadow);
        await page
          .locator("button")
          .filter({ hasText: "LOGIN With Google" })
          .hover();
        const btnShadowAfter = await page
          .locator("button")
          .filter({ hasText: "LOGIN With Google" })
          .evaluate((el) => window.getComputedStyle(el).boxShadow);
        const btnHoverDiffers =
          btnShadowBefore !== btnShadowAfter && btnShadowAfter !== "none";
        console.log(
          `  Google button hover shadow changes: ${btnHoverDiffers ? "PASS" : "FAIL"}`,
        );

        // Hover on language selector
        const selectorBefore = await page
          .locator('header button[aria-haspopup="menu"]')
          .evaluate((el) => {
            const style = window.getComputedStyle(el);
            return { cursor: style.cursor, bgColor: style.backgroundColor };
          });
        await page.locator('header button[aria-haspopup="menu"]').hover();
        const selectorAfter = await page
          .locator('header button[aria-haspopup="menu"]')
          .evaluate((el) => {
            const style = window.getComputedStyle(el);
            return { cursor: style.cursor, bgColor: style.backgroundColor };
          });
        const selectorHoverWorks =
          selectorAfter.cursor === "pointer" &&
          selectorAfter.bgColor !== selectorBefore.bgColor;
        console.log(
          `  Language selector cursor:pointer on hover: ${selectorHoverWorks ? "PASS" : "FAIL"}`,
        );

        // Focus on Google button
        await page
          .locator("button")
          .filter({ hasText: "LOGIN With Google" })
          .focus();
        const focusStyle = await page
          .locator("button")
          .filter({ hasText: "LOGIN With Google" })
          .evaluate((el) => {
            const style = window.getComputedStyle(el);
            return { outline: style.outline, boxShadow: style.boxShadow };
          });
        const hasFocus =
          focusStyle.outline !== "none" || focusStyle.boxShadow !== "none";
        console.log(
          `  Google button focus ring visible: ${hasFocus ? "PASS" : "FAIL"}`,
        );

        // Reduced motion
        await page.emulateMedia({ reducedMotion: "reduce" });
        const transitionDuration = await page
          .locator("button")
          .filter({ hasText: "LOGIN With Google" })
          .evaluate((el) => window.getComputedStyle(el).transitionDuration);
        const reducedMotionWorks =
          transitionDuration === "0s" || transitionDuration.startsWith("0");
        console.log(
          `  Reduced motion: transition-duration=0s: ${reducedMotionWorks ? "PASS" : "FAIL"}`,
        );

        console.log("");
      }

      await page.close();
    }

    console.log("✓ All validations complete");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runValidation().catch((e) => {
  console.error(e);
  process.exit(1);
});
