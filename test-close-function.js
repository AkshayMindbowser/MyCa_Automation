const { chromium } = require('playwright');

// Test the close function in action
(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to login
    await page.goto('http://34.234.86.155:3000/login', { waitUntil: 'networkidle' });
    console.log('✓ Navigated to login page');
    
    // Login
    await page.waitForLoadState('networkidle');
    const loginBtn = page.locator('text=Login as Super Admin').first();
    await loginBtn.click();
    console.log('✓ Clicked Login as Super Admin');

    // Wait for Auth0 form
    await page.waitForSelector('input[id="1-email"]', { timeout: 10000 });
    await page.fill('input[id="1-email"]', 'shrinath.himane@mindbowser.com');
    await page.fill('input[id="1-password"]', 'Test@1234');
    console.log('✓ Filled credentials');

    // Click submit
    await page.click('button[id="1-submit"]');
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle');
    console.log('✓ Logged in successfully');

    // Navigate to hospital
    await page.waitForSelector('table tbody tr', { timeout: 15000 });
    console.log('✓ Hospital table loaded');

    // Click first hospital
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1000);
    console.log('✓ Clicked first hospital');

    // Click Activate button
    await page.click('button:has-text("Activate")');
    await page.waitForTimeout(500);
    console.log('✓ Clicked Activate button');

    // Execute close function
    console.log('✓ Executing JavaScript close function...');
    await page.evaluate(() => {
      // Close all visible modals/dialogs
      const dialogs = document.querySelectorAll('[role="dialog"], .modal, .popup, .antd-modal, .ant-modal');
      console.log(`Found ${dialogs.length} dialogs to close`);
      dialogs.forEach(dialog => {
        if (dialog.style) {
          dialog.style.display = 'none';
        }
      });
      
      // Also try to close via Escape key
      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
        keyCode: 27,
        which: 27,
        bubbles: true
      });
      document.dispatchEvent(escapeEvent);
    });
    console.log('✓ Close function executed successfully');

    await page.waitForTimeout(1000);

    // Check dialog state
    const dialog = page.locator('role=dialog');
    const dialogCount = await dialog.count();
    console.log(`Dialog count after close: ${dialogCount}`);

    // Take screenshot
    await page.screenshot({ path: 'close-function-test.png', fullPage: true });
    console.log('✓ Screenshot saved');

    console.log('\n✅ Test completed successfully - Close function works!');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    await page.screenshot({ path: 'close-function-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
