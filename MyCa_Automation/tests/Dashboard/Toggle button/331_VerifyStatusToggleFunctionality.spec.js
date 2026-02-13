/**
 * Automated script for Qase case 331 - Verify the status toggle button is working
 */
const { chromium } = require('playwright');

(async () => {
  const LOGIN_URL = 'http://localhost:3000/login';
  const email = 'shrinath.himane@mindbowser.com';
  const password = 'Test@1234';

  let browser;
  try {
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

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
    await emailInput.fill(email);
    await pwdInput.fill(password);
    await Promise.all([ loginBtn.click().catch(() => {}), page.waitForTimeout(500) ]);
    try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }); } catch (e) {}
    await page.waitForTimeout(1500);

    // Wait for hospitals table
    await page.waitForTimeout(1000);
    const table = page.locator('table').first();
    await table.waitFor({ state: 'visible', timeout: 10000 });

    const readRows = async () => {
      const rows = await page.locator('table tbody tr:visible').elementHandles().catch(() => []);
      const items = [];
      for (const r of rows) {
        const name = await r.$eval('td:nth-child(1)', (el) => el && el.innerText && el.innerText.trim()).catch(() => '');
        items.push(name);
      }
      return items;
    };

    const before = await readRows();

    // Try toggling controls
    let toggled = false;
    const tryClick = async (loc) => {
      const count = await loc.count().catch(() => 0);
      if (count > 0) {
        try { await loc.first().click({ force: true }); toggled = true; return true; } catch (e) {}
      }
      return false;
    };

    await tryClick(page.locator('button:has-text("Inactive")'));
    if (!toggled) await tryClick(page.locator('label:has-text("Inactive")'));
    if (!toggled) await tryClick(page.locator('[data-testid="inactive"], [data-test="inactive"]'));
    if (!toggled) await tryClick(page.locator('button:has-text("Active")'));
    if (!toggled) {
      try { await page.locator('[role="switch"], .toggle, .switch').first().click({ force: true }); toggled = true; } catch (e) {}
    }

    await page.waitForTimeout(1200);
    const after = await readRows();

    const screenshot = '331_case331.result.png';
    await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});

    const same = before.length === after.length && before.every((v, i) => v === after[i]);
    if (!toggled) {
      console.log('❌ FAIL: Could not toggle Active/Inactive — control not found.');
      console.log('Screenshot saved:', screenshot);
      await browser.close();
      process.exit(1);
    } else if (same) {
      console.log('❌ FAIL: Toggle did not change visible rows.');
      console.log('Before count:', before.length, 'After count:', after.length);
      console.log('Screenshot saved:', screenshot);
      await browser.close();
      process.exit(1);
    } else {
      console.log('✅ PASS: Status toggle changed hospital list.');
      console.log('Before count:', before.length, 'After count:', after.length);
      console.log('Screenshot saved:', screenshot);
      await browser.close();
      process.exit(0);
    }

  } catch (err) {
    console.error('Script error:', err && err.message ? err.message : err);
    if (browser) try { await browser.close(); } catch (e) {}
    process.exit(2);
  }
})();
