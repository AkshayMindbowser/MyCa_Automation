/**
 * Generated from Qase case 522 (MCP)
 * Title: Verify whether user is restricted from creating duplicate hospital.
 * Preconditions: Enter hospital with existing email/name
 * Expected: Validation error shown ("Hospital already exists")
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

    // Get an existing hospital name from the list (we'll try to create a duplicate)
    const existingHospitalName = 'Test Hospital'; // Use a known existing name

    // Fill hospital form with duplicate name
    const hospitalNameInput = page.locator('input[name="name"], input[placeholder*="Hospital Name"], input[id*="name"]').first();
    await hospitalNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await hospitalNameInput.fill(existingHospitalName);

    // Fill other required fields if present
    const emailField = page.locator('input[name="email"], input[type="email"][placeholder*="mail"]').first();
    if (await emailField.count() > 0) {
      await emailField.fill('duplicate@test.com');
    }

    // Submit the form
    const saveBtn = page.locator('button').filter({ hasText: 'Save' }).first()
      .or(page.locator('button').filter({ hasText: 'Submit' }).first())
      .or(page.locator('button[type="submit"]').first());
    await saveBtn.waitFor({ state: 'visible', timeout: 10000 });
    await saveBtn.click();
    await page.waitForTimeout(2000);

    // Check for duplicate error message
    const errorLocator = page.locator('text=/already exists/i')
      .or(page.locator('text=/duplicate/i'))
      .or(page.locator('[role="alert"]'))
      .or(page.locator('.error-message'));

    const errorVisible = await errorLocator.first().waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);

    await page.screenshot({ path: '522_DuplicateHospital.result.png', fullPage: true }).catch(() => {});

    if (errorVisible) {
      console.log('✅ PASS: Duplicate hospital creation is restricted with appropriate error.');
      await browser.close();
      process.exit(0);
    } else {
      console.log('❌ FAIL: No duplicate error shown or hospital was created.');
      await browser.close();
      process.exit(1);
    }

  } catch (err) {
    console.error('Error during test:', err.message);
    if (browser) await browser.close();
    process.exit(2);
  }
})();
