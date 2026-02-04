#!/usr/bin/env node
const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const LOGIN_URL = `${BASE_URL}/login`;
const EMAIL = process.env.TEST_EMAIL || 'shrinath.himane@mindbowser.com';
const PASSWORD = process.env.TEST_PASSWORD || 'Test@1234';
const WAIT_TIME = 1000;

let passed = 0;
let failed = 0;

function log(result, msg) {
  if (result) {
    passed++;
    console.log(`✅ ${msg}`);
  } else {
    failed++;
    console.log(`❌ ${msg}`);
  }
}

(async () => {
  console.log('\n🔁 REGRESSION SUITE STARTED');
  console.log(`   Using URL: ${BASE_URL}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    /* ==================== LOGIN PAGE TESTS ==================== */
    console.log('📋 LOGIN PAGE TESTS');

    await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(WAIT_TIME);

    // Test: Login as Super Admin button visible
    const sadminBtn = page.locator('button:has-text("Login as Super Admin")');
    log(await sadminBtn.count() > 0, 'Login as Super Admin button visible');

    // Click Login as Super Admin
    if (await sadminBtn.count() > 0) {
      await sadminBtn.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(WAIT_TIME);
    }

    // Test: Email input field visible
    const emailInput = page.locator('input[type="email"]');
    log(await emailInput.count() > 0, 'Email input field visible');

    // Test: Password input field visible
    const passwordInput = page.locator('input[type="password"]');
    log(await passwordInput.count() > 0, 'Password input field visible');

    // Test: Forgot password link visible (may not exist in all auth flows)
    const forgot = page.locator('text=Forgot, text=Remember, a:has-text("Forgot"), text=Reset');
    const forgotVisible = await forgot.count() > 0;
    log(forgotVisible, 'Forgot password link visible' + (forgotVisible ? '' : ' (may use external auth)'));

    // Test: Login button visible
    const loginBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Continue")');
    log(await loginBtn.count() > 0, 'Login button visible');

    /* ==================== PERFORM LOGIN ==================== */
    console.log('\n📋 PERFORMING LOGIN');

    await emailInput.fill(EMAIL);
    await page.waitForTimeout(500);
    await passwordInput.fill(PASSWORD);
    await page.waitForTimeout(500);
    await loginBtn.click();

    // Wait for login to complete - try multiple times if needed
    let loginSuccess = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      await page.waitForTimeout(WAIT_TIME * 2);

      // Check if we're past the login page
      const currentUrl = page.url();
      const onLoginPage = currentUrl.includes('/login') && !currentUrl.includes('redirect');
      const hasTable = await page.locator('table').count() > 0;
      const hasAddBtn = await page.locator('button:has-text("Add")').count() > 0;
      const hasHospitalMgmt = await page.locator('text=Hospital Management').count() > 0;

      if (!onLoginPage && (hasTable || hasAddBtn || hasHospitalMgmt)) {
        loginSuccess = true;
        break;
      }

      // If on redirect page, wait longer
      if (currentUrl.includes('redirect')) {
        await page.waitForTimeout(WAIT_TIME * 2);
        continue;
      }

      // Try navigating to dashboard
      if (attempt > 1) {
        try {
          await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
        } catch (e) {}
      }
    }

    log(loginSuccess, 'Dashboard loaded after login');

    if (!loginSuccess) {
      console.log('   Current URL:', page.url());
      await page.screenshot({ path: 'login_debug.png' });
      console.log('   Debug screenshot saved to login_debug.png');
    }

    /* ==================== DASHBOARD TESTS ==================== */
    console.log('\n📋 DASHBOARD TESTS');

    // Test: Active/Inactive toggle visible
    const activeToggle = page.locator('button:has-text("Active"), [role="tab"]:has-text("Active")');
    log(await activeToggle.count() > 0, 'Active toggle button visible');

    const inactiveToggle = page.locator('button:has-text("Inactive"), [role="tab"]:has-text("Inactive")');
    log(await inactiveToggle.count() > 0, 'Inactive toggle button visible');

    // Test: Search bar visible
    const searchBar = page.locator('input[type="search"], input[placeholder*="Search"]');
    log(await searchBar.count() > 0, 'Search bar visible');

    // Test: Add New Hospital button visible
    const addHospitalBtn = page.locator('button:has-text("Add New Hospital"), button:has-text("Add Hospital")');
    log(await addHospitalBtn.count() > 0, 'Add New Hospital button visible');

    // Test: Hospital table visible
    const hospitalTable = page.locator('table tbody tr');
    const hospitalCount = await hospitalTable.count();
    log(hospitalCount > 0, `Hospital table visible with ${hospitalCount} rows`);

    /* ==================== ADD HOSPITAL FORM TESTS ==================== */
    console.log('\n📋 ADD HOSPITAL FORM TESTS');

    // Click Add New Hospital
    if (await addHospitalBtn.count() > 0) {
      try {
        await addHospitalBtn.first().click();
        await page.waitForTimeout(WAIT_TIME * 3);
      } catch (e) {
        console.log('   ⚠ Error clicking Add Hospital button');
      }
    } else {
      console.log('   ⚠ Add New Hospital button not found, skipping form tests');
    }

    // Test: Hospital name input visible
    const hospitalName = page.locator('input[name="name"], input[placeholder*="Hospital Name"]');
    log(await hospitalName.count() > 0, 'Hospital name input visible');

    // Test: Phone number input visible
    const phone = page.locator('input[type="tel"], input[name="phone"]');
    log(await phone.count() > 0, 'Phone number input visible');

    // Test: Email input in form visible
    const formEmail = page.locator('input[name="email"], input[type="email"]');
    log(await formEmail.count() > 0, 'Email input in form visible');

    // Test: Description textarea visible
    const desc = page.locator('textarea, input[name="description"]');
    log(await desc.count() > 0, 'Description field visible');

    // Test: Tenant ID input visible
    const tenant = page.locator('input[name="tenantId"]');
    log(await tenant.count() > 0, 'Tenant ID input visible');

    // Test: User type dropdown visible
    const userType = page.locator('select');
    log(await userType.count() > 0, 'User type dropdown visible');

    // Test: Cancel button visible
    const cancelBtn = page.locator('button:has-text("Cancel")');
    log(await cancelBtn.count() > 0, 'Cancel button visible');

    // Test: Add Hospital submit button visible
    const submitBtn = page.locator('button:has-text("Add Hospital"), button[type="submit"]');
    log(await submitBtn.count() > 0, 'Add Hospital submit button visible');

    // Test: Provider config section visible
    const providerSection = page.locator('text=Provider, text=Auth, text=Okta, text=Config, text=Client ID, text=Issuer');
    log(await providerSection.count() > 0, 'Provider config section visible');

    // Click Cancel to go back
    if (await cancelBtn.count() > 0) {
      await cancelBtn.first().click();
      await page.waitForTimeout(WAIT_TIME);
    }

    /* ==================== SETTINGS PAGE TESTS ==================== */
    console.log('\n📋 SETTINGS PAGE TESTS');

    // First navigate back to dashboard if we're in a form
    try {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(WAIT_TIME * 2);
    } catch (e) {
      // Ignore navigation timeouts
    }

    // Navigate to Settings - try multiple selectors
    const settingsSelectors = [
      'a:has-text("Settings")',
      'text=Settings',
      '[href*="settings"]',
      'nav a:has-text("Settings")',
      'aside a:has-text("Settings")',
      '[class*="sidebar"] a',
      '[class*="nav"] >> text=Settings'
    ];

    let settingsClicked = false;
    for (const sel of settingsSelectors) {
      try {
        const settingsLink = page.locator(sel).first();
        if (await settingsLink.count() > 0 && await settingsLink.isVisible()) {
          await settingsLink.click();
          await page.waitForTimeout(WAIT_TIME * 2);
          settingsClicked = true;
          break;
        }
      } catch (e) {}
    }

    if (!settingsClicked) {
      console.log('   ⚠ Settings link not found');
    }

    // Test: Settings page loaded
    const settingsPage = page.locator('text=Settings, text=Change Password, text=Account');
    log(await settingsPage.count() > 0, 'Settings page loaded');

    // Test: Change Password button visible
    const changePasswordBtn = page.locator('button:has-text("Change Password"), button:has-text("Password")');
    log(await changePasswordBtn.count() > 0, 'Change Password button visible');

    /* ==================== SUMMARY ==================== */
    console.log('\n' + '='.repeat(50));
    console.log(`📊 REGRESSION SUITE SUMMARY`);
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Total:  ${passed + failed}`);
    console.log(`📉 Pass Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  } catch (err) {
    console.error('\n❌ Regression error:', err.message);
    await page.screenshot({ path: 'regression_error.png' });
    console.log('   Screenshot saved to regression_error.png');
  } finally {
    await browser.close();
    console.log('\n🔁 REGRESSION SUITE COMPLETED');
    process.exit(0);
  }
})();
