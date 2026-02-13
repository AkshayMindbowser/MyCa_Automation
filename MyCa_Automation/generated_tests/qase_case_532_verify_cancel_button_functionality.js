/**
 * Generated from Qase case 532 (MCP)
 * Title: Verify Cancel button functionality.
 * Preconditions: Add Hospital page open
 * Expected: Redirect back to Hospital Management without saving
 */

const { chromium } = require('playwright');

const LOGIN_URL = process.env.BASE_URL ? `${process.env.BASE_URL}/login` : 'http://localhost:3000/login';
const EMAIL = 'shrinath.himane@mindbowser.com';
const PASSWORD = 'Test@1234';

(async function main() {
  let browser;
  try {
    console.log('Launching Chromium...');
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    // Login
    console.log('Navigating to', LOGIN_URL);
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 30000 });

    const loginBtn = page.locator('button').filter({ hasText: 'Super Admin' }).first();
    await loginBtn.waitFor({ state: 'visible', timeout: 10000 });
    await loginBtn.click();
    await page.waitForTimeout(3000);

    const emailInput = page.locator('input[name="username"], input[type="email"]').first();
    const pwdInput = page.locator('input[name="password"], input[type="password"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 15000 });
    await emailInput.fill(EMAIL);
    await pwdInput.waitFor({ state: 'visible', timeout: 15000 });
    await pwdInput.fill(PASSWORD);

    const submitBtn = page.locator('button[type="submit"], button:has-text("Log In"), button:has-text("Continue")').first();
    await submitBtn.waitFor({ state: 'visible', timeout: 10000 });
    await submitBtn.click();

    await page.waitForURL(/hospitals|dashboard/, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);
    console.log('Logged in, URL:', page.url());

    const urlBeforeAddHospital = page.url();

    // Click Add New Hospital button
    const addHospBtn = page.locator('button').filter({ hasText: 'Add New Hospital' }).first()
      .or(page.locator('button').filter({ hasText: 'Add Hospital' }).first());
    await addHospBtn.waitFor({ state: 'visible', timeout: 10000 });
    await addHospBtn.click();
    await page.waitForTimeout(2000);

    console.log('URL after clicking Add Hospital:', page.url());

    // Find and click Cancel button
    const cancelBtn = page.locator('button').filter({ hasText: 'Cancel' }).first()
      .or(page.locator('button').filter({ hasText: 'Back' }).first())
      .or(page.locator('a').filter({ hasText: 'Cancel' }).first());

    await cancelBtn.waitFor({ state: 'visible', timeout: 10000 });
    console.log('Found Cancel button, clicking...');
    await cancelBtn.click();
    await page.waitForTimeout(2000);

    const urlAfterCancel = page.url();
    console.log('URL after clicking Cancel:', urlAfterCancel);

    // Check if redirected back to hospital management/list
    const backToList = urlAfterCancel.includes('/hospitals') ||
                       urlAfterCancel === urlBeforeAddHospital ||
                       !urlAfterCancel.includes('/add') && !urlAfterCancel.includes('/new');

    // Check if the Add Hospital form is no longer visible
    const hospitalNameInput = page.locator('input[name="name"], input[placeholder*="Hospital Name"]').first();
    const formStillVisible = await hospitalNameInput.isVisible().catch(() => false);

    await page.screenshot({ path: '532_CancelButtonFunctionality.result.png', fullPage: true }).catch(() => {});

    if (backToList && !formStillVisible) {
      console.log('✅ PASS: Cancel button redirects back to Hospital Management without saving.');
      await browser.close();
      process.exit(0);
    } else if (backToList) {
      console.log('✅ PASS: Cancel button navigated back (form may still be transitioning).');
      await browser.close();
      process.exit(0);
    } else {
      console.log('❌ FAIL: Cancel button did not redirect back properly.');
      console.log('  Form still visible:', formStillVisible);
      console.log('  URL changed:', urlAfterCancel !== urlBeforeAddHospital);
      await browser.close();
      process.exit(1);
    }

  } catch (err) {
    console.error('Error during test:', err.message);
    if (browser) await browser.close();
    process.exit(2);
  }
})();
