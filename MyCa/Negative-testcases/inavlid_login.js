const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  try {
    await page.goto('http://34.234.86.155:3000/login');
    await page.waitForLoadState('networkidle');

    await page.waitForSelector('text=Login as Super Admin', { state: 'visible' });
    await page.click('text=Login as Super Admin');

    await page.waitForSelector('xpath=//input[@id="1-email"]', { state: 'visible' });
    await page.fill('xpath=//input[@id="1-email"]', 'shrinath.himane@mindbowser.com');

    await page.waitForSelector('xpath=//input[@id="1-password"]', { state: 'visible' });
    await page.fill('xpath=//input[@id="1-password"]', 'Test@12345'); // incorrect password

    await page.click('xpath=//span[@class="auth0-label-submit"]');

    // Wait for an error message and verify text; if not found dump HTML and a screenshot
    const errorSelector = 'text=ID or Password is incorrect';
    try {
      await page.waitForSelector(errorSelector, { state: 'visible', timeout: 7000 });
      console.log('Error message displayed: ID or Password is incorrect');
    } catch (e) {
      console.error('Expected error message not displayed within timeout; saving debug artifacts...');
      try {
        const ss = 'invalid_login_debug.png';
        await page.screenshot({ path: ss, fullPage: true });
        const html = await page.content();
        const fs = require('fs');
        fs.writeFileSync('invalid_login_debug.html', html);
        console.error('Saved debug files:', ss, 'invalid_login_debug.html');
      } catch (dumpErr) {
        console.error('Failed to save debug artifacts:', dumpErr);
      }
    }

    await browser.close();
  } catch (err) {
    console.error('Script failed:', err);
  }
})();
