(async () => {
  const LOGIN_URL = 'http://localhost:3000/login';
  const testPassword = 'Test@1234';

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

    // Find password input on Auth0 page
    const pwdInput = page.locator('input[type="password"]').first();
    await pwdInput.waitFor({ state: 'visible', timeout: 10000 });

    // Fill and verify
    await pwdInput.fill('');
    await pwdInput.fill(testPassword);
    await page.waitForTimeout(300);

    const inputType = await pwdInput.getAttribute('type');
    const inputValue = await pwdInput.inputValue();

    console.log('Detected input[type]:', inputType);
    console.log('Read back input value (masked not shown):', inputValue ? '(non-empty)' : '(empty)');

    const isMasked = inputType && inputType.toLowerCase() === 'password';
    const valueMatches = inputValue === testPassword;

    console.log('\n=== Result ===');
    if (isMasked && valueMatches) {
      console.log('PASS: Password input is in protected format (type="password") and accepted the text.');
      await browser.close();
      process.exit(0);
    } else {
      if (!isMasked) console.log('FAIL: input[type] is not "password" (found: ' + inputType + ')');
      if (!valueMatches) console.log('FAIL: typed value does not match inputValue (typed vs readback)');
      await browser.close();
      process.exit(1);
    }
  } catch (err) {
    console.error('Script error:', err && err.message ? err.message : err);
    if (browser) try { await browser.close(); } catch (e) {}
    process.exit(2);
  }
})();
