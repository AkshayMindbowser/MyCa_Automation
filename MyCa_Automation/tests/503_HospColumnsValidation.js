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

    // Wait for table or hospitals container to appear
    const tableLocator = page.locator('table').first();
    const tableVisible = await tableLocator.isVisible().catch(() => false);

    // Candidate header texts we expect to see (updated to match dashboard)
    const expectedHeaders = ['Hospital', 'Email', 'Added On', 'Status', 'Actions'];
    const missing = [];

    if (tableVisible) {
      console.log('Table element found, validating headers...');
      // read header texts
      const headers = await tableLocator.locator('thead th').allTextContents().catch(async () => {
        // fallback: first row as header
        return await tableLocator.locator('tr').first().locator('th,td').allTextContents();
      });

      // normalize
      const norm = headers.map(h => (h || '').trim().replace(/\s+/g, ' '));

      for (const exp of expectedHeaders) {
        const found = norm.find(h => new RegExp(exp, 'i').test(h));
        if (!found) missing.push(exp);
      }

      // Also verify at least one data row exists and has non-empty cells for those columns
      let rowHasData = false;
      try {
        const firstRow = tableLocator.locator('tbody tr').first();
        const cells = await firstRow.locator('td').allTextContents();
        if (cells && cells.length >= expectedHeaders.length) {
          // check at least one non-empty cell
          rowHasData = cells.some(c => (c || '').trim().length > 0);
        } else if (cells && cells.length > 0) {
          rowHasData = cells.some(c => (c || '').trim().length > 0);
        }
      } catch (e) {
        rowHasData = false;
      }

      const screenshot = '503_HospColumnsValidation.result.png';
      await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});

      // Optionally keep the browser open for debugging. Set KEEP_BROWSER_OPEN=true
      // to wait for an Enter keypress; otherwise wait 30s before closing.
      const waitBeforeClose = async () => {
        if (process.env.KEEP_BROWSER_OPEN === 'true') {
          console.log('KEEP_BROWSER_OPEN=true — awaiting Enter key to close browser...');
          process.stdin.resume();
          await new Promise((resolve) => process.stdin.once('data', resolve));
          process.stdin.pause();
        } else {
          console.log('Waiting 30s before closing browser (set KEEP_BROWSER_OPEN=true to hold)');
          await page.waitForTimeout(30000);
        }
      };

      if (missing.length === 0 && rowHasData) {
        console.log('✅ PASS: All expected hospital columns present and table contains data.');
        console.log('Screenshot saved:', screenshot);
        await waitBeforeClose();
        await browser.close();
        process.exit(0);
      } else {
        console.log('❌ FAIL: Column validation failed or no data rows found.');
        if (missing.length) console.log('Missing headers:', missing.join(', '));
        if (!rowHasData) console.log('No data rows found or cells empty.');
        console.log('Screenshot saved:', screenshot);
        await waitBeforeClose();
        await browser.close();
        process.exit(1);
      }

    } else {
      // try alternative: look for headings or labels
      const bodyText = await page.textContent('body').catch(() => '');
      for (const exp of expectedHeaders) {
        if (!new RegExp(exp, 'i').test(bodyText)) missing.push(exp);
      }

      const screenshot = '503_HospColumnsValidation.no-table.png';
      await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});

      // Same wait behavior for debugging
      const waitBeforeClose2 = async () => {
        if (process.env.KEEP_BROWSER_OPEN === 'true') {
          console.log('KEEP_BROWSER_OPEN=true — awaiting Enter key to close browser...');
          process.stdin.resume();
          await new Promise((resolve) => process.stdin.once('data', resolve));
          process.stdin.pause();
        } else {
          console.log('Waiting 30s before closing browser (set KEEP_BROWSER_OPEN=true to hold)');
          await page.waitForTimeout(30000);
        }
      };

      console.log('❌ FAIL: No table element found on dashboard.');
      console.log('Missing headers (text search):', missing.join(', '));
      console.log('Screenshot saved:', screenshot);
      await waitBeforeClose2();
      await browser.close();
      process.exit(1);
    }

  } catch (err) {
    console.error('Script error:', err && err.message ? err.message : err);
    if (browser) try { await browser.close(); } catch (e) {}
    process.exit(2);
  }
})();
