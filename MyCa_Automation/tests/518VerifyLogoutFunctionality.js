/**
 * Playwright script for Qase case 518: verify logout functionality via sidebar
 */
const { chromium } = require('playwright');

(async () => {
  const LOGIN_URL = 'http://34.234.86.155:3000/login';
  const email = 'shrinath.himane@mindbowser.com';
  const password = 'Test@1234';

  let browser;
  try {
    // Launch Chromium maximized and create a context with no fixed viewport for full-screen
    browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
    const context = await browser.newContext({ viewport: null });
    const page = await context.newPage();

    // Login flow (reused pattern)
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

    // Wait for sidebar and find Logout
    const sidebar = page.locator('nav, aside, .sidebar').first();
    await sidebar.waitFor({ state: 'visible', timeout: 20000 });

    // Use data-sidebar and text match (robust selector)
    const logoutLocator = sidebar.locator('a:has-text("Logout"), button:has-text("Logout"), [data-sidebar="menu-button"]:has-text("Logout")').first();
    if (await logoutLocator.count() === 0) {
      console.log('❌ FAIL: Logout control not found in sidebar');
      const s = '518_no_logout.png';
      await page.screenshot({ path: s, fullPage: true }).catch(()=>{});
      await browser.close();
      process.exit(1);
    }

    // Click logout and wait for login page or logged-out indicator
    await logoutLocator.click({ force: true });

    // Wait for redirect to login or token cleared
    let loggedOut = false;
    try {
      await page.waitForURL(/.*login.*/i, { timeout: 8000 });
      loggedOut = true;
    } catch (e) {
      // try visible login fields
      try {
        await page.waitForSelector('input[type="email"], text=Sign In, text=Login', { timeout: 8000 });
        loggedOut = true;
      } catch (e2) {}
    }

    const screenshot = '518_case518.result.png';
    await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});

    if (loggedOut) {
      console.log('✅ PASS: Logout navigated to login or showed login controls.');
      console.log('Screenshot saved:', screenshot);
      await browser.close();
      process.exit(0);
    } else {
      console.log('❌ FAIL: Logout did not result in login screen or login controls.');
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
