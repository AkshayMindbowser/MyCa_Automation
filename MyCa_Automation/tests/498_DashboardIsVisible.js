(async () => {
  const LOGIN_URL = 'http://34.234.86.155:3000/login';
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

    // Click "Login as Super Admin" to reach Auth0
    const loginAsAdminBtn = page.locator('button:has-text("Login as Super Admin")').first();
    await loginAsAdminBtn.waitFor({ state: 'visible', timeout: 10000 });
    await loginAsAdminBtn.click();
    try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }); } catch (e) { await page.waitForTimeout(1500); }

    // Wait for auth fields
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

    // Wait for dashboard navigation
    try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }); } catch (e) { /* ignore */ }
    await page.waitForTimeout(1500);

    const finalUrl = page.url();
    console.log('Final URL ->', finalUrl);

    if (!finalUrl.includes('/hospitals')) {
      console.log('Not on hospitals page yet; checking page content anyway.');
    }

    // Try a set of likely selectors that indicate hospitals list is visible
    const selectors = [
      'h1:has-text("Hospitals")',
      'text=/Hospitals/i',
      'table',
      '.hospital-list',
      '[data-testid="hospital-list"]',
      'ul.hospitals',
      'div:has-text("Hospitals")'
    ];

    let found = false;
    let foundSelector = '';
    for (const sel of selectors) {
      try {
        const loc = page.locator(sel).first();
        await loc.waitFor({ state: 'visible', timeout: 3000 });
        found = true;
        foundSelector = sel;
        break;
      } catch (e) {
        // try next
      }
    }

    const screenshot = '498_DashboardIsVisible.result.png';
    await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});

    if (found) {
      console.log('✅ PASS: Hospitals list or indicator is visible on the dashboard.');
      console.log('  Matched selector:', foundSelector);
      console.log('  Screenshot saved:', screenshot);
      await browser.close();
      process.exit(0);
    } else {
      console.log('❌ FAIL: Could not find hospitals list on the dashboard.');
      console.log('  Tried selectors:', selectors.join(', '));
      console.log('  Screenshot saved:', screenshot);
      await browser.close();
      process.exit(1);
    }

  } catch (err) {
    console.error('Script error:', err && err.message ? err.message : err);
    if (browser) try { await browser.close(); } catch (e) {}
    process.exit(2);
  }
})();
