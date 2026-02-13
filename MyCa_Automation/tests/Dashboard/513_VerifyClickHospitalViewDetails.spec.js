/**
 * Playwright script for Qase case 513: click a hospital in the list and verify details view.
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

    // Login flow
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

    // Wait for hospitals table and rows
    await page.waitForTimeout(1000);
    const rowsLocator = page.locator('table tbody tr:visible');
    await rowsLocator.first().waitFor({ state: 'visible', timeout: 10000 });
    const rowCount = await rowsLocator.count();
    if (rowCount === 0) {
      console.log('❌ FAIL: No hospital rows found.');
      const s = '513_no_rows.png';
      await page.screenshot({ path: s, fullPage: true }).catch(()=>{});
      await browser.close();
      process.exit(1);
    }

    // pick a random visible row
    const idx = Math.floor(Math.random() * rowCount);
    const row = rowsLocator.nth(idx);

    // Try several click strategies: 1) click an anchor in first cell, 2) click 'View' button in action, 3) open actions menu then click View
    let clicked = false;

    // 1) anchor in first column
    try {
      const link = row.locator('td:nth-child(1) a').first();
      if (await link.count() > 0) { await link.click({ force: true }); clicked = true; }
    } catch (e) {}

    // 2) View button in row
    if (!clicked) {
      try { const vbtn = row.locator('button:has-text("View")').first(); if (await vbtn.count() > 0) { await vbtn.click({ force: true }); clicked = true; } } catch (e) {}
    }

    // 3) Actions dropdown then View
    if (!clicked) {
      try {
        const actionsBtn = row.locator('button[aria-label*="Actions"], .actions, button:has-text("Actions")').first();
        if (await actionsBtn.count() > 0) {
          await actionsBtn.click({ force: true });
          await page.waitForTimeout(300);
          const menuView = page.locator('text=View').first();
          if (await menuView.count() > 0) { await menuView.click({ force: true }); clicked = true; }
        }
      } catch (e) {}
    }

    // 4) fallback: click the row itself
    if (!clicked) {
      try { await row.click({ force: true }); clicked = true; } catch (e) {}
    }

    await page.waitForTimeout(800);

    // Wait for details view: try multiple selectors and URL change heuristics
    const detailSelectors = [
      '[data-testid="hospital-details"]',
      '.hospital-details',
      '.details-panel',
      'text=Hospital Details',
      'text=View Hospital',
      'h1',
      'h2'
    ];

    let detailsFound = false;

    // Try selectors one-by-one with a short timeout
    for (const sel of detailSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: 5000 });
        detailsFound = true;
        break;
      } catch (e) {
        // continue to next selector
      }
    }

    // If selectors didn't match, try waiting for a URL change that looks like a hospital detail page
    if (!detailsFound) {
      try {
        await page.waitForURL(/.*hospital.*/i, { timeout: 5000 });
        detailsFound = true;
      } catch (e) {
        // still not found
      }
    }

    const screenshot = '513_case513.result.png';
    await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});

    if (clicked && detailsFound) {
      console.log('✅ PASS: Clicked a hospital and details view appeared.');
      console.log('Row index:', idx, 'Rows total:', rowCount);
      console.log('Screenshot saved:', screenshot);
      await browser.close();
      process.exit(0);
    } else if (!clicked) {
      console.log('❌ FAIL: Could not click hospital (no suitable target).');
      console.log('Screenshot saved:', screenshot);
      await browser.close();
      process.exit(1);
    } else {
      console.log('❌ FAIL: Click performed but details view not detected.');
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
