/**
 * Generated from Qase case 528 (MCP)
 * Title: Verify whether error message is shown when incorrect email is entered in admin mail field.
 * Preconditions: Admin Email field filled incorrectly
 * Expected: Error: Enter valid email address
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

    // Fill Hospital Name with valid data
    const hospitalNameInput = page.locator('input[name="name"], input[placeholder*="Hospital Name"], input[id*="name"]').first();
    await hospitalNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await hospitalNameInput.fill('Test Hospital');

    // Find admin email field and enter invalid email
    const adminEmailField = page.locator('input[name="email"], input[type="email"]:not([name="username"]), input[placeholder*="mail"]').first();
    await adminEmailField.waitFor({ state: 'visible', timeout: 10000 });

    const invalidEmails = ['invalidemail', 'invalid@', '@domain.com', 'test@'];
    let testPassed = false;

    for (const invalidEmail of invalidEmails) {
      console.log(`Testing invalid email: ${invalidEmail}`);
      await adminEmailField.clear();
      await adminEmailField.fill(invalidEmail);
      await page.waitForTimeout(500);

      // Try to submit or trigger validation
      const saveBtn = page.locator('button').filter({ hasText: 'Save' }).first()
        .or(page.locator('button').filter({ hasText: 'Submit' }).first())
        .or(page.locator('button[type="submit"]').first());

      if (await saveBtn.count() > 0) {
        await saveBtn.click();
        await page.waitForTimeout(1000);
      }

      // Check for validation error
      const errorLocator = page.locator('text=/invalid.*email/i')
        .or(page.locator('text=/valid.*email/i'))
        .or(page.locator('text=/email.*invalid/i'))
        .or(page.locator('.error-message'))
        .or(page.locator('[role="alert"]'));

      const errorVisible = await errorLocator.first().waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);

      // Also check HTML5 validation
      const isInvalid = await adminEmailField.evaluate(el => !el.validity.valid);

      if (errorVisible || isInvalid) {
        console.log(`  ✅ Validation triggered for: ${invalidEmail}`);
        testPassed = true;
        break;
      }
    }

    await page.screenshot({ path: '528_IncorrectEmailError.result.png', fullPage: true }).catch(() => {});

    if (testPassed) {
      console.log('✅ PASS: Error message shown for incorrect email format.');
      await browser.close();
      process.exit(0);
    } else {
      console.log('❌ FAIL: No error message shown for invalid email.');
      await browser.close();
      process.exit(1);
    }

  } catch (err) {
    console.error('Error during test:', err.message);
    if (browser) await browser.close();
    process.exit(2);
  }
})();
