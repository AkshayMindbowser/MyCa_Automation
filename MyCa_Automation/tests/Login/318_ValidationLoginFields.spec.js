(async () => {
  const LOGIN_URL = 'http://localhost:3000/login';

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

    try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }); } catch(e){ await page.waitForTimeout(2000); }

    // Locate login button on Auth0 and attempt submit without entering credentials
    const loginBtn = page.locator('button:has-text("Log In"), button:has-text("Login"), button[type="submit"]').first();
    await loginBtn.waitFor({ state: 'visible', timeout: 10000 });

    console.log('Clicking login button without entering email/password');
    await loginBtn.click({ timeout: 5000 }).catch(() => {});

    // Wait briefly for any client-side validation messages to appear
    await page.waitForTimeout(1000);

    // Check for the specific error messages requested by the user
    // Look for exact text: "Email can't be blank" and "Password can't be blank"
    await page.waitForTimeout(1000);
    const pageHtml = await page.content();
    const hasEmailBlank = pageHtml.includes("Email can't be blank");
    const hasPasswordBlank = pageHtml.includes("Password can't be blank");

    let errorDetected = false;
    if (hasEmailBlank || hasPasswordBlank) {
      console.log('Detected messages on page: ' + (hasEmailBlank ? "Email can't be blank" : '') + (hasEmailBlank && hasPasswordBlank ? ' | ' : '') + (hasPasswordBlank ? "Password can't be blank" : ''));
      errorDetected = hasEmailBlank && hasPasswordBlank;
      if (!errorDetected) {
        console.log('Only one of the required messages was found.');
      }
    } else {
      console.log('Neither exact message was found in page HTML.');
    }

    console.log('\n=== Result ===');
    if (errorDetected) {
      console.log('PASS: Error message or validation shown when submitting without credentials.');
      await browser.close();
      process.exit(0);
    } else {
      console.log('FAIL: No error or validation shown when submitting empty credentials.');
      await browser.close();
      process.exit(1);
    }
  } catch (err) {
    console.error('Script error:', err && err.message ? err.message : err);
    if (browser) try { await browser.close(); } catch (e) {}
    process.exit(2);
  }
})();
