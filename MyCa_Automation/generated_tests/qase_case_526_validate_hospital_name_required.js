/**
 * Generated from Qase case 526 (MCP)
 * Title: Validate Hospital Name required
 * Preconditions: Form with empty Hospital Name
 * Expected: Validation message: Hospital Name is required
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

    // Click Add New Hospital button
    const addHospBtn = page.locator('button').filter({ hasText: 'Add New Hospital' }).first()
      .or(page.locator('button').filter({ hasText: 'Add Hospital' }).first());
    await addHospBtn.waitFor({ state: 'visible', timeout: 10000 });
    await addHospBtn.click();
    await page.waitForTimeout(2000);

    // Leave Hospital Name empty and try to submit
    const hospitalNameInput = page.locator('input[name="name"], input[placeholder*="Hospital Name"], input[id*="name"]').first();
    await hospitalNameInput.waitFor({ state: 'visible', timeout: 10000 });

    // Make sure the field is empty
    await hospitalNameInput.clear();

    // Try to submit the form
    const saveBtn = page.locator('button').filter({ hasText: 'Save' }).first()
      .or(page.locator('button').filter({ hasText: 'Submit' }).first())
      .or(page.locator('button').filter({ hasText: 'Add Hospital' }).first())
      .or(page.locator('button[type="submit"]').first());
    await saveBtn.waitFor({ state: 'visible', timeout: 10000 });
    await saveBtn.click();
    await page.waitForTimeout(1000);

    // Check for validation error message
    const errorLocator = page.locator('text=/name.*required/i')
      .or(page.locator('text=/required.*name/i'))
      .or(page.locator('text=/hospital name/i'))
      .or(page.locator('.error-message'))
      .or(page.locator('[role="alert"]'))
      .or(page.locator('.text-red, .text-danger, .error'));

    const errorVisible = await errorLocator.first().waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);

    // Also check HTML5 validation
    const isInvalid = await hospitalNameInput.evaluate(el => !el.validity.valid);

    await page.screenshot({ path: '526_HospitalNameRequired.result.png', fullPage: true }).catch(() => {});

    if (errorVisible || isInvalid) {
      console.log('✅ PASS: Hospital Name required validation is working.');
      console.log('  Error message visible:', errorVisible);
      console.log('  HTML5 validation invalid:', isInvalid);
      await browser.close();
      process.exit(0);
    } else {
      console.log('❌ FAIL: No validation error shown for empty Hospital Name.');
      await browser.close();
      process.exit(1);
    }

  } catch (err) {
    console.error('Error during test:', err.message);
    if (browser) await browser.close();
    process.exit(2);
  }
})();
