(async () => {
  const LOGIN_URL = 'http://localhost:3000/login';
  const TARGET_URL = 'http://localhost:3000/hospitals';
  const EMAIL = 'shrinath.himane@mindbowser.com';
  const PASSWORD = 'Test@1234';

  const { chromium } = require('playwright');
  let browser;
  try {
    console.log('Launching Chromium (headful)...');
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Navigating to', LOGIN_URL);
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Click "Login as Super Admin" to reach Auth0
    const loginAsAdminBtn = page.locator('button:has-text("Login as Super Admin")').first();
    await loginAsAdminBtn.waitFor({ state: 'visible', timeout: 8000 });
    await loginAsAdminBtn.click();

    // Wait for Auth0 login form
    try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }); } catch(e){ await page.waitForTimeout(1500); }

    // Fill credentials
    const emailInput = page.locator('input[type="email"]').first();
    const pwdInput = page.locator('input[type="password"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await pwdInput.waitFor({ state: 'visible', timeout: 10000 });

    console.log('Filling credentials...');
    await emailInput.fill(EMAIL);
    await pwdInput.fill(PASSWORD);

    // Click login button
    const loginBtn = page.locator('button:has-text("Log In"), button:has-text("Login"), button[type="submit"]').first();
    await loginBtn.waitFor({ state: 'visible', timeout: 8000 });
    await loginBtn.click();

    // Wait for redirect to target
    console.log('Waiting for redirect to dashboard...');
    try {
      await page.waitForURL(TARGET_URL, { timeout: 20000 });
    } catch (e) {
      // fallback: wait for url that startsWith target
      await page.waitForTimeout(1500);
    }

    const finalUrl = page.url();
    console.log('Final URL:', finalUrl);

    if (finalUrl === TARGET_URL) {
      console.log('\nPASS: Redirected to dashboard:', TARGET_URL);
      await browser.close();
      process.exit(0);
    } else {
      console.log('\nFAIL: Did not reach dashboard.');
      await browser.close();
      process.exit(1);
    }
  } catch (err) {
    console.error('Script error:', err && err.message ? err.message : err);
    if (browser) try { await browser.close(); } catch (e) {}
    process.exit(2);
  }
})();
