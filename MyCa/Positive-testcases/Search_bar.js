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

    // Wait for 3 seconds after login before proceeding
    console.log('Waiting 3 seconds after login...');
    await page.waitForTimeout(3000);
    console.log('Wait completed');

    // Helper function to perform search and clear with waits
    async function searchAndClear(page, searchText) {
      const searchSelectors = [
        'input[placeholder*="Search"]',
        'input[placeholder*="Search hospitals"]',
        'input[type="search"]'
      ];

      // Wait for search input with retry
      console.log('Waiting for search input...');
      let searchInput = null;
      for (let i = 0; i < 3; i++) {
        for (const sel of searchSelectors) {
          searchInput = await waitForVisible(page, sel, 10000);
          if (searchInput) break;
        }
        if (searchInput) break;
        await page.waitForTimeout(2000);
      }
      if (!searchInput) throw new Error('Search input not visible');

      // Click and verify focus
      await searchInput.click();
      await searchInput.focus();
      console.log('Clicked search input');

      // Fill and verify
      await searchInput.fill(searchText);
      await page.waitForTimeout(500); // Small wait for input to settle
      const actualValue = await searchInput.inputValue();
      if (actualValue !== searchText) {
        throw new Error('Search text not entered correctly');
      }
      console.log(`Entered text: "${searchText}"`);

      // Wait 3 seconds
      await page.waitForTimeout(3000);
      console.log('Waited 3 seconds');

      // Try to find and click clear button with multiple strategies
      const clearSelectors = [
        'button[aria-label="Clear"]',
        'button[title*="Clear"]',
        'button:has-text("Clear")',
        'button[aria-label="close"]',
        'button:has(svg[role="img"])',
        'input[placeholder] + button'
      ];

      let cleared = false;
      
      // Try sibling button first
      const siblingButton = await waitForVisible(page, 'input[placeholder] + button', 5000);
      if (siblingButton) {
        await siblingButton.click();
        cleared = true;
      }

      // Try other clear buttons
      if (!cleared) {
        for (const sel of clearSelectors) {
          const clearButton = await waitForVisible(page, sel, 3000);
          if (clearButton) {
            await clearButton.click();
            cleared = true;
            break;
          }
        }
      }

      // Fallback to Escape
      if (!cleared) {
        await searchInput.press('Escape');
        cleared = true;
      }

      // Verify input was cleared
      await page.waitForTimeout(500); // Small wait for clear to take effect
      const finalValue = await searchInput.inputValue();
      if (finalValue) {
        throw new Error('Search input not cleared');
      }

      return true;
    }

    // 1. Search and clear on Active tab
    console.log('\nPerforming search on Active tab...');
    await searchAndClear(page, 'This is automated text');
    console.log('Completed Active tab search and clear');

    // 2. Click Inactive tab with explicit wait and retry
    console.log('\nSwitching to Inactive tab...');
    const inactiveSelectors = [
      'button[data-state="inactive"]',
      'button[aria-controls*="DEACTIVE"]',
      'button:has-text("Inactive")'
    ];

    let inactiveTabClicked = false;
    for (let i = 0; i < 3; i++) {
      inactiveTabClicked = await tryClick(page, inactiveSelectors, { timeout: 10000 });
      if (inactiveTabClicked) break;
      await page.waitForTimeout(2000);
    }
    if (!inactiveTabClicked) throw new Error('Could not click Inactive tab');
    console.log('Clicked Inactive tab');

    // Wait for inactive tab content
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');

    // 3. Search and clear on Inactive tab
    console.log('\nPerforming search on Inactive tab...');
    await searchAndClear(page, 'This is automated text');
    console.log('Completed Inactive tab search and clear');

    // Save final state
    console.log('\nSaving final state...');
    await page.screenshot({ path: 'search_bar_both_tabs.png', fullPage: true });
    const fs = require('fs');
    fs.writeFileSync('search_bar_both_tabs.html', await page.content());

    console.log('Script completed successfully');
    await browser.close();
  } catch (err) {
    console.error('Script failed:', err.message || err);
    try {
      await page.screenshot({ path: 'search_bar_error.png', fullPage: true });
      const fs = require('fs');
      fs.writeFileSync('search_bar_error.html', await page.content());
    } catch {}
    try { await browser.close(); } catch {}
    process.exit(1);
  }
})();
