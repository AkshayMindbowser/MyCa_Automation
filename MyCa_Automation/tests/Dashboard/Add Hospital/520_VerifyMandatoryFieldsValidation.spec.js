/**
 * Test 520: Verify mandatory fields validation of the form
 * Steps: leave required fields blank and try to submit, expect validation messages
 */
const { chromium } = require('playwright');

(async () => {
  const LOGIN_URL = 'http://localhost:3000/login';
  const email = 'shrinath.himane@mindbowser.com';
  const password = 'Test@1234';

  let browser;
  try {
    browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
    const context = await browser.newContext({ viewport: null });
    const page = await context.newPage();

    // Login
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 30000 });
    const loginAsAdminBtn = page.locator('button:has-text("Login as Super Admin")').first();
    await loginAsAdminBtn.waitFor({ state: 'visible', timeout: 15000 });
    await loginAsAdminBtn.click();
    try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }); } catch (e) { await page.waitForTimeout(1500); }

    const emailInput = page.locator('input[type="email"]').first();
    const pwdInput = page.locator('input[type="password"]').first();
    const loginBtn = page.locator('button:has-text("Log In"), button:has-text("Login"), button[type="submit"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 15000 });
    await pwdInput.waitFor({ state: 'visible', timeout: 15000 });
    await emailInput.fill(email);
    await pwdInput.fill(password);
    await Promise.all([ loginBtn.click().catch(() => {}), page.waitForTimeout(500) ]);
    try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }); } catch (e) {}
    await page.waitForTimeout(1500);

    // Navigate to the form page - try common paths
    // If this is an Add New Hospital form, try opening Add New
    const addBtn = page.locator('button:has-text("Add New Hospital"), button:has-text("+ Add New"), a:has-text("Add New Hospital")').first();
    if (await addBtn.count() > 0) {
      await addBtn.click({ force: true });
    } else {
      // try direct navigation if known
      try { await page.goto('http://localhost:3000/hospitals/new', { waitUntil: 'domcontentloaded', timeout: 10000 }); } catch (e) {}
    }

    await page.waitForTimeout(800);

    // Attempt to submit the form with required fields blank
    // Find submit button heuristics
    const submitLoc = page.locator('button:has-text("Save"), button:has-text("Submit"), button[type="submit"], input[type="submit"]').first();
    if (await submitLoc.count() === 0) {
      console.log('❌ FAIL: No submit button found to perform empty-submit test.');
      await page.screenshot({ path: '520_no_submit.png', fullPage: true }).catch(()=>{});
      await browser.close();
      process.exit(1);
    }

    // Make sure required fields are empty: try to clear common inputs
    const requiredSelectors = ['input[required]', 'input[name="name"]', 'input[name="email"]', 'textarea[required]'];
    for (const sel of requiredSelectors) {
      try { const loc = page.locator(sel).first(); if (await loc.count() > 0) await loc.fill(''); } catch (e) {}
    }

    await submitLoc.click({ force: true });

    // Expect validation messages or attributes
    const validationSelectors = [
      ':invalid',
      '.error, .field-error, .validation-error',
      'text=required',
      'text=This field is required',
      'text=Please enter',
      'input:invalid'
    ];

    let validationFound = false;
    for (const sel of validationSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: 5000 });
        validationFound = true;
        break;
      } catch (e) {}
    }

    await page.screenshot({ path: '520_case520.result.png', fullPage: true }).catch(()=>{});

    if (validationFound) {
      console.log('✅ PASS: Form validation triggered for mandatory fields when submitting empty.');
      await browser.close();
      process.exit(0);
    } else {
      console.log('❌ FAIL: No validation messages found after empty-submit.');
      await browser.close();
      process.exit(1);
    }

  } catch (err) {
    console.error('Script error:', err && err.message ? err.message : err);
    if (browser) try { await browser.close(); } catch (e) {}
    process.exit(2);
  }
})();
