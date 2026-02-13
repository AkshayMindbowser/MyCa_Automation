(async () => {
  const LOGIN_URL = 'http://localhost:3000/login';
  const email = 'shrinath.himane@mindbowser.com';
  const password = 'Test@1234';

  const { chromium } = require('playwright');
  let browser;
  try {
    console.log('Launching Chromium (headful)...');
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    console.log('Navigating to', LOGIN_URL);
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 30000 });

    const loginAsAdminBtn = page.locator('button:has-text("Login as Super Admin")').first();
    await loginAsAdminBtn.waitFor({ state: 'visible', timeout: 10000 });
    await loginAsAdminBtn.click();
    try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }); } catch (e) { await page.waitForTimeout(1500); }

    const emailInput = page.locator('input[type="email"]').first();
    const pwdInput = page.locator('input[type="password"]').first();
    const loginBtn = page.locator('button:has-text("Log In"), button:has-text("Login"), button[type="submit"]').first();

    await emailInput.waitFor({ state: 'visible', timeout: 15000 });
    await pwdInput.waitFor({ state: 'visible', timeout: 15000 });

    console.log('Filling credentials...');
    await emailInput.fill(email);
    await pwdInput.fill(password);
    await page.waitForTimeout(300);

    console.log('Clicking Login...');
    await Promise.all([
      loginBtn.click().catch(() => {}),
      page.waitForTimeout(500)
    ]);

    try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }); } catch (e) {}
    await page.waitForTimeout(1500);

    const finalUrl = page.url();
    console.log('Final URL ->', finalUrl);

    // Candidate selectors for Add New Hospital button
    const selectors = [
      'button:has-text("Add New Hospital")',
      'button:has-text("Add Hospital")',
      'a:has-text("Add New Hospital")',
      '[data-testid="add-hospital"]',
      '[data-test="add-hospital"]',
      '.add-hospital',
      '#add-hospital',
      'text=/Add.*Hospital/i'
    ];

    let found = false;
    let matched = '';
    for (const sel of selectors) {
      try {
        const loc = page.locator(sel).first();
        await loc.waitFor({ state: 'visible', timeout: 3000 });
        // ensure it's enabled/clickable
        const disabled = await loc.getAttribute('disabled');
        if (disabled !== null) {
          matched = sel + ' (disabled)';
        } else {
          matched = sel;
        }
        found = true;
        break;
      } catch (e) {
        // continue
      }
    }

    const screenshot = '502_AddHospBtnVisibility.result.png';
    await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});

    if (found) {
      console.log('✅ PASS: Add New Hospital button is visible on the dashboard.');
      console.log('Matched selector:', matched);
      console.log('Screenshot saved:', screenshot);
      await browser.close();
      process.exit(0);
    } else {
      console.log('❌ FAIL: Add New Hospital button not found using candidate selectors.');
      console.log('Tried selectors:', selectors.join(', '));
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
