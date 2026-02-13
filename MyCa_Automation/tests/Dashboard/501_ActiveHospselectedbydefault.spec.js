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

    // Click "Login as Super Admin" to reach Auth0
    const loginAsAdminBtn = page.locator('button:has-text("Login as Super Admin")').first();
    await loginAsAdminBtn.waitFor({ state: 'visible', timeout: 10000 });
    await loginAsAdminBtn.click();
    try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }); } catch (e) { await page.waitForTimeout(1500); }

    // Auth0 fields
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

    // Wait for hospitals list to be visible
    await page.waitForTimeout(1000);

    // Heuristics for toggle: check common patterns
    // 1) Input[type=checkbox] with label 'Active' that is checked
    // 2) A button or element with text 'Active' and aria-pressed="true" or class contains 'active'
    // 3) A toggle with data-test or data-testid attributes

    let passed = false;
    let reason = '';

    // 1: checkbox labelled Active
    try {
      const labelLoc = page.locator('label:has-text("Active"), text=/Active/i').first();
      const inputFor = await labelLoc.getAttribute('for').catch(() => null);
      if (inputFor) {
        const checkbox = page.locator(`#${inputFor}`);
        const isChecked = await checkbox.getAttribute('checked');
        if (isChecked !== null) {
          passed = true;
          reason = 'Found checkbox with checked attribute for label Active';
        }
      }
    } catch (e) {}

    // 2: input checkbox near label
    if (!passed) {
      try {
        const checkboxNear = page.locator('input[type="checkbox"]:visible').filter({ hasText: 'Active' }).first();
        const count = await checkboxNear.count();
        if (count > 0) {
          const checked = await checkboxNear.getAttribute('checked');
          if (checked !== null) { passed = true; reason = 'Visible checkbox near Active label is checked'; }
        }
      } catch (e) {}
    }

    // 3: aria-pressed on button
    if (!passed) {
      try {
        const btn = page.locator('button:has-text("Active")').first();
        const aria = await btn.getAttribute('aria-pressed').catch(() => null);
        if (aria === 'true') { passed = true; reason = 'Button Active has aria-pressed=true'; }
        else {
          const cls = await btn.getAttribute('class').catch(() => '');
          if (cls && /active/i.test(cls)) { passed = true; reason = 'Button Active has active class'; }
        }
      } catch (e) {}
    }

    // 4: custom data attribute
    if (!passed) {
      try {
        const el = page.locator('[data-testid="active-toggle"] , [data-test="active-toggle"] , [data-testid*="active"]', { hasText: 'Active' }).first();
        const count = await el.count();
        if (count > 0) {
          const aria = await el.getAttribute('aria-checked').catch(() => null);
          if (aria === 'true') { passed = true; reason = 'Found data-testid toggle with aria-checked=true'; }
        }
      } catch (e) {}
    }

    // 5: text with nearby indicator
    if (!passed) {
      try {
        const el = page.locator('text=/Active/').first();
        const box = await el.boundingBox().catch(() => null);
        if (box) {
          // try finding a sibling element that indicates on/off
          const parent = el.locator('..').first();
          const sibling = parent.locator('input, toggle, span').first();
          const aria = await sibling.getAttribute('aria-checked').catch(() => null);
          if (aria === 'true') { passed = true; reason = 'Sibling element to Active text has aria-checked=true'; }
        }
      } catch (e) {}
    }

    const screenshot = '501_ActiveHospselectedbydefault.result.png';
    await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});

    if (passed) {
      console.log('✅ PASS: Active option appears selected by default.');
      console.log('Reason:', reason);
      console.log('Screenshot saved:', screenshot);
      await browser.close();
      process.exit(0);
    } else {
      console.log('❌ FAIL: Could not determine Active option selected by default.');
      console.log('Tried multiple heuristics. Review screenshot:', screenshot);
      await browser.close();
      process.exit(1);
    }

  } catch (err) {
    console.error('Script error:', err && err.message ? err.message : err);
    if (browser) try { await browser.close(); } catch (e) {}
    process.exit(2);
  }
})();
