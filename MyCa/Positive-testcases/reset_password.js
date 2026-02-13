const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  try {
    await page.goto('http://34.234.86.155:3000/login');
    await page.waitForLoadState('networkidle');

    // Click Login as Super Admin
    await page.waitForSelector('text=Login as Super Admin', { state: 'visible' });
    await page.click('text=Login as Super Admin');

  // Click the 'Don't remember password' link by xpath and wait until clickable
  const forgotSelector = 'xpath=//a[@class="auth0-lock-alternative-link"]';
  const forgotLink = page.locator(forgotSelector);
  await forgotLink.waitFor({ state: 'visible', timeout: 10000 });
  await forgotLink.click({ timeout: 10000 });
  console.log('Clicked Forgot password link');

  // Enter email and click Send email
  await page.waitForSelector('xpath=//input[@id="1-email"]', { state: 'visible' });
  await page.fill('xpath=//input[@id="1-email"]', 'shrinath.himane@mindbowser.com');
  // Wait 5 seconds after entering the email to allow any UI updates
  await page.waitForTimeout(5000);
  await page.waitForSelector('text=Send email', { state: 'visible' });
  await page.click('text=Send email');

    console.log('Clicked Send email');
    await browser.close();
  } catch (err) {
    console.error('Script failed:', err);
  }
})();
