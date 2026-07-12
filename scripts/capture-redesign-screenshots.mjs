import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';

async function captureScreenshots() {
  const browser = await chromium.launch();

  // Desktop screenshots (940px)
  const ctx = await browser.newContext({ viewport: { width: 940, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });

  // Wait for data to load
  await page.waitForTimeout(2000);

  // Disclaimser
  try {
    const btn = page.getByRole('button', { name: /I understand/i });
    if (await btn.isVisible({ timeout: 3000 })) {
      await btn.click();
      await page.waitForTimeout(1000);
    }
  } catch {}

  // Wait for content to render
  await page.waitForTimeout(1000);

  // Dashboard
  await page.screenshot({ path: 'screenshots/desktop-dashboard.png', fullPage: true });
  console.log('desktop-dashboard.png');

  // Setup
  await page.locator('button:has-text("Setup")').first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/desktop-setup.png', fullPage: true });
  console.log('desktop-setup.png');

  // History
  await page.locator('nav button:has-text("History")').first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/desktop-history.png', fullPage: true });
  console.log('desktop-history.png');

  // Reported
  await page.locator('nav button:has-text("Reported")').first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/desktop-reported.png', fullPage: true });
  console.log('desktop-reported.png');

  await ctx.close();

  // Mobile (390px)
  const mCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mp = await mCtx.newPage();
  await mp.goto(BASE_URL, { waitUntil: 'networkidle' });
  await mp.waitForTimeout(2000);

  try {
    const btn = mp.getByRole('button', { name: /I understand/i });
    if (await btn.isVisible({ timeout: 3000 })) {
      await btn.click();
      await mp.waitForTimeout(1000);
    }
  } catch {}

  await mp.waitForTimeout(1000);

  await mp.screenshot({ path: 'screenshots/mobile-dashboard.png', fullPage: true });
  console.log('mobile-dashboard.png');

  await mp.locator('nav button:has-text("Setup")').last().click();
  await mp.waitForTimeout(500);
  await mp.screenshot({ path: 'screenshots/mobile-setup.png', fullPage: true });
  console.log('mobile-setup.png');

  await mp.locator('nav button:has-text("History")').last().click();
  await mp.waitForTimeout(500);
  await mp.screenshot({ path: 'screenshots/mobile-history.png', fullPage: true });
  console.log('mobile-history.png');

  await mp.locator('nav button:has-text("Reported")').last().click();
  await mp.waitForTimeout(500);
  await mp.screenshot({ path: 'screenshots/mobile-reported.png', fullPage: true });
  console.log('mobile-reported.png');

  await mCtx.close();
  await browser.close();
  console.log('Done!');
}

captureScreenshots().catch(console.error);
