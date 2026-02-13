/**
 * Test 521: Verify newly created hospital appears in Active hospital list
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

    // Open Add New Hospital form
    const addBtn = page.locator('button:has-text("Add New Hospital"), button:has-text("+ Add New"), a:has-text("Add New Hospital")').first();
    if (await addBtn.count() === 0) {
      console.log('❌ FAIL: Add New Hospital button not found.');
      await page.screenshot({ path: '521_no_add.png', fullPage: true }).catch(()=>{});
      await browser.close();
      process.exit(1);
    }
    await addBtn.click({ force: true });

    // Fill form with unique data
    const unique = Date.now();
    const hospName = `AutoHosp_${unique}`;
    const hospEmail = `autohosp_${unique}@example.com`;

    // Try common field selectors
    try { await page.fill('input[name="name"]', hospName); } catch (e) { }
    try { await page.fill('input[name="email"]', hospEmail); } catch (e) { }
    try { await page.fill('input[name="phone"]', '1234567890'); } catch (e) { }

    // Submit
    const saveBtn = page.locator('button:has-text("Save"), button:has-text("Create"), button[type="submit"]').first();
    if (await saveBtn.count() === 0) {
      console.log('❌ FAIL: Save/Create button not found in form.');
      await page.screenshot({ path: '521_no_save.png', fullPage: true }).catch(()=>{});
      await browser.close();
      process.exit(1);
    }
    await saveBtn.click({ force: true });

    // Wait for navigation/refresh and then search Active list for the created hospital name
    await page.waitForTimeout(1500);

    // Ensure Active filter is selected (try clicking Active if available)
    try { await page.locator('button:has-text("Active")').first().click({ force: true }).catch(()=>{}); } catch (e) {}
    await page.waitForTimeout(800);

    // Look for the created hospital in table rows
    const rowText = `text=${hospName}`;
    let found = false;
    try {
      await page.waitForSelector(rowText, { timeout: 7000 });
      found = true;
    } catch (e) {
      found = false;
    }

    const screenshot = '521_case521.result.png';
    await page.screenshot({ path: screenshot, fullPage: true }).catch(()=>{});

    if (found) {
      console.log('✅ PASS: Newly created hospital is displayed in Active list:', hospName);
      console.log('Screenshot saved:', screenshot);
      await browser.close();
      process.exit(0);
    } else {
      console.log('❌ FAIL: Newly created hospital not found in Active list.');
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
