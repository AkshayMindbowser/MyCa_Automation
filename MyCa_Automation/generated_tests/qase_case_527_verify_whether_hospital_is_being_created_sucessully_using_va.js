/**
 * Generated from Qase case 527 (MCP)
 * Title: Verify whether hospital is being created successfully using valid data.
 * Preconditions: All mandatory fields filled correctly
 * Expected: Hospital should be successfully added & redirect to listing page
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

    // Generate unique hospital name with timestamp
    const uniqueName = `Test Hospital ${Date.now()}`;
    const uniqueEmail = `test${Date.now()}@hospital.com`;

    console.log('Creating hospital with name:', uniqueName);

    // Fill Hospital Name
    const hospitalNameInput = page.locator('input[name="name"], input[placeholder*="Hospital Name"], input[id*="name"]').first();
    await hospitalNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await hospitalNameInput.fill(uniqueName);

    // Fill Email if present
    const emailField = page.locator('input[name="email"], input[type="email"]:not([name="username"])').first();
    if (await emailField.count() > 0) {
      await emailField.fill(uniqueEmail);
    }

    // Fill other fields if present (try common field names)
    const phoneField = page.locator('input[name="phone"], input[type="tel"]').first();
    if (await phoneField.count() > 0) {
      await phoneField.fill('1234567890');
    }

    const addressField = page.locator('input[name="address"], textarea[name="address"]').first();
    if (await addressField.count() > 0) {
      await addressField.fill('123 Test Street');
    }

    // Submit the form
    const saveBtn = page.locator('button').filter({ hasText: 'Save' }).first()
      .or(page.locator('button').filter({ hasText: 'Submit' }).first())
      .or(page.locator('button').filter({ hasText: 'Create' }).first())
      .or(page.locator('button[type="submit"]').first());
    await saveBtn.waitFor({ state: 'visible', timeout: 10000 });
    await saveBtn.click();
    await page.waitForTimeout(3000);

    // Check for success - either redirected to list or success message shown
    const currentUrl = page.url();
    const redirectedToList = currentUrl.includes('/hospitals') && !currentUrl.includes('/add') && !currentUrl.includes('/new');

    const successMsg = page.locator('text=/success/i')
      .or(page.locator('text=/created/i'))
      .or(page.locator('text=/added/i'))
      .or(page.locator('[role="alert"]').filter({ hasText: /success/i }));

    const successVisible = await successMsg.first().waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);

    // Check if new hospital appears in the list
    const hospitalInList = page.locator(`text=${uniqueName}`);
    const hospitalVisible = await hospitalInList.first().waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);

    await page.screenshot({ path: '527_HospitalCreatedSuccessfully.result.png', fullPage: true }).catch(() => {});

    if (redirectedToList || successVisible || hospitalVisible) {
      console.log('✅ PASS: Hospital created successfully.');
      console.log('  Redirected to list:', redirectedToList);
      console.log('  Success message:', successVisible);
      console.log('  Hospital in list:', hospitalVisible);
      await browser.close();
      process.exit(0);
    } else {
      console.log('❌ FAIL: Hospital creation may have failed.');
      console.log('  Current URL:', currentUrl);
      await browser.close();
      process.exit(1);
    }

  } catch (err) {
    console.error('Error during test:', err.message);
    if (browser) await browser.close();
    process.exit(2);
  }
})();
