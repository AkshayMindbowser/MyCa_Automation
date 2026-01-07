/**
 * Playwright script for Qase case 517: verify navigation to Settings page via sidebar
 */
const { chromium } = require('playwright');

(async () => {
  const LOGIN_URL = 'http://34.234.86.155:3000/login';
  const email = 'shrinath.himane@mindbowser.com';
  const password = 'Test@1234';

  let browser;
  try {
    // Launch Chromium maximized and create a context with no fixed viewport
    browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
    const context = await browser.newContext({ viewport: null });
    const page = await context.newPage();

    // Login flow
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 30000 });
    const loginAsAdminBtn = page.locator('button:has-text("Login as Super Admin")').first();
    await loginAsAdminBtn.waitFor({ state: 'visible', timeout: 10000 });
    await loginAsAdminBtn.click();
    try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }); } catch (e) { await page.waitForTimeout(1500); }

    const emailInput = page.locator('input[type="email"]').first();
    const pwdInput = page.locator('input[type="password"]').first();
    const loginBtn = page.locator('button:has-text("Log In"), button:has-text("Login"), button[type="submit"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 15000 });
    await pwdInput.waitFor({ state: 'visible', timeout: 15000 });
    await emailInput.fill(email);
    await pwdInput.fill(password);
    await Promise.all([ loginBtn.click().catch(() => {}), page.waitForTimeout(500) ]);
    try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }); } catch (e) {}
    await page.waitForTimeout(1500);

    // Wait for sidebar and click Settings
    // Helper: wait for selector to be visible with retries
    async function waitForVisible(page, selector, timeout = 60000, interval = 1000) {
      const loc = page.locator(selector).first();
      const start = Date.now();
      while (Date.now() - start < timeout) {
        try {
          const count = await loc.count().catch(() => 0);
          if (count > 0) {
            const vis = await loc.isVisible().catch(() => false);
            if (vis) return loc;
          }
        } catch (e) {}
        await page.waitForTimeout(interval);
      }
      throw new Error(`Timed out waiting for selector visible: ${selector}`);
    }

    const sidebar = await waitForVisible(page, 'nav, aside, .sidebar', 60000);

    // Try several selectors for Settings
    const settingsLocators = [
      'a:has-text("Settings")',
      'button:has-text("Settings")',
      'text=Settings',
      '[data-testid="settings"], [data-test="settings"], [aria-label="Settings"]'
    ];

    let clicked = false;
    for (const sel of settingsLocators) {
      try {
        const loc = sidebar.locator(sel).first();
        if (await loc.count() > 0) { await loc.click({ force: true }); clicked = true; break; }
      } catch (e) {}
    }

    await page.waitForTimeout(800);

    // Validate navigation: check for URL or settings heading
    let navOk = false;
    try {
      await page.waitForURL(/.*settings.*/i, { timeout: 5000 });
      navOk = true;
    } catch (e) {}

    if (!navOk) {
      try {
        await page.waitForSelector('h1:has-text("Settings"), h2:has-text("Settings"), .settings-page, text=Settings', { timeout: 5000 });
        navOk = true;
      } catch (e) {}
    }

    const screenshot = '517_case517.result.png';
    await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});

    if (clicked && navOk) {
      console.log('✅ PASS: Settings page opened via sidebar.');
      console.log('Screenshot saved:', screenshot);
      await browser.close();
      process.exit(0);
    } else if (!clicked) {
      console.log('❌ FAIL: Could not find/click Settings in sidebar.');
      console.log('Screenshot saved:', screenshot);
      await browser.close();
      process.exit(1);
    } else {
      console.log('❌ FAIL: Clicked Settings but navigation/heading not detected.');
      console.log('Screenshot saved:', screenshot);
      await browser.close();
      process.exit(1);
    }

  } catch (err) {
    console.error('Script error:', err && err.message ? err.message : err);
    if (browser) try { await browser.close(); } catch (e) {}
    process.exit(2);
  }
})();
