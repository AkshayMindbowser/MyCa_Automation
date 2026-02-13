/**
 * Generated from Qase case 504 (MCP)
 * Title: Verify the hospital data on frontend on Active/Inactive toggle with  bakcend.
 * Preconditions: Check “Active/Inactive” status labels
 *
 * Steps (from Qase):
 * 1. ACTION: 1) Observe Status column
 */

const { chromium } = require('playwright');

(async function main(){
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Login (reuse credentials used in other scripts)
    const LOGIN_URL = 'http://localhost:3000/login';
    const email = 'shrinath.himane@mindbowser.com';
    const password = 'Test@1234';

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

    // Helper: read hospital identifiers (name + email) from visible rows
    const readRows = async () => {
      const rows = await page.locator('table tbody tr:visible').elementHandles().catch(() => []);
      const items = [];
      for (const r of rows) {
        const name = await r.$eval('td:nth-child(1)', (el) => el && el.innerText && el.innerText.trim()).catch(() => '');
        const email = await r.$eval('td:nth-child(2)', (el) => el && el.innerText && el.innerText.trim()).catch(() => '');
        items.push(`${name}||${email}`);
      }
      return items;
    };

    const before = await readRows();

    // Try to toggle filter to Inactive. Use multiple heuristics to find the toggle/filter control.
    let toggled = false;
    const tryClick = async (loc) => {
      const count = await loc.count().catch(() => 0);
      if (count > 0) {
        try {
          await loc.first().click({ force: true });
          toggled = true;
          return true;
        } catch (e) {}
      }
      return false;
    };

    // 1) button with text 'Inactive'
    await tryClick(page.locator('button:has-text("Inactive")'));
    // 2) radio/select
    if (!toggled) await tryClick(page.locator('label:has-text("Inactive")'));
    // 3) data-test attributes
    if (!toggled) await tryClick(page.locator('[data-testid="inactive"], [data-test="inactive"], [data-testid*="inactive"]'));
    // 4) toggle by clicking Active to flip
    if (!toggled) await tryClick(page.locator('button:has-text("Active")'));

    if (!toggled) {
      console.log('⚠️ Could not find an explicit Inactive control; attempting to click a generic toggle');
      try { await page.locator('[role="switch"] , .toggle, .switch').first().click({ force: true }); toggled = true; } catch (e) {}
    }

    await page.waitForTimeout(1200);
    const after = await readRows();

    const screenshot = 'generated_tests/503_case504.result.png';
    await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});

    // Basic expectation: the visible rows should differ after toggling (filter applied)
    const same = before.length === after.length && before.every((v, i) => v === after[i]);
    if (!toggled) {
      console.log('❌ FAIL: Could not toggle Active/Inactive — no control found.');
      console.log('Screenshot saved:', screenshot);
      await browser.close();
      process.exit(1);
    } else if (same) {
      console.log('❌ FAIL: Toggle did not change visible hospital rows (lists identical).');
      console.log('Before rows:', before.length, 'After rows:', after.length);
      console.log('Screenshot saved:', screenshot);
      await browser.close();
      process.exit(1);
    } else {
      console.log('✅ PASS: Hospital list changed after toggling Active/Inactive.');
      console.log('Before count:', before.length, 'After count:', after.length);
      console.log('Screenshot saved:', screenshot);
      await browser.close();
      process.exit(0);
    }
  } catch (err) {
    console.error("Error during generated test run:", err);
    process.exitCode = 2;
  } finally {
    // Keep browser open on failure for inspection if desired
    await browser.close();
  }
})();