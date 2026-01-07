/**
 * Test 519: Verify new hospital creation form opens on clicking the +Add New hospital button
 */
const { chromium } = require('playwright');

(async () => {
  const LOGIN_URL = 'http://34.234.86.155:3000/login';
  const email = 'shrinath.himane@mindbowser.com';
  const password = 'Test@1234';

  let browser;
  try {
    browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
    const context = await browser.newContext({ viewport: null });
    const page = await context.newPage();

    // Login flow
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

    // Look for Add New Hospital button (top-right) using several heuristics
    const addSelectors = [
      'button:has-text("Add New Hospital")',
      'button:has-text("+ Add New Hospital")',
      'button:has-text("+ Add New")',
      'a:has-text("Add New Hospital")',
      '[data-testid="add-new-hospital"], [data-test="add-new-hospital"]',
      '.btn-add, .add-new'
    ];

    let addFound = false;
    for (const sel of addSelectors) {
      try {
        const loc = page.locator(sel).first();
        if (await loc.count() > 0) { await loc.scrollIntoViewIfNeeded(); await loc.click({ force: true }); addFound = true; break; }
      } catch (e) {}
    }

    const screenshot = '519_case519.result.png';

    if (!addFound) {
      console.log('❌ FAIL: Could not find + Add New Hospital button using heuristics.');
      await page.screenshot({ path: screenshot, fullPage: true }).catch(()=>{});
      await browser.close();
      process.exit(1);
    }

    // After clicking, wait for creation form/modal to appear
    const formSelectors = [
      'form#new-hospital',
      'form:has(input[name="name"])',
      '[role="dialog"]',
      '.modal:visible',
      'text=Add Hospital',
      'text=New Hospital',
      'text=Hospital Name',
      'input[name="name"]',
      'input[name="email"]'
    ];

    let formFound = false;
    for (const sel of formSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: 7000 });
        formFound = true;
        break;
      } catch (e) {}
    }

    await page.screenshot({ path: screenshot, fullPage: true }).catch(()=>{});

    if (formFound) {
      console.log('✅ PASS: New hospital creation form/modal appeared after clicking Add New.');
      console.log('Screenshot saved:', screenshot);
      await browser.close();
      process.exit(0);
    } else {
      console.log('❌ FAIL: Creation form/modal did not appear after clicking Add New.');
      console.log('Screenshot saved:', screenshot);
      await browser.close();
      process.exit(1);
    }

  } catch (err) {
    console.error('Script error:', err && err.message ? err.message : err);
    if (browser) try { await browser.close(); } catch (e) {}
    process.exit(2);
  }
})();
