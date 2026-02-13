const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const loginUrl = 'http://34.234.86.155:3000/login?from=%2Fhospitals';

  // Hard-coded credentials (per your request)
  const email = 'shrinath.himane@mindbowser.com';
  const password = 'Test@1234';

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  try {
    console.log('Navigating to login URL...');
    await page.goto(loginUrl, { waitUntil: 'networkidle' });

    // 2) Click on the "Login as Super Admin" button
    console.log('Clicking "Login as Super Admin" button...');
    // Try multiple selectors one-by-one to avoid invalid combined selectors
    const superSelectors = [
      'button:has-text("Login as Super Admin")',
      'text=Login as Super Admin',
      'a:has-text("Login as Super Admin")'
    ];
    let clickedSuper = false;
    for (const s of superSelectors) {
      const locator = page.locator(s).first();
      if (await locator.count()) {
        await locator.click().catch(() => {});
        clickedSuper = true;
        break;
      }
    }
    if (!clickedSuper) console.warn('Login as Super Admin button not found — proceeding to fill login form if present');

    // 3) Enter credentials
    console.log('Filling credentials...');
    // Try common auth0 input ids used in this project
    await page.fill('xpath=//input[@id="1-email"]', email).catch(() => {});
    await page.fill('xpath=//input[@id="1-password"]', password).catch(() => {});
    // also try generic selectors
    await page.fill('input[type="email"], input[name="email"], input[placeholder*="email"]', email).catch(() => {});
    await page.fill('input[type="password"], input[name="password"], input[placeholder*="password"]', password).catch(() => {});

    // 4) Click Login button
    console.log('Clicking Login submit...');
    const submitSelectors = [
      'xpath=//span[@class="auth0-label-submit"]',
      'button:has-text("Login")',
      'button:has-text("Sign in")',
      'button[type="submit"]'
    ];
    let submitted = false;
    for (const s of submitSelectors) {
      try {
        const loc = page.locator(s).first();
        if (await loc.count()) {
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {}),
            loc.click().catch(() => {}),
          ]);
          console.log('Login submitted via', s);
          submitted = true;
          break;
        }
      } catch (e) {
        // try next
      }
    }
    if (!submitted) console.warn('Login submit not found — continuing and hoping form submitted');

    // 5) After logging in, click Inactive toggle
    console.log('Waiting 2s then clicking Inactive toggle...');
    await page.waitForTimeout(2000);
    const inactiveSelectors = ['button:has-text("Inactive")', 'text=Inactive', 'button:has-text("Inactive") >> nth=0'];
    let clickedInactive = false;
    for (const s of inactiveSelectors) {
      try {
        const loc = page.locator(s).first();
        if (await loc.count()) {
          await loc.waitFor({ state: 'visible', timeout: 5000 });
          await loc.click();
          clickedInactive = true;
          console.log('Clicked Inactive via', s);
          break;
        }
      } catch (e) {
        // try next
      }
    }
    if (!clickedInactive) { await page.screenshot({ path: 'inactive_not_found.png', fullPage: true }).catch(()=>{}); fs.writeFileSync('inactive_not_found.html', await page.content()); throw new Error('Inactive toggle not found'); }

    // 6) Scroll down to last hospital and click 3 dots
    console.log('Waiting 2s then locating last hospital row...');
    await page.waitForTimeout(2000);
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    const lastRow = page.locator('table tbody tr').last();
    await lastRow.scrollIntoViewIfNeeded();
    const moreBtn = lastRow.locator('button[aria-haspopup="menu"], button:has(svg.lucide-ellipsis-vertical), button:has-text("Open menu")').first();
    await page.waitForTimeout(2000);
    try {
      await moreBtn.click({ timeout: 5000 });
    } catch (e) {
      await page.waitForTimeout(1000);
      await moreBtn.click({ timeout: 5000 }).catch(() => {});
    }
    console.log('Clicked 3-dots on last hospital');

    // 7) Select Activate option
    console.log('Waiting 2s then selecting Activate option...');
    await page.waitForTimeout(2000);
    let clickedActivate = false;
    const activateSelectors = ['text=Activate', 'button:has-text("Activate")', 'role=menuitem[name="Activate"]'];
    for (const s of activateSelectors) {
      const el = page.locator(s).first();
      if (await el.count()) {
        await el.click().catch(() => {});
        console.log('Clicked Activate via', s);
        clickedActivate = true;
        break;
      }
    }
    if (!clickedActivate) {
      const handle = await page.evaluateHandle(() => {
        const els = Array.from(document.querySelectorAll('[role="menuitem"], button, a'))
          .filter(e => e.innerText && e.innerText.trim().toLowerCase().includes('activate'));
        return els.length ? els[0] : null;
      });
      if (handle && handle.asElement()) { await page.evaluate(el => el.click(), handle); console.log('Clicked Activate via DOM fallback'); clickedActivate = true; }
    }
    if (!clickedActivate) {
      await page.screenshot({ path: 'activate_option_not_found.png', fullPage: true }).catch(() => {});
      fs.writeFileSync('activate_option_not_found.html', await page.content());
      throw new Error('Activate option not found');
    }

    // 8) Click Activate on confirmation popup
    console.log('Waiting 2s then confirming Activate...');
    await page.waitForTimeout(2000);
    const confirmBtn = page.locator('div[role="dialog"] button:has-text("Activate"), button:has-text("Activate")').first();
    if (await confirmBtn.count()) {
      await confirmBtn.click();
      console.log('Clicked Activate confirmation');
    } else {
      await page.screenshot({ path: 'activate_confirm_not_found.png', fullPage: true }).catch(() => {});
      fs.writeFileSync('activate_confirm_not_found.html', await page.content());
      throw new Error('Activate confirmation button not found');
    }

    console.log('Activate flow completed successfully');
    await page.waitForTimeout(2000);
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Script failed:', err.message || err);
    try { await page.screenshot({ path: 'activate_flow_error.png', fullPage: true }); } catch {}
    try { fs.writeFileSync('activate_flow_error.html', await page.content()); } catch {}
    await browser.close();
    process.exit(1);
  }
})();
