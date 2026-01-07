(async () => {
  const LOGIN_URL = 'http://34.234.86.155:3000/login';
  const testPassword = 'Abc123!@#'; // alphabets + numbers + special characters

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

    // wait for Auth0 page (title contains Auth0) or input present
    try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }); } catch(e){ await page.waitForTimeout(2000); }

    // Locate password input
    const pwdInput = page.locator('input[type="password"]').first();
    await pwdInput.waitFor({ state: 'visible', timeout: 10000 });

    console.log('Filling password with:', testPassword);
    await pwdInput.fill('');
    await pwdInput.fill(testPassword);
    await page.waitForTimeout(300);

    // Read back value using inputValue()
    const value = await pwdInput.inputValue();

    console.log('Read back password value (masked):', value ? '(non-empty)' : '(empty)');

    const acceptsAll = value === testPassword;

    console.log('\n=== Result ===');
    if (acceptsAll) {
      console.log('PASS: Password field accepted alphabets, numbers, and special characters together.');
      await browser.close();
      process.exit(0);
    } else {
      console.log('FAIL: Password field did NOT accept the combined input as typed.');
      console.log('Typed:', testPassword);
      console.log('Read:', value);
      await browser.close();
      process.exit(1);
    }
  } catch (err) {
    console.error('Script error:', err && err.message ? err.message : err);
    if (browser) try { await browser.close(); } catch (e) {}
    process.exit(2);
  }
})();
