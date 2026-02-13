// Login + Redirect verification
// This script fills valid credentials on the Auth0 login and verifies final URL.
(async () => {
  const LOGIN_URL = 'http://localhost:3000/login';
  const TARGET_URL = 'http://localhost:3000/hospitals';
  const EMAIL = 'shrinath.himane@mindbowser.com';
  const PASSWORD = 'Test@1234';

  const { chromium } = require('playwright');
  let browser;
  try {
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Go to app login:', LOGIN_URL);
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Click "Login as Super Admin" to reach Auth0
    const superBtn = page.locator('button:has-text("Login as Super Admin")').first();
    await superBtn.waitFor({ state: 'visible', timeout: 10000 });
    await superBtn.click();

    // Wait briefly for Auth0 form to load
    try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }); } catch(e) { await page.waitForTimeout(1500); }

    // Fill login form
    const email = page.locator('input[type="email"]').first();
    const pwd = page.locator('input[type="password"]').first();
    await email.waitFor({ state: 'visible', timeout: 10000 });
    await pwd.waitFor({ state: 'visible', timeout: 10000 });
    await email.fill(EMAIL);
    await pwd.fill(PASSWORD);

    // Submit
    const submit = page.locator('button:has-text("Log In"), button:has-text("Login"), button[type="submit"]').first();
    await submit.waitFor({ state: 'visible', timeout: 10000 });
    await submit.click();

    // Wait for redirect to dashboard
    try {
      await page.waitForURL(TARGET_URL, { timeout: 25000 });
    } catch (e) {
      // give short extra time
      await page.waitForTimeout(2000);
    }

    const final = page.url();
    console.log('Final URL ->', final);
    if (final === TARGET_URL) {
      console.log('PASS: landed on dashboard');
      await browser.close();
      process.exit(0);
    } else {
      console.log('FAIL: did not reach dashboard');
      await browser.close();
      process.exit(1);
    }
  } catch (err) {
    console.error('Error:', err && err.message ? err.message : err);
    if (browser) try { await browser.close(); } catch (e) {}
    process.exit(2);
  }
})();