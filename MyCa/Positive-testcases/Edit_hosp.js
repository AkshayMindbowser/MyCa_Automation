const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  async function waitForVisible(page, selector, timeout = 30000) {
    try {
      const element = page.locator(selector);
      await element.waitFor({ state: 'visible', timeout });
      return element;
    } catch (e) {
      return null;
    }
  }

  async function tryClick(page, selectors, options = { timeout: 30000 }) {
    for (const sel of selectors) {
      try {
        const element = await waitForVisible(page, sel, options.timeout);
        if (element) {
          await element.click();
          return true;
        }
      } catch (e) {
        // ignore and try next selector
      }
    }
    return false;
  }

  async function waitAndFill(page, selector, value, timeout = 30000) {
    const element = await waitForVisible(page, selector, timeout);
    if (element) {
      await element.fill(value);
      return true;
    }
    return false;
  }

  try {
    // 1) Login with explicit waits
    await page.goto('http://34.234.86.155:3000/login');
    await page.waitForLoadState('networkidle');
    
    // Wait for initial page load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    
    console.log('Waiting for Login as Super Admin button...');
    const loginButton = await waitForVisible(page, 'text=Login as Super Admin', 30000);
    if (!loginButton) throw new Error('Login as Super Admin button not visible');
    await loginButton.click();
    console.log('Clicked Login as Super Admin');

    // wait for Auth0 form with retry and additional checks
    console.log('Waiting for Auth0 form...');
    let authFormVisible = false;
    for (let i = 0; i < 5; i++) {
      await page.waitForLoadState('networkidle');
      const emailInput = await waitForVisible(page, 'input[id="1-email"]', 10000);
      if (emailInput) {
        authFormVisible = true;
        break;
      }
      await page.waitForTimeout(2000);
    }
    if (!authFormVisible) throw new Error('Auth0 form not visible after retries');

    // Fill credentials with visibility checks
    const email = process.env.SUPERADMIN_EMAIL || 'shrinath.himane@mindbowser.com';
    const password = process.env.SUPERADMIN_PASSWORD || 'Test@1234';

    const emailFilled = await waitAndFill(page, 'input[id="1-email"]', email);
    if (!emailFilled) throw new Error('Could not fill email');
    console.log('Filled email');

    const passFilled = await waitAndFill(page, 'input[id="1-password"]', password);
    if (!passFilled) throw new Error('Could not fill password');
    console.log('Filled password');

    // Click submit and wait for navigation
    await tryClick(page, ['button[id="1-submit"]', 'button:has-text("Log In")']);
    console.log('Clicked login submit');

    // Wait for hospital management page with enhanced retry mechanism
    console.log('Waiting for Hospital Management page...');
    let pageLoaded = false;
    for (let i = 0; i < 5; i++) {
      await page.waitForLoadState('networkidle');
      const pageHeader = await waitForVisible(page, 'text=Hospital Management', 10000);
      if (pageHeader) {
        pageLoaded = true;
        break;
      }
      // Also check for alternative indicators
      const altIndicators = [
        'text=Active',
        'text=Inactive',
        'input[placeholder*="Search"]'
      ];
      for (const indicator of altIndicators) {
        if (await waitForVisible(page, indicator, 5000)) {
          pageLoaded = true;
          break;
        }
      }
      if (pageLoaded) break;
      await page.waitForTimeout(2000);
    }
    if (!pageLoaded) throw new Error('Hospital Management page not loaded');
    console.log('Hospital Management page loaded');

    // Wait for 3 seconds after login
    console.log('Waiting 3 seconds after login...');
    await page.waitForTimeout(3000);
    console.log('Wait completed');

    // 1. Select the last hospital in Active tab and click three dots
    console.log('\nFinding the last hospital in Active tab...');
    await page.waitForSelector('table tbody tr');
    const rows = await page.locator('table tbody tr').all();
    if (rows.length === 0) throw new Error('No hospitals found in the table');
    
    const lastRow = rows[rows.length - 1];
    const threeDotsButton = await lastRow.locator('button:has(svg)').first();
    await threeDotsButton.click();
    console.log('Clicked three dots on last row');

    // Click Edit option
    await page.waitForTimeout(1000);
    const editOption = await page.locator('text=Edit').first();
    await editOption.click();
    console.log('Clicked Edit option');

    // Wait for form load and scroll to bottom
    await page.waitForTimeout(2000);
    await page.keyboard.press('End');
    console.log('Scrolled to bottom');
    
    // Click Cancel button
    await page.waitForTimeout(1000);
    const cancelButton = await page.locator('button:has-text("Cancel")').first();
    await cancelButton.click();
    console.log('Clicked Cancel button');

    // Click on Hospital Management link to return to homepage
    await page.waitForTimeout(2000);
    const hospitalManagementLink = await page.locator('a[href="/hospitals"]').first();
    await hospitalManagementLink.click();
    console.log('Clicked Hospital Management link to return to homepage');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');

    // 2. Switch to Inactive tab
    console.log('\nSwitching to Inactive tab...');
    
    // Try different selectors for the Inactive tab
    const inactiveTabSelectors = [
        'button:has-text("Inactive")',
        'button[role="tab"]:has-text("Inactive")',
        '[data-state="inactive"]'
    ];

    let inactiveTabClicked = false;
    for (const selector of inactiveTabSelectors) {
        try {
            const inactiveTab = await waitForVisible(page, selector, 10000);
            if (inactiveTab) {
                await inactiveTab.click();
                inactiveTabClicked = true;
                break;
            }
        } catch (e) {
            continue;
        }
    }

    if (!inactiveTabClicked) {
        throw new Error('Could not find or click Inactive tab');
    }

    // Wait for table to reload
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle');
    console.log('Switched to Inactive tab');

    // Wait for table to load in Inactive tab with retry
    let inactiveRows = [];
    for (let i = 0; i < 5; i++) {
        await page.waitForTimeout(1000);
        inactiveRows = await page.locator('table tbody tr').all();
        if (inactiveRows.length > 0) break;
    }
    if (inactiveRows.length === 0) throw new Error('No hospitals found in Inactive tab');

    // Click three dots on last inactive hospital
    const lastInactiveRow = inactiveRows[inactiveRows.length - 1];
    const inactiveThreeDotsButton = await lastInactiveRow.locator('button:has(svg)').first();
    await inactiveThreeDotsButton.click();
    console.log('Clicked three dots on last inactive row');

    // Click Edit option in Inactive tab
    await page.waitForTimeout(1000);
    const inactiveEditOption = await page.locator('text=Edit').first();
    await inactiveEditOption.click();
    console.log('Clicked Edit option in Inactive tab');

    // Wait for form load and scroll to bottom
    await page.waitForTimeout(2000);
    await page.keyboard.press('End');
    console.log('Scrolled to bottom');
    
    // Click Cancel button in Inactive tab
    await page.waitForTimeout(1000);
    const inactiveCancelButton = await page.locator('button:has-text("Cancel")').first();
    await inactiveCancelButton.click();
    console.log('Clicked Cancel button in Inactive tab');

    // Save final state
    console.log('\nSaving final state...');
    await page.screenshot({ path: 'edit_hospital_flow.png', fullPage: true });
    const fs = require('fs');
    fs.writeFileSync('edit_hospital_flow.html', await page.content());

    console.log('Script completed successfully');
    await browser.close();
  } catch (err) {
    console.error('Script failed:', err.message || err);
    try {
      await page.screenshot({ path: 'edit_hospital_error.png', fullPage: true });
      const fs = require('fs');
      fs.writeFileSync('edit_hospital_error.html', await page.content());
    } catch {}
    try { await browser.close(); } catch {}
    process.exit(1);
  }
})();
