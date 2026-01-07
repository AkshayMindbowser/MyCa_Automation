(async () => {
  const LOGIN_URL = 'http://34.234.86.155:3000/login';
  const TARGET_URL = 'http://34.234.86.155:3000/hospitals';
  const EMAIL = 'shrinath.himane@mindbowser.com';
  const PASSWORD = 'Test@1234';

  const { chromium } = require('playwright');
  let browser;
  try {
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('1) First login: navigate and sign in');
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 30000 });
    const superBtn = page.locator('button:has-text("Login as Super Admin")').first();
    await superBtn.waitFor({ state: 'visible', timeout: 10000 });
    await superBtn.click();
    try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }); } catch(e) { await page.waitForTimeout(1500); }

    const email = page.locator('input[type="email"]').first();
    const pwd = page.locator('input[type="password"]').first();
    await email.waitFor({ state: 'visible', timeout: 10000 });
    await pwd.waitFor({ state: 'visible', timeout: 10000 });
    await email.fill(EMAIL);
    await pwd.fill(PASSWORD);

    const submit = page.locator('button:has-text("Log In"), button:has-text("Login"), button[type="submit"]').first();
    await submit.waitFor({ state: 'visible', timeout: 10000 });
    await submit.click();

    // Wait for dashboard
    try {
      await page.waitForURL(TARGET_URL, { timeout: 25000 });
    } catch (e) {
      await page.waitForTimeout(2000);
    }
    console.log('-> First login final URL:', page.url());
    if (page.url() !== TARGET_URL) {
      console.log('FAIL: First login did not reach dashboard');
      await browser.close();
      process.exit(1);
    }

    console.log('2) Logging out from dashboard');
    // Try several common logout selectors
    const logoutSelectors = [
      'button:has-text("Log Out")',
      'button:has-text("Logout")',
      'a:has-text("Log Out")',
      'a:has-text("Logout")',
      'text=/Sign out|Sign Off/i'
    ];

    let clickedLogout = false;
    for (const sel of logoutSelectors) {
      try {
        const el = page.locator(sel).first();
        await el.waitFor({ state: 'visible', timeout: 3000 });
        await el.click();
        clickedLogout = true;
        break;
      } catch (err) {
        // try next selector
      }
    }

    if (!clickedLogout) {
      console.log('WARN: Logout control not found with common selectors. Attempting header menu fallback.');
      // fallback: click any element that contains 'Log out' case-insensitive
      try {
        const anyLogout = page.locator('text=/log out|logout|sign out/i').first();
        await anyLogout.waitFor({ state: 'visible', timeout: 3000 });
        await anyLogout.click();
        clickedLogout = true;
      } catch (err) {
        console.log('FAIL: Could not find a logout control to click.');
        await browser.close();
        process.exit(1);
      }
    }

    // Wait for navigation back to login (app login or Auth0 depending on flow)
    try {
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch (e) { await page.waitForTimeout(1500); }

    // Detect we're logged out: either on app login with 'Login as Super Admin' or at an Auth0 screen
    const onLoginScreen = await page.locator('button:has-text("Login as Super Admin")').first().isVisible().catch(() => false);
    if (!onLoginScreen) {
      console.log('Logout may have redirected to Auth0 or another page. Checking for email input.');
    }
    console.log('-> After logout current URL:', page.url());

    console.log('3) Second login: attempt to login again');
    // If we are back on the app login, click the super admin button again
    if (onLoginScreen) {
      await page.locator('button:has-text("Login as Super Admin")').first().click();
      try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }); } catch(e) { await page.waitForTimeout(1500); }
    }

    // Fill credentials and submit again
    const email2 = page.locator('input[type="email"]').first();
    const pwd2 = page.locator('input[type="password"]').first();
    await email2.waitFor({ state: 'visible', timeout: 10000 });
    await pwd2.waitFor({ state: 'visible', timeout: 10000 });
    await email2.fill(EMAIL);
    await pwd2.fill(PASSWORD);
    const submit2 = page.locator('button:has-text("Log In"), button:has-text("Login"), button[type="submit"]').first();
    await submit2.waitFor({ state: 'visible', timeout: 10000 });
    await submit2.click();

    // Wait for dashboard again
    try {
      await page.waitForURL(TARGET_URL, { timeout: 25000 });
    } catch (e) {
      await page.waitForTimeout(2000);
    }

    console.log('-> Second login final URL:', page.url());
    if (page.url() === TARGET_URL) {
      console.log('\nPASS: Re-login successful — user returned to dashboard');
      await browser.close();
      process.exit(0);
    } else {
      console.log('\nFAIL: Re-login did not reach dashboard');
      await browser.close();
      process.exit(1);
    }

  } catch (err) {
    console.error('Script error:', err && err.message ? err.message : err);
    if (browser) try { await browser.close(); } catch (e) {}
    process.exit(2);
  }
})();
